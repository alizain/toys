import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/cn"
import { formatWinProbability, getEloColor } from "@/lib/elo"
import type { Toy, ToyRating } from "@/lib/toys"
import { RatingBar } from "./rating-bar"

interface ToyCardProps {
	toy: Toy
	index: number
}

function RatingSection({ rating }: { rating: ToyRating }) {
	return (
		<div className="px-6 pb-6 pt-2 space-y-1.5 border-t border-border/50 mt-2">
			<RatingBar
				label="Generativity"
				value={rating.generativity}
			/>
			<RatingBar
				label="Developmental Longevity"
				value={rating.developmentalLongevity}
			/>
			<RatingBar
				label="Productive Challenge"
				value={rating.productiveChallenge}
			/>
			<RatingBar
				label="Sensory Engagement"
				value={rating.sensoryEngagement}
			/>
			<RatingBar
				label="Expressive Range"
				value={rating.expressiveRange}
			/>
			<RatingBar
				label="Social Affordance"
				value={rating.socialAffordance}
			/>
			<RatingBar
				label="Practical Sustainability"
				value={rating.practicalSustainability}
			/>
		</div>
	)
}

function ScoreBadge({ rating }: { rating: ToyRating }) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center",
				"w-16 h-16 rounded-xl",
				"bg-gradient-to-br text-white shadow-lg",
				getEloColor(rating.total),
			)}
		>
			<span className="text-xl font-bold leading-none">{rating.total}</span>
			<span className="text-[10px] uppercase tracking-wider opacity-90 mt-0.5">
				{formatWinProbability(rating.total)}
			</span>
		</div>
	)
}

export function ToyCard({ toy, index }: ToyCardProps) {
	const { rating } = toy

	return (
		<Link
			href={`/toys/${toy.slug}`}
			className={cn(
				"group relative bg-card rounded-2xl border border-border/50",
				"shadow-sm hover:shadow-lg transition-all duration-300",
				"overflow-hidden block",
			)}
			style={{ animationDelay: `${index * 50}ms` }}
		>
			{/* Header with score badge */}
			<div className="p-6 pb-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
							{toy.name}
						</h2>
						{toy.link && (
							<a
								href={toy.link}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
							>
								View product
								<ExternalLink className="w-3.5 h-3.5" />
							</a>
						)}
					</div>

					{rating && <ScoreBadge rating={rating} />}
				</div>
			</div>

			{/* Content */}
			<div className="px-6 pb-4">
				<p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
					{toy.content.split("\n\n")[0].replace(/^#.*\n*/, "")}
				</p>
			</div>

			{/* Ratings */}
			{rating && <RatingSection rating={rating} />}
		</Link>
	)
}
