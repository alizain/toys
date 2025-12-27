import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DIMENSIONS } from "@/lib/dimensions"

interface Quote {
	text: string
	author: string
	source: string
}

const dimensionQuotes: Record<string, Quote[]> = {
	generativity: [
		{
			text: "The best activities have a low floor and a high ceiling... they are easy to get into but also have room to grow.",
			author: "Seymour Papert",
			source: "Extended to 'wide walls' by Mitchel Resnick, MIT Media Lab",
		},
		{
			text: "The child has a hundred languages, a hundred hands, a hundred thoughts, a hundred ways of thinking, of playing, of speaking.",
			author: "Loris Malaguzzi",
			source: "No Way. The Hundred Is There (poem)",
		},
	],
	developmental_longevity: [
		{
			text: "I fell in love with the gears... Gears, serving as models, carried many otherwise abstract ideas into my head.",
			author: "Seymour Papert",
			source: "Mindstorms: Children, Computers, and Powerful Ideas, 1980",
		},
		{
			text: "The hands are the instruments of man's intelligence.",
			author: "Maria Montessori",
			source: "The Absorbent Mind, 1949",
		},
	],
	productive_challenge: [
		{
			text: "I have had many students come to tell me that the reason they liked my class was that 'it was hard.' The phrase 'hard fun' captures what I see as the essence of the learning experience.",
			author: "Seymour Papert",
			source: "Hard Fun essay, Bangor Daily News, 2002",
		},
		{
			text: "There is no such thing as getting it right the first time... Debugging is a vital part of learning.",
			author: "Seymour Papert",
			source: "Mindstorms, 1980",
		},
	],
	sensory_engagement: [
		{
			text: "The hands are the instruments of man's intelligence.",
			author: "Maria Montessori",
			source: "The Absorbent Mind, 1949",
		},
		{
			text: "Nothing comes to the intellect that is not first in the senses.",
			author: "Maria Montessori",
			source: "Paraphrasing Aristotle, The Montessori Method, 1912",
		},
	],
	expressive_range: [
		{
			text: "The child has a hundred languages, a hundred hands, a hundred thoughts, a hundred ways of thinking, of playing, of speaking.",
			author: "Loris Malaguzzi",
			source: "No Way. The Hundred Is There (poem)",
		},
		{
			text: "Some of the most crucial steps in mental growth are based not simply on acquiring new skills, but on acquiring new ways to use what one already knows.",
			author: "Seymour Papert",
			source: "Mindstorms, 1980",
		},
	],
	social_affordance: [
		{
			text: "The game with rules is the ludic activity of the socialized being... Games with rules are games with sensori-motor combinations or intellectual combinations in which there is competition between individuals and which are regulated either by a code handed down from earlier generations, or by temporary agreement.",
			author: "Jean Piaget",
			source: "Play, Dreams and Imitation in Childhood, 1951",
		},
		{
			text: "What children learn does not follow as an automatic result from what is taught. Rather, it is in large part due to the children's own doing as a consequence of their activities and our resources.",
			author: "Loris Malaguzzi",
			source: "The Hundred Languages of Children, 1993",
		},
	],
	practical_sustainability: [
		{
			text: "The first aim of the prepared environment is, as far as it is possible, to render the growing child independent of the adult.",
			author: "Maria Montessori",
			source: "The Secret of Childhood, 1936",
		},
		{
			text: "There are three teachers of children: adults, other children, and their physical environment.",
			author: "Loris Malaguzzi",
			source: "The Hundred Languages of Children, 1993",
		},
	],
}

function QuoteBlock({ quote }: { quote: Quote }) {
	return (
		<blockquote className="border-l-4 border-primary/30 pl-6 my-6">
			<p className="text-lg italic text-foreground/80 leading-relaxed">
				"{quote.text}"
			</p>
			<footer className="mt-3 text-sm text-muted-foreground">
				<strong className="text-foreground font-medium">{quote.author}</strong>
				<span className="mx-2">—</span>
				<cite className="not-italic">{quote.source}</cite>
			</footer>
		</blockquote>
	)
}

