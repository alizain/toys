import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import Markdown from "react-markdown"
import { FrontmatterDisplay } from "@/components/frontmatter-display"
import { RatingBar } from "@/components/rating-bar"
import { ToyComparisonHistory } from "@/components/toy-comparison-history"
import { cn } from "@/lib/cn"
import { DIMENSIONS, type DimensionInfo, getExistingComparisons } from "@/lib/comparisons"
import { getEloColor } from "@/lib/elo"
import { getAvailableOpponents, getToyComparisons } from "@/lib/toy-comparisons"
import { getToys, type ToyRating } from "@/lib/toys"

interface PageProps {
	params: Promise<{ slug: string }>
}


function RatingSection({ rating }: { rating: ToyRating }) {
	return (
		<div className="grid grid-cols-2 gap-x-8 gap-y-2">
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

export default async function ToyPage({ params }: PageProps) {
	const { slug } = await params
	const allToys = await getToys()
	const toy = allToys.find((item) => item.slug === slug)

	if (!toy) {
		notFound()
	}

	const allComparisons = getExistingComparisons()
	const toyComparisons = getToyComparisons(slug, allComparisons, allToys)
	const availableOpponents = getAvailableOpponents(toyComparisons)
	const availableDimensions = [...new Set(toyComparisons.map((item) => item.dimension))]
		.map((dimension) => DIMENSIONS.find((item) => item.key === dimension))
		.filter((dimension): dimension is DimensionInfo => dimension !== undefined)

	const { rating } = toy

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-3xl mx-auto px-6 py-8">
				{/* Back link */}
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to all toys
				</Link>

				{/* Header */}
				<div className="flex items-start gap-6 mb-8">
					<div className="flex-1">
						<h1 className="text-4xl font-bold text-foreground mb-2">
							{toy.name}
						</h1>
						{toy.link && (
							<a
								href={toy.link}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
							>
								View product
								<ExternalLink className="w-3.5 h-3.5" />
							</a>
						)}
					</div>

					{rating && (
						<div
							className={cn(
								"flex items-center justify-center",
								"w-20 h-20 rounded-2xl",
								"bg-gradient-to-br text-white shadow-lg",
								getEloColor(rating.total),
							)}
						>
							<span className="text-2xl font-bold leading-none">
								{rating.total}
							</span>
						</div>
					)}
				</div>

				{/* Frontmatter metadata */}
				<FrontmatterDisplay frontmatter={toy.frontmatter} />

				{/* Ratings */}
				{rating && (
					<div className="p-6 rounded-2xl bg-muted/30 border border-border mb-8">
						<RatingSection rating={rating} />
					</div>
				)}

				{/* Markdown content */}
				<div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
					<Markdown>{toy.content}</Markdown>
				</div>

				{/* Comparison History */}
				<div className="mt-12 pt-12 border-t border-border">
					<ToyComparisonHistory
						comparisons={toyComparisons}
						availableDimensions={availableDimensions}
						availableOpponents={availableOpponents}
					/>
				</div>
			</div>
		</div>
	)
}
