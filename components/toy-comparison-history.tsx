"use client"

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs"
import { useMemo } from "react"
import { ComparisonStatsCard } from "@/components/comparison-stats-card"
import { ComparisonTable } from "@/components/comparison-table"
import { MultiSelectCombobox } from "@/components/multi-select-combobox"
import type { DimensionInfo } from "@/lib/dimensions"
import { getComparisonStats, type ToyComparison } from "@/lib/toy-comparisons"

const comparisonFilterParsers = {
	dims: parseAsArrayOf(parseAsString).withDefault([]),
	opponents: parseAsArrayOf(parseAsString).withDefault([]),
}

interface ToyComparisonHistoryProps {
	comparisons: ToyComparison[]
	availableDimensions: DimensionInfo[]
	availableOpponents: Array<{ slug: string; name: string }>
}

export function ToyComparisonHistory({
	comparisons,
	availableDimensions,
	availableOpponents,
}: ToyComparisonHistoryProps) {
	const [filters, setFilters] = useQueryStates(comparisonFilterParsers, {
		shallow: false,
	})

	const opponentOptions = useMemo(
		() =>
			availableOpponents.map((opponent) => ({
				label: opponent.name,
				value: opponent.slug,
			})),
		[availableOpponents],
	)

	const dimensionOptions = useMemo<Array<{ label: string; value: string }>>(
		() =>
			availableDimensions.map((dimension) => ({
				label: dimension.label,
				value: dimension.key,
			})),
		[availableDimensions],
	)

	const filteredComparisons = useMemo(() => {
		return comparisons.filter((comparison) => {
			const opponentMatch =
				filters.opponents.length === 0 ||
				filters.opponents.includes(comparison.opponent)
			const dimensionMatch =
				filters.dims.length === 0 || filters.dims.includes(comparison.dimension)

			return opponentMatch && dimensionMatch
		})
	}, [comparisons, filters])

	const filteredStats = useMemo(
		() => getComparisonStats(filteredComparisons),
		[filteredComparisons],
	)

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-2xl font-bold text-foreground">
						Comparison History
					</h2>
					<p className="text-sm text-muted-foreground">
						Showing {filteredComparisons.length} of {comparisons.length}{" "}
						comparisons
					</p>
				</div>
			</div>

			<ComparisonStatsCard stats={filteredStats} />

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<MultiSelectCombobox
					label="Opponents"
					placeholder="Filter by opponent"
					options={opponentOptions}
					selected={filters.opponents}
					onChange={(value) => setFilters({ opponents: value })}
				/>
				<MultiSelectCombobox
					label="Dimensions"
					placeholder="Filter by dimension"
					options={dimensionOptions}
					selected={filters.dims}
					onChange={(value) => setFilters({ dims: value })}
				/>
			</div>

			<ComparisonTable
				comparisons={filteredComparisons}
				totalComparisons={comparisons.length}
			/>
		</section>
	)
}
