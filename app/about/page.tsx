import { ArrowLeft, Sparkles, Target, Users } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
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

				{/* Hero */}
				<header className="mb-12">
					<h1 className="text-4xl font-bold text-foreground mb-6 text-balance">
						What is this?
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed">
						A curated collection of the best toys for kids, rated on seven research-backed
						dimensions that predict long-term developmental value.
					</p>
				</header>

				{/* Main content */}
				<div className="space-y-12">
					{/* The Problem */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
								<Target className="w-5 h-5" />
							</div>
							<h2 className="text-2xl font-bold text-foreground">The Problem</h2>
						</div>
						<div className="prose prose-neutral max-w-none">
							<p className="text-foreground/80 leading-relaxed">
								Most toy ratings focus on immediate appeal: Is it fun? Will kids like it?
								But these metrics often favor toys that provide short-term entertainment
								at the expense of long-term developmental value.
							</p>
							<p className="text-foreground/80 leading-relaxed">
								The best toys aren't always the flashiest. They're often simple, open-ended,
								and grow with children over years—not weeks.
							</p>
						</div>
					</section>

					{/* Our Approach */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
								<Sparkles className="w-5 h-5" />
							</div>
							<h2 className="text-2xl font-bold text-foreground">Our Approach</h2>
						</div>
						<div className="prose prose-neutral max-w-none">
							<p className="text-foreground/80 leading-relaxed">
								We evaluate every toy on{" "}
								<Link href="/dimensions" className="text-primary hover:underline font-medium">
									seven dimensions
								</Link>{" "}
								synthesized from the work of educational pioneers like Maria Montessori,
								Seymour Papert, Jean Piaget, and Loris Malaguzzi.
							</p>
							<p className="text-foreground/80 leading-relaxed">
								Then we use an Elo rating system—the same system used to rank chess
								players—to create head-to-head comparisons. This produces a robust,
								comparative ranking that surfaces the truly exceptional toys.
							</p>
						</div>
					</section>

					{/* The Seven Dimensions */}
					<section>
						<h2 className="text-2xl font-bold text-foreground mb-4">The Seven Dimensions</h2>
						<p className="text-muted-foreground mb-6">
							Each toy is scored 1-5 on these research-backed dimensions:
						</p>
						<div className="grid gap-4">
							<Link
								href="/dimensions#generativity"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Generativity</h3>
								<p className="text-sm text-muted-foreground">
									How many different things can a child make or do?
								</p>
							</Link>
							<Link
								href="/dimensions#developmental_longevity"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Developmental Longevity</h3>
								<p className="text-sm text-muted-foreground">
									How long will this remain valuable as the child develops?
								</p>
							</Link>
							<Link
								href="/dimensions#productive_challenge"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Productive Challenge</h3>
								<p className="text-sm text-muted-foreground">
									Does it offer just-right difficulty that grows with skill?
								</p>
							</Link>
							<Link
								href="/dimensions#sensory_engagement"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Sensory Engagement</h3>
								<p className="text-sm text-muted-foreground">
									How richly does it engage hands, eyes, and body?
								</p>
							</Link>
							<Link
								href="/dimensions#expressive_range"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Expressive Range</h3>
								<p className="text-sm text-muted-foreground">
									Can children express their own ideas and personality?
								</p>
							</Link>
							<Link
								href="/dimensions#social_affordance"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Social Affordance</h3>
								<p className="text-sm text-muted-foreground">
									Does it support play with others?
								</p>
							</Link>
							<Link
								href="/dimensions#practical_sustainability"
								className="block p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
							>
								<h3 className="font-semibold text-foreground mb-1">Practical Sustainability</h3>
								<p className="text-sm text-muted-foreground">
									Is it durable, affordable, and practical for real homes?
								</p>
							</Link>
						</div>
					</section>

					{/* Who Made This */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
								<Users className="w-5 h-5" />
							</div>
							<h2 className="text-2xl font-bold text-foreground">Who Made This</h2>
						</div>
						<div className="prose prose-neutral max-w-none">
							<p className="text-foreground/80 leading-relaxed">
								This is a personal project by a parent who got tired of toy recommendations
								that prioritize novelty over developmental value. The ratings reflect
								real-world testing and research-informed judgment.
							</p>
							<p className="text-foreground/80 leading-relaxed">
								The code is open source. Contributions and feedback are welcome.
							</p>
						</div>
						<div className="mt-6">
							<a
								href="https://github.com/alizain/toys"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
							>
								<svg
									className="size-5"
									fill="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
										clipRule="evenodd"
									/>
								</svg>
								View on GitHub
							</a>
						</div>
					</section>
				</div>

				{/* Footer */}
				<footer className="mt-16 pt-8 border-t border-border">
					<p className="text-sm text-muted-foreground text-center">
						Built with care for parents who want more than "Amazon's Choice."
					</p>
				</footer>
			</div>
		</div>
	)
}
