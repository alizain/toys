import { Brush, Clock, Sparkles, Trophy } from "lucide-react"
import Link from "next/link"
import { ToysExplorer } from "@/components/toys-explorer"
import { ratingStats } from "@/lib/elo"
import { getToys } from "@/lib/toys"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function HomePage() {
	const toys = await getToys()

	// All stats come from precomputed rating-stats.json
	const stats = {
		avgGenerativity: ratingStats.dimensionAverages.generativity,
		excellent: ratingStats.tierCounts.top,
		total: ratingStats.toyCount,
	}

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<header className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
				<div className="relative max-w-6xl mx-auto px-6 py-20">
					<div className="flex items-center gap-3 mb-4">
						<Sparkles className="w-8 h-8 text-amber-300" />
						<span className="text-amber-200 font-medium">
							Curated Collection
						</span>
					</div>
					<h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
						The Best Toys
						<br />
						<span className="text-amber-200">for Kids</span>
					</h1>
					<p className="text-xl text-purple-100 max-w-xl mb-4">
						Every toy rated on 7 dimensions:
					</p>
					<ul className="list-disc list-inside space-y-1 mb-8 text-purple-100">
						<li>
							<Link href="/dimensions#generativity" className="text-amber-200 hover:text-white transition-colors">
								Generativity
							</Link>
						</li>
						<li>
							<Link href="/dimensions#developmental_longevity" className="text-amber-200 hover:text-white transition-colors">
								Developmental Longevity
							</Link>
						</li>
						<li>
							<Link href="/dimensions#productive_challenge" className="text-amber-200 hover:text-white transition-colors">
								Productive Challenge
							</Link>
						</li>
						<li>
							<Link href="/dimensions#sensory_engagement" className="text-amber-200 hover:text-white transition-colors">
								Sensory Engagement
							</Link>
						</li>
						<li>
							<Link href="/dimensions#expressive_range" className="text-amber-200 hover:text-white transition-colors">
								Expressive Range
							</Link>
						</li>
						<li>
							<Link href="/dimensions#social_affordance" className="text-amber-200 hover:text-white transition-colors">
								Social Affordance
							</Link>
						</li>
						<li>
							<Link href="/dimensions#practical_sustainability" className="text-amber-200 hover:text-white transition-colors">
								Practical Sustainability
							</Link>
						</li>
					</ul>
					<Link
						href="/dimensions"
						className="inline-flex items-center gap-2 text-amber-200 hover:text-white transition-colors mb-8"
					>
						Learn about our rating dimensions
						<span aria-hidden="true">→</span>
					</Link>

					{/* Stats */}
					<div className="flex flex-wrap gap-6">
						<div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
							<Trophy className="w-5 h-5 text-amber-300" />
							<div>
								<div className="text-2xl font-bold">{stats.total}</div>
								<div className="text-sm text-purple-200">
									Toys Reviewed
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
							<Clock className="w-5 h-5 text-emerald-300" />
							<div>
								<div className="text-2xl font-bold">
									{stats.excellent}
								</div>
								<div className="text-sm text-purple-200">
									Excellent Picks
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
							<Brush className="w-5 h-5 text-rose-300" />
							<div>
								<div className="text-2xl font-bold">
									{stats.avgGenerativity}
								</div>
								<div className="text-sm text-purple-200">
									Avg Generativity
								</div>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Rating Legend */}
			<div className="max-w-6xl mx-auto px-6 py-8">
				<div className="flex flex-wrap items-center justify-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 rounded-full bg-emerald-500" />
						<span className="text-muted-foreground">Top 30% ({ratingStats.p70}+)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 rounded-full bg-amber-500" />
						<span className="text-muted-foreground">Middle 40% ({ratingStats.p30}-{ratingStats.p70 - 1})</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 rounded-full bg-rose-400" />
						<span className="text-muted-foreground">Bottom 30% (&lt;{ratingStats.p30})</span>
					</div>
				</div>
			</div>

			{/* Toys Grid */}
			<main className="max-w-6xl mx-auto px-6 pb-20">
				{toys.length === 0 ? (
					<div className="text-center py-20">
						<p className="text-muted-foreground text-lg">
							No toys found. Check that the toys folder exists at
							~/Experiments/toys
						</p>
					</div>
				) : (
					<ToysExplorer toys={toys} />
				)}
			</main>

			{/* Footer */}
			<footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
				<p>
					Toys are ranked using Elo ratings derived from pairwise comparisons across 7 dimensions.
				</p>
			</footer>
		</div>
	)
}
