import { program } from "commander"
import {
	DIMENSIONS,
	type Dimension,
	type DimensionInfo,
	getComparisonKey,
	getExistingComparisons,
	VALID_DIMENSIONS,
} from "../lib/comparisons"
import {
	type AdjacencyList,
	buildAdjacencyList,
	findArticulationPoints,
	findConnectedComponents,
	getHubToy,
} from "../lib/connectivity"
import { getToys, isVersioned } from "../lib/toys"

interface DimensionOverview {
	key: Dimension
	medianComparisons: number
	totalComparisons: number
}

interface PreparedBatch {
	// The auto-selected dimension with FULL context for the subagent
	selectedDimension: DimensionInfo & {
		medianComparisons: number
	}
	// Quick overview of all dimensions (for visibility)
	allDimensionsOverview: DimensionOverview[]
	// The pairs to compare (toyA, toyB slugs)
	pairs: { toyA: string; toyB: string }[]
	// Only toys needed for these pairs (full content)
	toys: { slug: string; name: string; content: string }[]
	// Stats
	stats: {
		pairsInBatch: number
		uniqueToysInBatch: number
		totalToys: number
		allComplete: boolean
	}
	// Connectivity context - before and after pair selection
	connectivity: {
		// Initial state (before any pairs selected)
		initial: {
			componentCount: number
			articulationPointCount: number
			zeroConnectionToys: number
		}
		// Final state (after all pairs selected)
		final: {
			componentCount: number
			articulationPointCount: number
		}
		// Pairs selected per phase
		phaseCounts: {
			bridgePairs: number // Phase 1: connecting isolated components
			strengthenPairs: number // Phase 2: reducing articulation points
			coveragePairs: number // Phase 3: standard coverage
		}
	}
}

program
	.name("prepare-dimension")
	.description(
		"Auto-select the dimension with lowest median coverage and generate pairs to compare",
	)
	.option("-l, --limit <n>", "Max pairs to return (default: 40)", "40")
	.option(
		"-s, --sort-every <n>",
		"Re-sort toys after every N pairs (default: 5). Lower = better coverage spread, higher = fewer unique toys",
		"5",
	)
	.option(
		"-d, --dimension <dim>",
		`Specific dimension to use (default: auto-select lowest median). Valid: ${VALID_DIMENSIONS.join(", ")}`,
	)
	.parse()

const pairLimit = Number.parseInt(program.opts().limit, 10)
const sortInterval = Number.parseInt(program.opts().sortEvery, 10)
const requestedDimension = program.opts().dimension as Dimension | undefined

if (requestedDimension && !VALID_DIMENSIONS.includes(requestedDimension)) {
	console.error(
		`Invalid dimension: ${requestedDimension}. Valid: ${VALID_DIMENSIONS.join(", ")}`,
	)
	process.exit(1)
}

