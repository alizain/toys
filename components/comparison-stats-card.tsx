import { cn } from "@/lib/cn"
import type { ComparisonStats } from "@/lib/toy-comparisons"

interface ComparisonStatsCardProps {
	stats: ComparisonStats
}

export function ComparisonStatsCard({ stats }: ComparisonStatsCardProps) {
	const winRatePercent = Math.round(stats.winRate * 100)

	return (
		<div
			className={cn(
				"bg-card border border-border/50 rounded-2xl",
				"shadow-sm p-4 sm:p-5",
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<h3 className="text-sm font-semibold text-foreground">
					Comparison summary
				</h3>
				<span className="text-sm text-muted-foreground">
					{stats.total} comparisons
				</span>
			</div>

			<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
				<div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3 py-2">
					<p className="text-xs text-emerald-700">Wins</p>
					<p className="text-lg font-semibold text-emerald-700">{stats.wins}</p>
				</div>
				<div className="rounded-xl border border-rose-200/60 bg-rose-50/60 px-3 py-2">
					<p className="text-xs text-rose-700">Losses</p>
					<p className="text-lg font-semibold text-rose-700">{stats.losses}</p>
				</div>
				<div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
					<p className="text-xs text-muted-foreground">Ties</p>
					<p className="text-lg font-semibold text-foreground">{stats.ties}</p>
				</div>
				<div className="rounded-xl border border-border/70 bg-background px-3 py-2">
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs text-muted-foreground">Win rate</p>
						<p className="text-sm font-semibold text-foreground">
							{winRatePercent}%
						</p>
					</div>
					<div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
						<div
							className="h-full rounded-full bg-emerald-500"
							style={{ width: `${winRatePercent}%` }}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
