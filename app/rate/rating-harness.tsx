"use client"

import { ArrowLeft, Check, Equal, ExternalLink, Home, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/cn"

interface ToyData {
	slug: string
	name: string
	content: string
	link: string | null
}

interface ScoringGuide {
	score: number
	description: string
}

interface DimensionInfo {
	key: string
	label: string
	question: string
	description: string
	keyQuestions: string[]
	scoringGuide: ScoringGuide[]
}

interface RatingHarnessProps {
	toys: ToyData[]
	comparedPairs: string[]
	dimensions: DimensionInfo[]
}

function getComparisonKey(dimension: string, toyA: string, toyB: string): string {
	const [first, second] = [toyA, toyB].sort()
	return `${dimension}:${first}:${second}`
}

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled
}

function ToyCard({
	toy,
	label,
	onClick,
	disabled,
}: {
	toy: ToyData
	label: string
	onClick: () => void
	disabled: boolean
}) {
	return (
		<div className="relative flex flex-col h-full">
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={cn(
					"flex-1 w-full group relative p-6 bg-white rounded-2xl border-2 border-purple-200",
					"hover:border-purple-500 hover:shadow-xl",
					"transition-all duration-200 text-left",
					disabled && "opacity-50 cursor-not-allowed",
				)}
			>
				<div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
					{label}
				</div>

				<h2 className="text-xl font-bold text-purple-900 pr-14 mb-3">
					{toy.name}
				</h2>

				{toy.link && (
					<a
						href={toy.link}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => e.stopPropagation()}
						className="inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 mb-4"
					>
						View product <ExternalLink className="w-3.5 h-3.5" />
					</a>
				)}

				{/* Toy content - show full markdown */}
				<div className="prose prose-sm prose-purple max-w-none">
					<div className="text-gray-700 whitespace-pre-wrap">{toy.content}</div>
				</div>

				<div className="mt-4 pt-4 border-t border-purple-100">
					<span className="text-purple-600 text-sm font-medium group-hover:text-purple-800">
						Click to choose this toy
					</span>
				</div>
			</button>
		</div>
	)
}

