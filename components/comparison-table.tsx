import { Check, Equal, X } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/cn"
import { DIMENSIONS } from "@/lib/dimensions"
import type { ToyComparison } from "@/lib/toy-comparisons"

interface ComparisonTableProps {
	comparisons: ToyComparison[]
	totalComparisons?: number
}

const RESULT_STYLES = {
	loss: {
		badge: "bg-rose-50 text-rose-700 border-rose-200",
		icon: X,
		label: "Loss",
	},
	tie: {
		badge: "bg-muted text-muted-foreground border-border",
		icon: Equal,
		label: "Tie",
	},
	win: {
		badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
		icon: Check,
		label: "Win",
	},
} as const

function ResultBadge({ result }: { result: ToyComparison["result"] }) {
	const config = RESULT_STYLES[result]
	const Icon = config.icon

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
				config.badge,
			)}
		>
			<Icon className="w-3.5 h-3.5" />
			{config.label}
		</span>
	)
}

function getDimensionLabel(dimension: ToyComparison["dimension"]) {
	return (
		DIMENSIONS.find((dimensionInfo) => dimensionInfo.key === dimension)?.label ??
		dimension
	)
}

function formatTimestamp(timestamp: string) {
	return new Date(timestamp).toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
	})
}

export function ComparisonTable({ comparisons, totalComparisons }: ComparisonTableProps) {
	const totalCount = totalComparisons ?? comparisons.length
	if (comparisons.length === 0) {
		if (totalCount === 0) {
			return (
				<div className="rounded-2xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
					No comparisons
				</div>
			)
		}

		return (
			<div className="rounded-2xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
				No comparisons match your filters ({totalCount} total)
			</div>
		)
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
			<table className="w-full text-sm">
				<thead className="hidden md:table-header-group bg-muted/40">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Dimension
						</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Opponent
						</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Result
						</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Date
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border/50">
					{comparisons.map((comparison) => (
						<tr
							key={`${comparison.dimension}-${comparison.opponent}-${comparison.timestamp}`}
							className="flex flex-col md:table-row md:transition-colors md:hover:bg-muted/30"
						>
							<td className="px-4 pt-4 md:py-4 md:pt-4">
								<p className="text-xs text-muted-foreground md:hidden">Dimension</p>
								<p className="font-medium text-foreground">
									{getDimensionLabel(comparison.dimension)}
								</p>
							</td>
							<td className="px-4 pt-2 md:py-4">
								<p className="text-xs text-muted-foreground md:hidden">Opponent</p>
								<Link
									href={`/toys/${comparison.opponent}`}
									className="text-primary hover:underline"
								>
									{comparison.opponentName}
								</Link>
							</td>
							<td className="px-4 pt-2 md:py-4">
								<p className="text-xs text-muted-foreground md:hidden">Result</p>
								<ResultBadge result={comparison.result} />
							</td>
							<td className="px-4 pt-2 pb-4 md:py-4">
								<p className="text-xs text-muted-foreground md:hidden">Date</p>
								<span className="text-sm text-muted-foreground">
									{formatTimestamp(comparison.timestamp)}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
