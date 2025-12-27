import { cn } from "@/lib/cn"
import { eloToBarPercentage, formatWinProbability, getEloBarColor } from "@/lib/elo"

interface RatingBarProps {
	label: string
	value: number // Elo rating
}

export function RatingBar({ label, value }: RatingBarProps) {
	const percentage = eloToBarPercentage(value)

	return (
		<div className="flex items-center gap-3">
			<span className="w-32 text-xs text-muted-foreground truncate">{label}</span>
			<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500",
						getEloBarColor(value),
					)}
					style={{ width: `${percentage}%` }}
				/>
			</div>
			<span className="w-20 text-xs font-medium text-right text-muted-foreground">
				{value} ({formatWinProbability(value)})
			</span>
		</div>
	)
}
