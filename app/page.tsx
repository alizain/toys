import { Brush, Clock, Sparkles, Trophy } from "lucide-react"
import { ToysExplorer } from "@/components/toys-explorer"
import { getToys } from "@/lib/toys"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function HomePage() {
	const toys = await getToys()

	const stats = {
		avgGenerativity:
			toys.reduce((acc, t) => acc + (t.rating?.generativity || 0), 0) / toys.length,
		excellent: toys.filter((t) => t.rating && t.rating.total >= 56).length,
		total: toys.length,
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
					<p className="text-xl text-purple-100 max-w-xl mb-8">
						Every toy rated on 7 dimensions: generativity, developmental
						longevity, challenge, sensory, expression, social, and
						sustainability.
					</p>

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
									{stats.avgGenerativity.toFixed(1)}
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
						<span className="text-muted-foreground">Excellent (56-70)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 rounded-full bg-amber-500" />
						<span className="text-muted-foreground">Great (49-55)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 rounded-full bg-rose-400" />
						<span className="text-muted-foreground">Good (42-48)</span>
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
					Toys are rated on a scale of 1-10 for each of 7 dimensions.
					<br />
					Total score is out of 70.
				</p>
			</footer>
		</div>
	)
}