function ScoringTable({
	scoringGuide,
}: { scoringGuide: { score: number; description: string }[] }) {
	return (
		<div className="overflow-hidden rounded-lg border border-border my-6">
			<table className="min-w-full divide-y divide-border">
				<thead className="bg-muted/50">
					<tr>
						<th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-20">
							Score
						</th>
						<th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
							Description
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border bg-background">
					{scoringGuide.map((item) => (
						<tr key={item.score}>
							<td className="px-4 py-3 text-sm font-medium text-foreground">
								{item.score}
							</td>
							<td className="px-4 py-3 text-sm text-muted-foreground">
								{item.description}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

function DimensionSection({
	dimension,
	index,
}: { dimension: (typeof DIMENSIONS)[number]; index: number }) {
	const quotes = dimensionQuotes[dimension.key] || []

	return (
		<section id={dimension.key} className="scroll-mt-8">
			<div className="flex items-baseline gap-4 mb-4">
				<span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
					{index + 1}
				</span>
				<h2 className="text-2xl font-bold text-foreground">{dimension.label}</h2>
			</div>

			<p className="text-xl text-muted-foreground italic mb-6">
				{dimension.question}
			</p>

			<div className="prose prose-neutral max-w-none mb-6">
				<p className="text-foreground/80">{dimension.description}</p>
			</div>

			{quotes.map((quote, i) => (
				<QuoteBlock key={i} quote={quote} />
			))}

			<h3 className="text-lg font-semibold text-foreground mt-8 mb-4">
				Scoring Guide
			</h3>
			<ScoringTable scoringGuide={dimension.scoringGuide} />

			<h3 className="text-lg font-semibold text-foreground mt-8 mb-4">
				Key Questions
			</h3>
			<ul className="space-y-2 mb-8">
				{dimension.keyQuestions.map((question, i) => (
					<li key={i} className="flex items-start gap-3">
						<span className="text-primary mt-1">•</span>
						<span className="text-muted-foreground">{question}</span>
					</li>
				))}
			</ul>
		</section>
	)
}

export default function DimensionsPage() {
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
				<header className="mb-16">
					<h1 className="text-4xl font-bold text-foreground mb-6 text-balance">
						The Seven Dimensions of Play
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed mb-6">
						A research-informed framework for evaluating toys, synthesized from
						the educational philosophies of four pioneering thinkers.
					</p>
					<div className="flex flex-wrap gap-3">
						<span className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium text-foreground">
							Maria Montessori
						</span>
						<span className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium text-foreground">
							Seymour Papert
						</span>
						<span className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium text-foreground">
							Loris Malaguzzi
						</span>
						<span className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium text-foreground">
							Jean Piaget
						</span>
					</div>
				</header>

				{/* Quick Nav */}
				<nav className="mb-12 p-6 rounded-2xl bg-muted/30 border border-border">
					<h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
						Jump to dimension
					</h2>
					<div className="flex flex-wrap gap-2">
						{DIMENSIONS.map((dimension) => (
							<a
								key={dimension.key}
								href={`#${dimension.key}`}
								className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
							>
								{dimension.label}
							</a>
						))}
					</div>
				</nav>

				{/* Dimensions */}
				<div className="space-y-16">
					{DIMENSIONS.map((dimension, index) => (
						<DimensionSection
							key={dimension.key}
							dimension={dimension}
							index={index}
						/>
					))}
				</div>

				{/* Footer */}
				<footer className="mt-16 pt-8 border-t border-border">
					<p className="text-sm text-muted-foreground text-center">
						This framework synthesizes research from educational philosophy with
						practical parenting wisdom. It favors open-ended, natural, durable
						materials that support long-term development over flashy, single-use,
						or passive entertainment.
					</p>
				</footer>
			</div>
		</div>
	)
}
