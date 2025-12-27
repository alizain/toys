import type { Comparison, Dimension } from "@/lib/dimensions"
import type { Toy } from "@/lib/toys"

export interface ToyComparison {
	dimension: Dimension
	opponent: string
	opponentName: string
	result: "win" | "loss" | "tie"
	timestamp: string
}

export interface ComparisonStats {
	total: number
	wins: number
	losses: number
	ties: number
	winRate: number
}

export function getToyComparisons(
	slug: string,
	allComparisons: Comparison[],
	allToys: Toy[],
): ToyComparison[] {
	const toyNameBySlug = new Map(allToys.map((toy) => [toy.slug, toy.name]))

	return allComparisons
		.filter((comparison) => comparison.toyA === slug || comparison.toyB === slug)
		.map((comparison) => {
			const opponent = comparison.toyA === slug ? comparison.toyB : comparison.toyA
			const opponentName = toyNameBySlug.get(opponent) ?? opponent
			const result: ToyComparison["result"] =
				comparison.winner === "tie" ? "tie" : comparison.winner === slug ? "win" : "loss"

			return {
				dimension: comparison.dimension,
				opponent,
				opponentName,
				result,
				timestamp: comparison.timestamp,
			}
		})
		.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function getComparisonStats(comparisons: ToyComparison[]): ComparisonStats {
	const stats = comparisons.reduce(
		(acc, comparison) => {
			if (comparison.result === "win") acc.wins += 1
			if (comparison.result === "loss") acc.losses += 1
			if (comparison.result === "tie") acc.ties += 1
			acc.total += 1
			return acc
		},
		{ losses: 0, ties: 0, total: 0, wins: 0 },
	)

	const decisiveTotal = stats.total - stats.ties
	const winRate = decisiveTotal > 0 ? stats.wins / decisiveTotal : 0

	return { ...stats, winRate }
}

export function getAvailableOpponents(
	comparisons: ToyComparison[],
): Array<{ slug: string; name: string }> {
	const opponents = new Map<string, string>()

	for (const comparison of comparisons) {
		if (!opponents.has(comparison.opponent)) {
			opponents.set(comparison.opponent, comparison.opponentName)
		}
	}

	return [...opponents.entries()]
		.map(([slug, name]) => ({ name, slug }))
		.sort((a, b) => a.name.localeCompare(b.name))
}
