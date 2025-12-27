"use client"

import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react"
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useState } from "react"
import { cn } from "@/lib/cn"

// Elo filter options - same scale for dimensions and total (total = mean of dimension Elos)
const ELO_OPTIONS = [
	{ label: "Any", value: null },
	{ label: "800+", value: 800 }, // Below average
	{ label: "900+", value: 900 }, // Near average
	{ label: "1000+", value: 1000 }, // Above average
	{ label: "1100+", value: 1100 }, // Good
	{ label: "1200+", value: 1200 }, // Excellent
	{ label: "1300+", value: 1300 }, // Elite
]

const SORT_OPTIONS = [
	{ label: "Total Elo", value: "total" },
	{ label: "Generativity", value: "gen" },
	{ label: "Dev. Longevity", value: "dev" },
	{ label: "Challenge", value: "chal" },
	{ label: "Sensory", value: "sens" },
	{ label: "Expression", value: "expr" },
	{ label: "Social", value: "soc" },
	{ label: "Sustainability", value: "sust" },
] as const

type SortField = (typeof SORT_OPTIONS)[number]["value"]

const DIMENSIONS = [
	{ key: "gen", label: "Generativity" },
	{ key: "dev", label: "Dev. Longevity" },
	{ key: "chal", label: "Challenge" },
	{ key: "sens", label: "Sensory" },
	{ key: "expr", label: "Expression" },
	{ key: "soc", label: "Social" },
	{ key: "sust", label: "Sustainability" },
] as const

export const filterParsers = {
	chal: parseAsInteger,
	dev: parseAsInteger,
	dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
	expr: parseAsInteger,
	gen: parseAsInteger,
	sens: parseAsInteger,
	soc: parseAsInteger,
	sort: parseAsStringLiteral(SORT_OPTIONS.map((o) => o.value)).withDefault("total"),
	sust: parseAsInteger,
	total: parseAsInteger,
}

export function FilterPanel() {
	const [isExpanded, setIsExpanded] = useState(false)
	const [filters, setFilters] = useQueryStates(filterParsers, {
		shallow: false,
	})

	const activeFilterCount = [
		filters.gen,
		filters.dev,
		filters.chal,
		filters.sens,
		filters.expr,
		filters.soc,
		filters.sust,
		filters.total,
	].filter((v) => v !== null).length

	const clearAllFilters = () => {
		setFilters({
			chal: null,
			dev: null,
			expr: null,
			gen: null,
			sens: null,
			soc: null,
			sust: null,
			total: null,
		})
	}

	const toggleDirection = () => {
		setFilters({ dir: filters.dir === "desc" ? "asc" : "desc" })
	}

	return (
		<div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
			{/* Header Row */}
			<div className="flex items-center justify-between gap-4 p-4">
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
				>
					<SlidersHorizontal className="w-4 h-4" />
					<span>Filters</span>
					{activeFilterCount > 0 && (
						<span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
							{activeFilterCount}
						</span>
					)}
					{isExpanded ? (
						<ChevronUp className="w-4 h-4 text-muted-foreground" />
					) : (
						<ChevronDown className="w-4 h-4 text-muted-foreground" />
					)}
				</button>

				{/* Sort Controls */}
				<div className="flex items-center gap-2">
					<label
						htmlFor="sort-select"
						className="text-sm text-muted-foreground hidden sm:block"
					>
						Sort by:
					</label>
					<select
						id="sort-select"
						value={filters.sort}
						onChange={(e) =>
							setFilters({ sort: e.target.value as SortField })
						}
						className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
					>
						{SORT_OPTIONS.map((opt) => (
							<option
								key={opt.value}
								value={opt.value}
							>
								{opt.label}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={toggleDirection}
						className={cn(
							"p-1.5 rounded-lg border border-border hover:bg-muted transition-colors",
							"text-muted-foreground hover:text-foreground",
						)}
						title={filters.dir === "desc" ? "Descending" : "Ascending"}
					>
						<span
							className={cn(
								"block transition-transform",
								filters.dir === "asc" && "rotate-180",
							)}
						>
							<ChevronDown className="w-4 h-4" />
						</span>
					</button>
				</div>
			</div>

			{/* Expanded Filter Panel */}
			{isExpanded && (
				<div className="border-t border-border/50 p-4 pt-3">
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						{DIMENSIONS.map((dim) => (
							<div
								key={dim.key}
								className="space-y-1"
							>
								<label
									htmlFor={`filter-${dim.key}`}
									className="text-xs font-medium text-muted-foreground"
								>
									{dim.label}
								</label>
								<select
									id={`filter-${dim.key}`}
									value={filters[dim.key] ?? ""}
									onChange={(e) =>
										setFilters({
											[dim.key]: e.target.value
												? Number(e.target.value)
												: null,
										})
									}
									className={cn(
										"w-full text-sm bg-background border border-border rounded-lg px-3 py-2",
										"focus:outline-none focus:ring-2 focus:ring-primary/50",
										filters[dim.key] !== null &&
											"border-primary/50 bg-primary/5",
									)}
								>
									{ELO_OPTIONS.map((opt) => (
										<option
											key={opt.label}
											value={opt.value ?? ""}
										>
											{opt.label}
										</option>
									))}
								</select>
							</div>
						))}

						{/* Total Elo */}
						<div className="space-y-1">
							<label
								htmlFor="filter-total"
								className="text-xs font-medium text-muted-foreground"
							>
								Total Elo
							</label>
							<select
								id="filter-total"
								value={filters.total ?? ""}
								onChange={(e) =>
									setFilters({
										total: e.target.value
											? Number(e.target.value)
											: null,
									})
								}
								className={cn(
									"w-full text-sm bg-background border border-border rounded-lg px-3 py-2",
									"focus:outline-none focus:ring-2 focus:ring-primary/50",
									filters.total !== null &&
										"border-primary/50 bg-primary/5",
								)}
							>
								{ELO_OPTIONS.map((opt) => (
									<option
										key={opt.label}
										value={opt.value ?? ""}
									>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Clear All */}
					{activeFilterCount > 0 && (
						<div className="mt-4 pt-3 border-t border-border/50">
							<button
								type="button"
								onClick={clearAllFilters}
								className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="w-3.5 h-3.5" />
								Clear all filters
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