function DimensionPanel({ dimension }: { dimension: DimensionInfo }) {
	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200 p-6 mb-8">
			<div>
				<span className="inline-block px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium uppercase tracking-wider mb-3">
					{dimension.label}
				</span>
				<h1 className="text-2xl md:text-3xl font-bold text-purple-900 mb-2">
					{dimension.question}
				</h1>
				<p className="text-purple-600 text-sm leading-relaxed">
					{dimension.description}
				</p>
			</div>

			<div className="mt-6 pt-6 border-t border-purple-200">
				<div className="grid md:grid-cols-2 gap-6">
					{/* Key Questions */}
					<div>
						<h3 className="font-semibold text-purple-900 mb-3">
							Key Questions
						</h3>
						<ul className="space-y-2">
							{dimension.keyQuestions.map((q) => (
								<li
									key={q}
									className="flex items-start gap-2 text-sm text-gray-700"
								>
									<span className="text-purple-500 mt-0.5">?</span>
									{q}
								</li>
							))}
						</ul>
					</div>

					{/* Scoring Guide */}
					<div>
						<h3 className="font-semibold text-purple-900 mb-3">
							Scoring Guide
						</h3>
						<div className="space-y-2">
							{dimension.scoringGuide.map((guide) => (
								<div
									key={guide.score}
									className="flex items-start gap-3 text-sm"
								>
									<span
										className={cn(
											"w-6 h-6 rounded-full flex items-center justify-center font-bold text-white shrink-0",
											guide.score >= 10
												? "bg-emerald-500"
												: guide.score >= 7
													? "bg-teal-500"
													: guide.score >= 5
														? "bg-amber-500"
														: guide.score >= 3
															? "bg-orange-500"
															: "bg-rose-500",
										)}
									>
										{guide.score}
									</span>
									<span className="text-gray-700">
										{guide.description}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function RatingHarness({ toys, comparedPairs, dimensions }: RatingHarnessProps) {
	const [compared, setCompared] = useState<Set<string>>(new Set(comparedPairs))
	const [completedCount, setCompletedCount] = useState(0)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [currentPair, setCurrentPair] = useState<{
		dimension: DimensionInfo
		toyA: ToyData
		toyB: ToyData
	} | null>(null)

	// Generate a random uncompared pair
	const generateNextPair = useCallback(() => {
		const shuffledToys = shuffleArray(toys)
		const shuffledDimensions = shuffleArray(dimensions)

		for (const dimension of shuffledDimensions) {
			for (let i = 0; i < shuffledToys.length; i++) {
				for (let j = i + 1; j < shuffledToys.length; j++) {
					const toyA = shuffledToys[i]
					const toyB = shuffledToys[j]
					const key = getComparisonKey(dimension.key, toyA.slug, toyB.slug)

					if (!compared.has(key)) {
						// Randomly swap order for unbiased presentation
						if (Math.random() > 0.5) {
							setCurrentPair({ dimension, toyA, toyB })
						} else {
							setCurrentPair({ dimension, toyA: toyB, toyB: toyA })
						}
						return
					}
				}
			}
		}

		// All pairs compared
		setCurrentPair(null)
	}, [toys, dimensions, compared])

	// Initialize first pair
	useEffect(() => {
		if (!currentPair && toys.length > 1) {
			generateNextPair()
		}
	}, [currentPair, toys.length, generateNextPair])

	const handleChoice = async (winner: string) => {
		if (!currentPair || isSubmitting) return

		setIsSubmitting(true)

		try {
			const response = await fetch("/api/compare", {
				body: JSON.stringify({
					dimension: currentPair.dimension.key,
					toyA: currentPair.toyA.slug,
					toyB: currentPair.toyB.slug,
					winner,
				}),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			})

			if (response.ok) {
				const key = getComparisonKey(
					currentPair.dimension.key,
					currentPair.toyA.slug,
					currentPair.toyB.slug,
				)
				setCompared((prev) => new Set([...prev, key]))
				setCompletedCount((prev) => prev + 1)
				generateNextPair()
			}
		} catch (error) {
			console.error("Failed to save comparison:", error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const totalPossible = (toys.length * (toys.length - 1) * dimensions.length) / 2
	const progress = compared.size

	if (!currentPair) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
				<div className="text-center p-8">
					<div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
						<Check className="w-10 h-10 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-emerald-800 mb-2">
						All Done!
					</h1>
					<p className="text-emerald-600 mb-6">
						You've compared all {progress.toLocaleString()} pairs.
					</p>
					<Link
						href="/"
						className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
					>
						<Home className="w-5 h-5" />
						Back to Toys
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
			{/* Header */}
			<header className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
					<Link
						href="/"
						className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
					>
						<ArrowLeft className="w-5 h-5" />
						<span className="font-medium">Back</span>
					</Link>

					<div className="text-center">
						<div className="text-sm text-purple-500">Progress</div>
						<div className="font-bold text-purple-800">
							{progress.toLocaleString()} / {totalPossible.toLocaleString()}
						</div>
					</div>

					<button
						type="button"
						onClick={generateNextPair}
						className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
						title="Skip this pair"
					>
						<RefreshCw className="w-5 h-5" />
						<span className="hidden sm:inline">Skip</span>
					</button>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-6xl mx-auto px-6 py-8">
				{/* Session counter */}
				{completedCount > 0 && (
					<div className="text-center mb-6">
						<span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
							<Check className="w-4 h-4" />
							{completedCount} completed this session
						</span>
					</div>
				)}

				{/* Dimension Panel with details */}
				<DimensionPanel dimension={currentPair.dimension} />

				{/* Choice Cards */}
				<div className="grid md:grid-cols-2 gap-6 mb-8">
					<ToyCard
						toy={currentPair.toyA}
						label="A"
						onClick={() => handleChoice(currentPair.toyA.slug)}
						disabled={isSubmitting}
					/>
					<ToyCard
						toy={currentPair.toyB}
						label="B"
						onClick={() => handleChoice(currentPair.toyB.slug)}
						disabled={isSubmitting}
					/>
				</div>

				{/* Tie Button */}
				<div className="text-center">
					<button
						type="button"
						onClick={() => handleChoice("tie")}
						disabled={isSubmitting}
						className={cn(
							"inline-flex items-center gap-3 px-8 py-4 bg-gray-100 text-gray-700 rounded-xl",
							"hover:bg-gray-200 transition-colors font-medium",
							isSubmitting && "opacity-50 cursor-not-allowed",
						)}
					>
						<Equal className="w-5 h-5" />
						They're about equal
					</button>
				</div>
			</main>

			{/* Progress Bar */}
			<div className="fixed bottom-0 left-0 right-0 h-1 bg-purple-200">
				<div
					className="h-full bg-purple-600 transition-all duration-300"
					style={{ width: `${(progress / totalPossible) * 100}%` }}
				/>
			</div>
		</div>
	)
}
