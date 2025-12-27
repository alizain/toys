/**
 * Analyze the connectivity of pairwise comparison graphs.
 *
 * For each dimension, computes:
 * - Connected components (isolated clusters)
 * - Articulation points (bridge toys)
 * - Graph diameter (longest shortest path)
 * - Edge density
 *
 * Usage: npx tsx scripts/analyze-graph.ts
 */

import {
	type Comparison,
	type Dimension,
	getExistingComparisons,
	VALID_DIMENSIONS,
} from "../lib/comparisons"
import {
	type AdjacencyList,
	buildAdjacencyList,
	findArticulationPoints,
	findConnectedComponents,
} from "../lib/connectivity"
import { getToys, isVersioned } from "../lib/toys"

const DIMENSIONS: Dimension[] = VALID_DIMENSIONS

// Build adjacency list for each dimension
function buildGraphs(comparisons: Comparison[]): Map<Dimension, AdjacencyList> {
	const graphs = new Map<Dimension, AdjacencyList>()
	for (const dim of DIMENSIONS) {
		graphs.set(dim, buildAdjacencyList(comparisons, dim))
	}

	return graphs
}

// Compute graph diameter using BFS from each node
function computeDiameter(graph: Map<string, Set<string>>): {
	diameter: number
	path: string[]
} {
	const nodes = Array.from(graph.keys())
	if (nodes.length <= 1) return { diameter: 0, path: [] }

	let maxDistance = 0
	let furthestPair: [string, string] = [nodes[0], nodes[0]]

	// BFS from each node to find max distance
	for (const start of nodes) {
		const distances = new Map<string, number>()
		const parents = new Map<string, string | null>()
		const queue = [start]
		let index = 0
		distances.set(start, 0)
		parents.set(start, null)

		while (index < queue.length) {
			const current = queue[index]
			index += 1
			const currentDist = distances.get(current)
			if (currentDist === undefined) {
				throw new Error("Missing distance data while computing diameter.")
			}

			for (const neighbor of graph.get(current) ?? []) {
				if (!distances.has(neighbor)) {
					distances.set(neighbor, currentDist + 1)
					parents.set(neighbor, current)
					queue.push(neighbor)

					if (currentDist + 1 > maxDistance) {
						maxDistance = currentDist + 1
						furthestPair = [start, neighbor]
					}
				}
			}
		}
	}

	// Reconstruct path for the diameter
	const [start, end] = furthestPair
	const path: string[] = []

	// BFS to find path
	const parents = new Map<string, string | null>()
	const queue = [start]
	let index = 0
	parents.set(start, null)

	while (index < queue.length) {
		const current = queue[index]
		index += 1
		if (current === end) break

		for (const neighbor of graph.get(current) ?? []) {
			if (!parents.has(neighbor)) {
				parents.set(neighbor, current)
				queue.push(neighbor)
			}
		}
	}

	let current: string | null = end
	while (current !== null) {
		path.unshift(current)
		current = parents.get(current) ?? null
	}

	return { diameter: maxDistance, path }
}

// Compute average shortest path length (only within connected component)
function computeAveragePathLength(graph: Map<string, Set<string>>): number {
	const nodes = Array.from(graph.keys())
	if (nodes.length <= 1) return 0

	let totalDistance = 0
	let pathCount = 0

	for (const start of nodes) {
		const distances = new Map<string, number>()
		const queue = [start]
		let index = 0
		distances.set(start, 0)

		while (index < queue.length) {
			const current = queue[index]
			index += 1
			const currentDist = distances.get(current)
			if (currentDist === undefined) {
				throw new Error("Missing distance data while computing average path length.")
			}

			for (const neighbor of graph.get(current) ?? []) {
				if (!distances.has(neighbor)) {
					distances.set(neighbor, currentDist + 1)
					queue.push(neighbor)
				}
			}
		}

		for (const [node, dist] of distances) {
			if (node !== start) {
				totalDistance += dist
				pathCount++
			}
		}
	}

	return pathCount > 0 ? totalDistance / pathCount : 0
}