// Calculate median of an array
function median(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function addEdge(graph: AdjacencyList, toyA: string, toyB: string): void {
	const neighborsA = graph.get(toyA)
	if (neighborsA) {
		neighborsA.add(toyB)
	} else {
		graph.set(toyA, new Set([toyB]))
	}

	const neighborsB = graph.get(toyB)
	if (neighborsB) {
		neighborsB.add(toyA)
	} else {
		graph.set(toyB, new Set([toyA]))
	}
}

function buildComponentSubgraph(
	graph: AdjacencyList,
	component: string[],
): AdjacencyList {
	const componentSet = new Set(component)
	const subgraph: AdjacencyList = new Map()

	for (const node of component) {
		const neighbors = graph.get(node)
		if (!neighbors) {
			subgraph.set(node, new Set())
			continue
		}
		subgraph.set(node, new Set([...neighbors].filter((n) => componentSet.has(n))))
	}

	return subgraph
}

function incrementCount(counts: Map<string, number>, slug: string): void {
	counts.set(slug, (counts.get(slug) ?? 0) + 1)
}

function pickBridgeToy(
	component: string[],
	hub: string,
	counts: Map<string, number>,
	existingKeys: Set<string>,
	dimension: Dimension,
): string | null {
	const sorted = [...component].sort((a, b) => {
		const countA = counts.get(a) ?? 0
		const countB = counts.get(b) ?? 0
		if (countA !== countB) return countA - countB
		return a.localeCompare(b)
	})

	for (const slug of sorted) {
		if (slug === hub) continue
		const key = getComparisonKey(dimension, slug, hub)
		if (!existingKeys.has(key)) {
			return slug
		}
	}

	return null
}

async function main() {
	// Load all versioned toys
	const allToys = await getToys()
	const toys = allToys.filter(isVersioned)
	const totalPossiblePairsPerDimension = (toys.length * (toys.length - 1)) / 2

	// Load all existing comparisons
	const allComparisons = getExistingComparisons()

	// Step 1: Calculate comparison counts and median for each dimension
	const dimensionStats = VALID_DIMENSIONS.map((dim) => {
		const dimComparisons = allComparisons.filter((c) => c.dimension === dim)

		// Build set of existing pair keys for this dimension
		const existingKeys = new Set(
			dimComparisons.map((c) => getComparisonKey(dim, c.toyA, c.toyB)),
		)

		// Count comparisons per toy
		const counts = new Map<string, number>()
		for (const toy of toys) {
			counts.set(toy.slug, 0)
		}
		for (const comp of dimComparisons) {
			counts.set(comp.toyA, (counts.get(comp.toyA) || 0) + 1)
			counts.set(comp.toyB, (counts.get(comp.toyB) || 0) + 1)
		}

		const countsArray = Array.from(counts.values())
		const medianVal = median(countsArray)

		return {
			counts,
			dimension: dim,
			existingKeys,
			isComplete: existingKeys.size >= totalPossiblePairsPerDimension,
			median: medianVal,
			totalComparisons: dimComparisons.length,
		}
	})

	// Step 2: Sort by median (ascending), then alphabetically for ties
	dimensionStats.sort((a, b) => {
		if (a.median !== b.median) return a.median - b.median
		return a.dimension.localeCompare(b.dimension)
	})

	// Check if all dimensions are complete
	const allComplete = dimensionStats.every((d) => d.isComplete)

	// If a specific dimension was requested, use that; otherwise auto-select
	let selectedStat: (typeof dimensionStats)[number] | undefined
	if (requestedDimension) {
		selectedStat = dimensionStats.find((d) => d.dimension === requestedDimension)
	} else {
		selectedStat = allComplete
			? dimensionStats[0]
			: dimensionStats.find((d) => !d.isComplete)
	}

	if (!selectedStat) {
		throw new Error("No dimension available for selection.")
	}

	// When a specific dimension is requested, check if that dimension is complete
	const shouldReturnEmpty = requestedDimension ? selectedStat.isComplete : allComplete

	const selectedDimensionInfo = DIMENSIONS.find((d) => d.key === selectedStat.dimension)
	if (!selectedDimensionInfo) {
		throw new Error(`Missing dimension metadata for ${selectedStat.dimension}.`)
	}

	const baselineCounts = new Map(selectedStat.counts)
	const graph = buildAdjacencyList(allComparisons, selectedStat.dimension)
	for (const toy of toys) {
		if (!graph.has(toy.slug)) {
			graph.set(toy.slug, new Set())
		}
	}

	const initialComponents = findConnectedComponents(graph)
	const initialComponentCount = initialComponents.length
	const initialZeroConnectionToys = Array.from(baselineCounts.values()).filter(
		(count) => count === 0,
	).length
	const initialMainComponent = initialComponents[0] ?? []
	const initialMainGraph = buildComponentSubgraph(graph, initialMainComponent)
	const initialArticulationPointCount = findArticulationPoints(initialMainGraph).length

	if (shouldReturnEmpty) {
		// Dimension complete - return empty batch
		const output: PreparedBatch = {
			allDimensionsOverview: dimensionStats.map((d) => ({
				key: d.dimension,
				medianComparisons: d.median,
				totalComparisons: d.totalComparisons,
			})),
			connectivity: {
				final: {
					articulationPointCount: initialArticulationPointCount,
					componentCount: initialComponentCount,
				},
				initial: {
					articulationPointCount: initialArticulationPointCount,
					componentCount: initialComponentCount,
					zeroConnectionToys: initialZeroConnectionToys,
				},
				phaseCounts: {
					bridgePairs: 0,
					coveragePairs: 0,
					strengthenPairs: 0,
				},
			},
			pairs: [],
			selectedDimension: {
				...selectedDimensionInfo,
				medianComparisons: selectedStat.median,
			},
			stats: {
				allComplete: true,
				pairsInBatch: 0,
				totalToys: toys.length,
				uniqueToysInBatch: 0,
			},
			toys: [],
		}
		console.log(JSON.stringify(output, null, 2))
		return
	}

	// Step 3: Select the dimension with lowest median (that isn't complete)
	const selected = selectedStat

	// Step 4: Greedy pair selection with periodic re-sorting
	const counts = new Map(selected.counts) // Copy for mutation
	const existingKeys = new Set(selected.existingKeys) // Copy for mutation
	const selectedPairs: { toyA: string; toyB: string }[] = []
	const bridgePairs: { toyA: string; toyB: string }[] = []
	const strengthenPairs: { toyA: string; toyB: string }[] = []
	const coveragePairs: { toyA: string; toyB: string }[] = []

	// Phase 1: Bridge isolated components to main component
	const components = initialComponents
	if (components.length > 1) {
		const mainComponent = components[0]
		if (mainComponent.length === 0) {
			throw new Error(
				`Invariant violated: main component is empty but ${components.length} components exist`,
			)
		}
		const mainComponentSet = new Set(mainComponent)
		const mainGraph = buildComponentSubgraph(graph, mainComponent)
		const hub = getHubToy(mainGraph)

		// Invariant: hub must be in main component
		if (!mainComponentSet.has(hub)) {
			throw new Error(
				`Invariant violated: hub "${hub}" is not in main component (${mainComponent.length} toys)`,
			)
		}

		const isolatedComponents = components.slice(1).sort((a, b) => a.length - b.length)

		for (const component of isolatedComponents) {
			if (selectedPairs.length >= pairLimit) break
			const candidate = pickBridgeToy(
				component,
				hub,
				counts,
				existingKeys,
				selected.dimension,
			)
			if (!candidate) {
				// All toys in this component already have comparisons with the hub,
				// or the component is a singleton with just the hub (shouldn't happen
				// since hub is in main component). Log for debugging.
				console.error(
					`Warning: No bridge candidate for component with ${component.length} toys. ` +
						`All may already be compared with hub "${hub}".`,
				)
				continue
			}

			const key = getComparisonKey(selected.dimension, candidate, hub)
			if (existingKeys.has(key)) continue

			const pair = { toyA: candidate, toyB: hub }
			selectedPairs.push(pair)
			bridgePairs.push(pair)
			existingKeys.add(key)
			incrementCount(counts, candidate)
			incrementCount(counts, hub)
			addEdge(graph, candidate, hub)
		}
	}

	// Phase 1.5: Continue bridging if still fragmented and budget remains
	// This handles cases where Phase 1 hit the pair limit before connecting all components
	if (selectedPairs.length < pairLimit) {
		let updatedComponents = findConnectedComponents(graph)

		while (updatedComponents.length > 1 && selectedPairs.length < pairLimit) {
			const mainComponent = updatedComponents[0]
			const mainComponentSet = new Set(mainComponent)
			const mainGraph = buildComponentSubgraph(graph, mainComponent)
			const hub = getHubToy(mainGraph)

			if (!mainComponentSet.has(hub)) {
				throw new Error(
					`Invariant violated in Phase 1.5: hub "${hub}" is not in main component`,
				)
			}

			const isolatedComponents = updatedComponents
				.slice(1)
				.sort((a, b) => a.length - b.length)

			let bridgedAny = false
			for (const component of isolatedComponents) {
				if (selectedPairs.length >= pairLimit) break

				const candidate = pickBridgeToy(
					component,
					hub,
					counts,
					existingKeys,
					selected.dimension,
				)
				if (!candidate) {
					console.error(
						`Warning (Phase 1.5): No bridge candidate for component with ${component.length} toys.`,
					)
					continue
				}

				const key = getComparisonKey(selected.dimension, candidate, hub)
				if (existingKeys.has(key)) continue

				const pair = { toyA: candidate, toyB: hub }
				selectedPairs.push(pair)
				bridgePairs.push(pair)
				existingKeys.add(key)
				incrementCount(counts, candidate)
				incrementCount(counts, hub)
				addEdge(graph, candidate, hub)
				bridgedAny = true
			}

			if (!bridgedAny) {
				// No progress made - all remaining components may already be bridged
				// or have no valid candidates. Stop trying.
				console.error(
					`Warning: ${updatedComponents.length - 1} components remain but no bridging progress possible.`,
				)
				break
			}

			// Re-check components after bridging
			updatedComponents = findConnectedComponents(graph)
		}
	}

	// Phase 2: Reduce articulation points (only when graph is unified)
	if (selectedPairs.length < pairLimit) {
		const updatedComponents = findConnectedComponents(graph)

		// Only strengthen if we have a single connected component
		if (updatedComponents.length > 1) {
			console.error(
				`Warning: Skipping Phase 2 (articulation point reduction) because ` +
					`graph still has ${updatedComponents.length} components. ` +
					`Strengthening a fragmented graph would be misleading.`,
			)
		} else {
			const updatedMainComponent = updatedComponents[0] ?? []
			const updatedMainGraph = buildComponentSubgraph(graph, updatedMainComponent)

			const articulationPoints = findArticulationPoints(updatedMainGraph)
			const articulationByDegree = articulationPoints
				.map((node) => ({
					degree: updatedMainGraph.get(node)?.size ?? 0,
					node,
				}))
				.sort((a, b) => a.degree - b.degree)

			for (const { node } of articulationByDegree) {
				if (selectedPairs.length >= pairLimit) break

				const neighbors = Array.from(updatedMainGraph.get(node) ?? [])
				if (neighbors.length < 2) continue

				let bestPair: { toyA: string; toyB: string } | null = null
				let bestScore = Number.POSITIVE_INFINITY

				for (let i = 0; i < neighbors.length; i++) {
					for (let j = i + 1; j < neighbors.length; j++) {
						const toyA = neighbors[i]
						const toyB = neighbors[j]
						if (updatedMainGraph.get(toyA)?.has(toyB)) continue

						const key = getComparisonKey(selected.dimension, toyA, toyB)
						if (existingKeys.has(key)) continue

						const score = (counts.get(toyA) ?? 0) + (counts.get(toyB) ?? 0)
						if (score < bestScore) {
							bestScore = score
							bestPair = { toyA, toyB }
						} else if (score === bestScore && bestPair) {
							const currentKey = `${bestPair.toyA}:${bestPair.toyB}`
							const candidateKey = `${toyA}:${toyB}`
							if (candidateKey < currentKey) {
								bestPair = { toyA, toyB }
							}
						}
					}
				}

				if (!bestPair) continue

				const key = getComparisonKey(
					selected.dimension,
					bestPair.toyA,
					bestPair.toyB,
				)
				if (existingKeys.has(key)) continue

				selectedPairs.push(bestPair)
				strengthenPairs.push(bestPair)
				existingKeys.add(key)
				incrementCount(counts, bestPair.toyA)
				incrementCount(counts, bestPair.toyB)
				addEdge(graph, bestPair.toyA, bestPair.toyB)
				addEdge(updatedMainGraph, bestPair.toyA, bestPair.toyB)
			}
		}
	}

	// Helper to sort toys by count (ascending), then alphabetically for ties
	const sortToys = () =>
		[...toys].sort((a, b) => {
			const countA = counts.get(a.slug) || 0
			const countB = counts.get(b.slug) || 0
			if (countA !== countB) return countA - countB
			return a.slug.localeCompare(b.slug)
		})

	let sortedToys = sortToys()
	let pairsSinceLastSort = 0

	while (selectedPairs.length < pairLimit) {
		// Re-sort periodically based on sortInterval
		if (pairsSinceLastSort >= sortInterval) {
			sortedToys = sortToys()
			pairsSinceLastSort = 0
		}

		let foundPair = false

		// Start with lowest-count toy, find the lowest-count partner it doesn't have a comparison with
		for (const toyA of sortedToys) {
			for (const toyB of sortedToys) {
				if (toyA.slug >= toyB.slug) continue // Avoid duplicates and self-comparison

				const key = getComparisonKey(selected.dimension, toyA.slug, toyB.slug)
				if (existingKeys.has(key)) continue

				// Found a valid pair!
				const pair = { toyA: toyA.slug, toyB: toyB.slug }
				selectedPairs.push(pair)
				coveragePairs.push(pair)
				existingKeys.add(key)
				// Update counts for next sort
				incrementCount(counts, toyA.slug)
				incrementCount(counts, toyB.slug)
				pairsSinceLastSort++
				foundPair = true
				break
			}
			if (foundPair) break
		}

		if (!foundPair) break // No more pairs possible for this dimension
	}

	// Step 5: Extract unique toy slugs from selected pairs
	const neededSlugs = new Set<string>()
	for (const pair of selectedPairs) {
		neededSlugs.add(pair.toyA)
		neededSlugs.add(pair.toyB)
	}

	const relevantToys = toys.filter((t) => neededSlugs.has(t.slug))

	// Compute final state metrics (after all pair selection)
	const finalComponents = findConnectedComponents(graph)
	const finalComponentCount = finalComponents.length
	const finalMainComponent = finalComponents[0] ?? []
	const finalMainGraph = buildComponentSubgraph(graph, finalMainComponent)
	const finalArticulationPointCount = findArticulationPoints(finalMainGraph).length

	// Build output
	const output: PreparedBatch = {
		allDimensionsOverview: dimensionStats.map((d) => ({
			key: d.dimension,
			medianComparisons: d.median,
			totalComparisons: d.totalComparisons,
		})),
		connectivity: {
			final: {
				articulationPointCount: finalArticulationPointCount,
				componentCount: finalComponentCount,
			},
			initial: {
				articulationPointCount: initialArticulationPointCount,
				componentCount: initialComponentCount,
				zeroConnectionToys: initialZeroConnectionToys,
			},
			phaseCounts: {
				bridgePairs: bridgePairs.length,
				coveragePairs: coveragePairs.length,
				strengthenPairs: strengthenPairs.length,
			},
		},
		pairs: selectedPairs,
		selectedDimension: {
			...selectedDimensionInfo,
			medianComparisons: selected.median,
		},
		stats: {
			allComplete: false,
			pairsInBatch: selectedPairs.length,
			totalToys: toys.length,
			uniqueToysInBatch: relevantToys.length,
		},
		toys: relevantToys.map((t) => ({
			content: t.content,
			name: t.name,
			slug: t.slug,
		})),
	}

	console.log(JSON.stringify(output, null, 2))
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
