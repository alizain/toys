import type { Comparison, Dimension } from "./comparisons"

export type AdjacencyList = Map<string, Set<string>>

export function buildAdjacencyList(
	comparisons: Comparison[],
	dimension: Dimension,
): AdjacencyList {
	const graph: AdjacencyList = new Map()

	for (const comparison of comparisons) {
		if (comparison.dimension !== dimension) continue

		const { toyA, toyB } = comparison
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

	return graph
}

export function findConnectedComponents(graph: AdjacencyList): string[][] {
	const visited = new Set<string>()
	const components: string[][] = []

	for (const node of graph.keys()) {
		if (visited.has(node)) continue

		const component: string[] = []
		const queue = [node]
		let index = 0

		while (index < queue.length) {
			const current = queue[index]
			index += 1

			if (visited.has(current)) continue
			visited.add(current)
			component.push(current)

			for (const neighbor of graph.get(current) ?? []) {
				if (!visited.has(neighbor)) {
					queue.push(neighbor)
				}
			}
		}

		components.push(component.sort())
	}

	return components.sort((a, b) => b.length - a.length)
}

export function findArticulationPoints(graph: AdjacencyList): string[] {
	const nodes = Array.from(graph.keys())
	if (nodes.length === 0) return []

	const visited = new Set<string>()
	const disc = new Map<string, number>()
	const low = new Map<string, number>()
	const parent = new Map<string, string | null>()
	const articulationPoints = new Set<string>()

	let time = 0

	function dfs(u: string): void {
		let children = 0
		visited.add(u)
		disc.set(u, time)
		low.set(u, time)
		time += 1

		for (const v of graph.get(u) ?? []) {
			if (!visited.has(v)) {
				children += 1
				parent.set(v, u)
				dfs(v)

				const lowU = low.get(u)
				const lowV = low.get(v)
				const discU = disc.get(u)
				if (lowU === undefined || lowV === undefined || discU === undefined) {
					throw new Error(
						"Missing low-link data while computing articulation points.",
					)
				}
				low.set(u, Math.min(lowU, lowV))

				if (parent.get(u) === null && children > 1) {
					articulationPoints.add(u)
				}
				if (parent.get(u) !== null && lowV >= discU) {
					articulationPoints.add(u)
				}
			} else if (v !== parent.get(u)) {
				const lowU = low.get(u)
				const discV = disc.get(v)
				if (lowU === undefined || discV === undefined) {
					throw new Error(
						"Missing traversal data while computing articulation points.",
					)
				}
				low.set(u, Math.min(lowU, discV))
			}
		}
	}

	for (const node of nodes) {
		if (!visited.has(node)) {
			parent.set(node, null)
			dfs(node)
		}
	}

	return Array.from(articulationPoints).sort()
}

export function getHubToy(graph: AdjacencyList): string {
	let hub: string | null = null
	let maxDegree = -1

	for (const [node, neighbors] of graph) {
		const degree = neighbors.size
		if (degree > maxDegree) {
			maxDegree = degree
			hub = node
			continue
		}

		if (degree === maxDegree && hub !== null && node < hub) {
			hub = node
		}
	}

	if (hub === null) {
		throw new Error("Cannot determine hub toy from empty graph.")
	}

	return hub
}