// Compute clustering coefficient
function computeClusteringCoefficient(graph: Map<string, Set<string>>): number {
	let totalCoeff = 0
	let nodeCount = 0

	for (const [_node, neighbors] of graph) {
		const k = neighbors.size
		if (k < 2) continue

		// Count edges between neighbors
		let edgesBetweenNeighbors = 0
		const neighborArray = Array.from(neighbors)
		for (let i = 0; i < neighborArray.length; i++) {
			for (let j = i + 1; j < neighborArray.length; j++) {
				if (graph.get(neighborArray[i])?.has(neighborArray[j])) {
					edgesBetweenNeighbors++
				}
			}
		}

		// Local clustering coefficient = actual / possible edges between neighbors
		const possibleEdges = (k * (k - 1)) / 2
		totalCoeff += edgesBetweenNeighbors / possibleEdges
		nodeCount++
	}

	return nodeCount > 0 ? totalCoeff / nodeCount : 0
}

// Main analysis
async function main() {
	console.log("=== Pairwise Comparison Graph Analysis ===\n")

	// Use canonical getToys() from lib/toys.ts for consistency with prepare-dimension.ts
	const allToysData = await getToys()
	const allToys = allToysData.filter(isVersioned).map((t) => t.slug)
	console.log(`Total toys in database: ${allToys.length}`)

	const comparisons = getExistingComparisons()
	const graphs = buildGraphs(comparisons)

	for (const dim of DIMENSIONS) {
		console.log(`\n${"=".repeat(60)}`)
		console.log(`DIMENSION: ${dim}`)
		console.log("=".repeat(60))

		const graph = graphs.get(dim)
		if (!graph) {
			throw new Error(`Missing graph data for dimension ${dim}.`)
		}
		const toysWithComparisons = graph.size
		const toysWithoutComparisons = allToys.length - toysWithComparisons

		// Count edges
		let edgeCount = 0
		for (const neighbors of graph.values()) {
			edgeCount += neighbors.size
		}
		edgeCount /= 2 // Each edge counted twice

		const maxPossibleEdges = (toysWithComparisons * (toysWithComparisons - 1)) / 2
		const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0

		console.log(`\n📊 Basic Stats:`)
		console.log(`   Toys with comparisons: ${toysWithComparisons}`)
		console.log(`   Toys without comparisons: ${toysWithoutComparisons}`)
		console.log(`   Total comparisons (edges): ${edgeCount}`)
		console.log(`   Edge density: ${(density * 100).toFixed(2)}% of possible pairs`)

		// Connected components
		const components = findConnectedComponents(graph)
		console.log(`\n🔗 Connected Components: ${components.length}`)

		if (components.length === 1 && toysWithComparisons > 0) {
			console.log(`   ✅ Graph is fully connected!`)
		} else if (components.length > 1) {
			console.log(`   ⚠️  Graph has ${components.length} isolated clusters`)
			console.log(`   Component sizes: ${components.map((c) => c.length).join(", ")}`)

			// Show small components
			for (let i = 0; i < components.length; i++) {
				const comp = components[i]
				if (comp.length <= 10) {
					console.log(`   Component ${i + 1} (${comp.length} toys): ${comp.join(", ")}`)
				} else {
					console.log(
						`   Component ${i + 1} (${comp.length} toys): ${comp.slice(0, 5).join(", ")}... and ${comp.length - 5} more`,
					)
				}
			}
		}

		// Only analyze main component if graph is not empty
		if (toysWithComparisons > 0) {
			const mainComponent = components[0]

			// Build subgraph for main component
			const mainGraph = new Map<string, Set<string>>()
			for (const node of mainComponent) {
				const neighbors = graph.get(node)
				if (neighbors) {
					mainGraph.set(
						node,
						new Set([...neighbors].filter((n) => mainComponent.includes(n))),
					)
				}
			}

			// Articulation points
			const articulationPoints = findArticulationPoints(mainGraph)
			console.log(`\n🌉 Articulation Points (bridges): ${articulationPoints.length}`)
			if (articulationPoints.length > 0) {
				console.log(`   ⚠️  Removing these toys would disconnect the graph:`)
				// Show up to 10 articulation points with their degree
				const withDegree = articulationPoints
					.map((p) => ({ degree: mainGraph.get(p)?.size ?? 0, node: p }))
					.sort((a, b) => a.degree - b.degree)
					.slice(0, 15)
				for (const { node, degree } of withDegree) {
					console.log(`      ${node} (${degree} connections)`)
				}
				if (articulationPoints.length > 15) {
					console.log(`      ... and ${articulationPoints.length - 15} more`)
				}
			} else if (mainComponent.length > 2) {
				console.log(`   ✅ No single toy removal would disconnect the graph`)
			}

			// Diameter
			const { diameter, path } = computeDiameter(mainGraph)
			console.log(`\n📏 Graph Diameter: ${diameter}`)
			if (path.length > 0) {
				console.log(`   Longest path: ${path.join(" → ")}`)
			}

			// Average path length
			const avgPath = computeAveragePathLength(mainGraph)
			console.log(`   Average path length: ${avgPath.toFixed(2)}`)

			// Clustering coefficient
			const clustering = computeClusteringCoefficient(mainGraph)
			console.log(`\n🔺 Clustering Coefficient: ${(clustering * 100).toFixed(1)}%`)
			console.log(`   (How often are toy's opponents also opponents of each other)`)

			// Degree distribution
			const degrees = Array.from(mainGraph.values()).map((n) => n.size)
			const minDegree = Math.min(...degrees)
			const maxDegree = Math.max(...degrees)
			const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length

			console.log(`\n📈 Degree Distribution (comparisons per toy):`)
			console.log(`   Min: ${minDegree}, Max: ${maxDegree}, Avg: ${avgDegree.toFixed(1)}`)

			// Show toys with lowest degree (most isolated within component)
			const lowDegree = Array.from(mainGraph.entries())
				.map(([toy, neighbors]) => ({ degree: neighbors.size, toy }))
				.sort((a, b) => a.degree - b.degree)
				.slice(0, 10)
			console.log(`\n   Toys with fewest comparisons (weakest links):`)
			for (const { toy, degree } of lowDegree) {
				console.log(`      ${toy}: ${degree} comparisons`)
			}
		}
	}

	// Summary across all dimensions
	console.log(`\n${"=".repeat(60)}`)
	console.log("OVERALL SUMMARY")
	console.log("=".repeat(60))

	// Find toys that appear in all dimensions
	const toyDimensionCount = new Map<string, number>()
	for (const dim of DIMENSIONS) {
		const graph = graphs.get(dim)
		if (!graph) {
			throw new Error(`Missing graph data for dimension ${dim}.`)
		}
		for (const toy of graph.keys()) {
			toyDimensionCount.set(toy, (toyDimensionCount.get(toy) ?? 0) + 1)
		}
	}

	const toysInAllDims = Array.from(toyDimensionCount.entries())
		.filter(([, count]) => count === DIMENSIONS.length)
		.map(([toy]) => toy)

	const toysInSomeDims = Array.from(toyDimensionCount.entries())
		.filter(([, count]) => count > 0 && count < DIMENSIONS.length)
		.sort((a, b) => a[1] - b[1])

	console.log(
		`\nToys with comparisons in ALL ${DIMENSIONS.length} dimensions: ${toysInAllDims.length}`,
	)
	console.log(`Toys with comparisons in SOME dimensions: ${toysInSomeDims.length}`)
	console.log(`Toys with NO comparisons: ${allToys.length - toyDimensionCount.size}`)

	if (toysInSomeDims.length > 0 && toysInSomeDims.length <= 20) {
		console.log(`\nToys with partial dimension coverage:`)
		for (const [toy, count] of toysInSomeDims) {
			console.log(`   ${toy}: ${count}/${DIMENSIONS.length} dimensions`)
		}
	}
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
