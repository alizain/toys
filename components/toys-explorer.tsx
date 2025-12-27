"use client"

import { useQueryStates } from "nuqs"
import { useMemo } from "react"
import type { Toy, ToyRating } from "@/lib/toys"
import { FilterPanel, filterParsers } from "./filter-panel"
import { ToyCard } from "./toy-card"

interface ToysExplorerProps {
	toys: Toy[]
}

type SortField = "total" | "gen" | "dev" | "chal" | "sens" | "expr" | "soc" | "sust"

function getRatingValue(rating: ToyRating | null, field: SortField): number {
	if (!rating) return 0
	switch (field) {
		case "total":
			return rating.total
		case "gen":
			return rating.generativity
		case "dev":
			return rating.developmentalLongevity
		case "chal":
			return rating.productiveChallenge
		case "sens":
			return rating.sensoryEngagement
		case "expr":
			return rating.expressiveRange
		case "soc":
			return rating.socialAffordance
		case "sust":
			return rating.practicalSustainability
	}
}

export function ToysExplorer({ toys }: ToysExplorerProps) {
	const [filters] = useQueryStates(filterParsers, { shallow: false })

	const filteredAndSortedToys = useMemo(() => {
		let result = [...toys]

		// Apply filters
		result = result.filter((toy) => {
			if (!toy.rating) return true

			if (filters.gen !== null && toy.rating.generativity < filters.gen)
				return false
			if (filters.dev !== null && toy.rating.developmentalLongevity < filters.dev)
				return false
			if (filters.chal !== null && toy.rating.productiveChallenge < filters.chal)
				return false
			if (filters.sens !== null && toy.rating.sensoryEngagement < filters.sens)
				return false
			if (filters.expr !== null && toy.rating.expressiveRange < filters.expr)
				return false
			if (filters.soc !== null && toy.rating.socialAffordance < filters.soc)
				return false
			if (
				filters.sust !== null &&
				toy.rating.practicalSustainability < filters.sust
			)
				return false
			if (filters.total !== null && toy.rating.total < filters.total) return false

			return true
		})

		// Apply sorting
		const sortField = filters.sort as SortField
		const sortDir = filters.dir

		result.sort((a, b) => {
			const aVal = getRatingValue(a.rating, sortField)
			const bVal = getRatingValue(b.rating, sortField)

			// Toys without ratings go to the end
			if (!a.rating && !b.rating) return a.name.localeCompare(b.name)
			if (!a.rating) return 1
			if (!b.rating) return -1

			const diff = sortDir === "desc" ? bVal - aVal : aVal - bVal
			if (diff !== 0) return diff

			// Secondary sort by name
			return a.name.localeCompare(b.name)
		})

		return result
	}, [toys, filters])

	return (
		<div className="space-y-6">
			<FilterPanel />

			{/* Results count */}
			<div className="text-sm text-muted-foreground">
				Showing {filteredAndSortedToys.length} of {toys.length} toys
			</div>

			{/* Toys Grid */}
			{filteredAndSortedToys.length === 0 ? (
				<div className="text-center py-16 bg-muted/30 rounded-2xl">
					<p className="text-muted-foreground text-lg">
						No toys match your filters
					</p>
					<p className="text-sm text-muted-foreground mt-1">
						Try adjusting or clearing some filters
					</p>
				</div>
			) : (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{filteredAndSortedToys.map((toy, index) => (
						<ToyCard
							key={toy.slug}
							toy={toy}
							index={index}
						/>
					))}
				</div>
			)}
		</div>
	)
}
