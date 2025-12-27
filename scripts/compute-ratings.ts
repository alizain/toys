/**
 * Compute toy ratings from pairwise comparisons using Bradley-Terry model.
 *
 * This script reads comparisons.csv and outputs ratings.csv with Elo ratings
 * for each toy on each of the 7 dimensions.
 *
 * Elo Formula: Elo = ELO_K × log₁₀(BT_score) + ELO_BASE
 *
 * Key properties:
 * - 400 point Elo difference = 10x skill ratio = 91% win probability
 * - Base Elo 1000 = average toy
 * - Total = arithmetic mean of 7 dimension Elos
 *
 * Usage: npx tsx scripts/compute-ratings.ts
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.resolve(__dirname, "..")
const COMPARISONS_FILE = path.join(PACKAGE_ROOT, "comparisons.csv")
const RATINGS_FILE = path.join(PACKAGE_ROOT, "ratings.csv")
const RATING_STATS_FILE = path.join(PACKAGE_ROOT, "rating-stats.json")
const TOYS_FOLDER = path.join(PACKAGE_ROOT, "toys")

// Verbose logging flag (pass --verbose or -v)
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v")

// Elo rating constants
// Keep in sync with lib/elo.ts
const ELO_K = 400 // Scale factor: 400 pts = 10x skill ratio
const ELO_BASE = 1000 // Average toy rating

type Dimension =
	| "generativity"
	| "developmental_longevity"
	| "productive_challenge"
	| "sensory_engagement"
	| "expressive_range"
	| "social_affordance"
	| "practical_sustainability"

const DIMENSIONS: Dimension[] = [
	"generativity",
	"developmental_longevity",
	"productive_challenge",
	"sensory_engagement",
	"expressive_range",
	"social_affordance",
	"practical_sustainability",
]

interface Comparison {
	dimension: Dimension
	toyA: string
	toyB: string
	winner: string
	lineNumber: number // 1-indexed line number in CSV
}

interface ToyStats {
	wins: number
	losses: number
	ties: number
	opponents: Set<string>
}

// Read all toy slugs from the toys folder (only toys with version in frontmatter)
function getAllToySlugs(): string[] {
	return fs.readdirSync(TOYS_FOLDER).filter((f) => {
		const toyPath = path.join(TOYS_FOLDER, f)
		const indexPath = path.join(toyPath, "index.md")
		if (!fs.statSync(toyPath).isDirectory() || !fs.existsSync(indexPath)) {
			return false
		}
		const content = fs.readFileSync(indexPath, "utf-8")
		try {
			const { data } = matter(content)
			return data.version !== undefined
		} catch (err) {
			// Fail loudly on YAML parsing errors - don't silently skip toys
			const message = err instanceof Error ? err.message : String(err)
			throw new Error(`Failed to parse frontmatter in ${indexPath}:\n  ${message}`)
		}
	})
}

// Read comparisons from CSV
function readComparisons(): Comparison[] {
	if (!fs.existsSync(COMPARISONS_FILE)) {
		console.log("No comparisons.csv found. Creating empty ratings.")
		return []
	}

	const content = fs.readFileSync(COMPARISONS_FILE, "utf-8")
	const lines = content.trim().split("\n")

	const comparisons: Comparison[] = []
	for (let i = 1; i < lines.length; i++) {
		const [dimension, toyA, toyB, winner] = lines[i].split(",")
		if (
			dimension &&
			toyA &&
			toyB &&
			winner &&
			DIMENSIONS.includes(dimension as Dimension)
		) {
			comparisons.push({
				dimension: dimension as Dimension,
				lineNumber: i + 1, // 1-indexed (header is line 1)
				toyA,
				toyB,
				winner,
			})
		}
	}

	return comparisons
}

interface DuplicateInfo {
	dimension: Dimension
	toyA: string
	toyB: string
	originalLine: number
	duplicateLine: number
}

// Compute stats for each toy on each dimension
function computeStats(comparisons: Comparison[]): Map<Dimension, Map<string, ToyStats>> {
	const stats = new Map<Dimension, Map<string, ToyStats>>()
	// Track first occurrence line numbers: dimension -> "toyA|toyB" -> lineNumber
	const firstOccurrence = new Map<Dimension, Map<string, number>>()
	const duplicates: DuplicateInfo[] = []

	for (const dim of DIMENSIONS) {
		stats.set(dim, new Map())
		firstOccurrence.set(dim, new Map())
	}

	for (const comp of comparisons) {
		const dimStats = stats.get(comp.dimension)
		const dimFirstOccurrence = firstOccurrence.get(comp.dimension)
		if (!dimStats || !dimFirstOccurrence) continue

		// Initialize stats if needed
		if (!dimStats.has(comp.toyA)) {
			dimStats.set(comp.toyA, { losses: 0, opponents: new Set(), ties: 0, wins: 0 })
		}
		if (!dimStats.has(comp.toyB)) {
			dimStats.set(comp.toyB, { losses: 0, opponents: new Set(), ties: 0, wins: 0 })
		}

		const statsA = dimStats.get(comp.toyA)
		const statsB = dimStats.get(comp.toyB)
		if (!statsA || !statsB) continue

		// Create canonical key (alphabetically sorted to handle A vs B and B vs A)
		const pairKey = [comp.toyA, comp.toyB].sort().join("|")

		if (statsA.opponents.has(comp.toyB)) {
			// Record duplicate for later reporting
			duplicates.push({
				dimension: comp.dimension,
				duplicateLine: comp.lineNumber,
				originalLine: dimFirstOccurrence.get(pairKey) ?? 0,
				toyA: comp.toyA,
				toyB: comp.toyB,
			})
			continue // Skip this duplicate, don't double-count
		}

		// Record first occurrence
		dimFirstOccurrence.set(pairKey, comp.lineNumber)
		statsA.opponents.add(comp.toyB)
		statsB.opponents.add(comp.toyA)

		if (comp.winner === "tie") {
			statsA.ties++
			statsB.ties++
		} else if (comp.winner === comp.toyA) {
			statsA.wins++
			statsB.losses++
		} else if (comp.winner === comp.toyB) {
			statsB.wins++
			statsA.losses++
		}
	}

	// Report all duplicates at once
	if (duplicates.length > 0) {
		const messages = duplicates.map(
			(d) =>
				`  Line ${d.duplicateLine}: ${d.toyA} vs ${d.toyB} on ${d.dimension} (first seen at line ${d.originalLine})`,
		)
		throw new Error(
			`Found ${duplicates.length} duplicate comparison(s):\n${messages.join("\n")}`,
		)
	}

	return stats
}

/**
 * Compute toy ratings using the Bradley-Terry model with MM algorithm.
 *
 * The Bradley-Terry model defines: P(i beats j) = p_i / (p_i + p_j)
 *
 * We use the MM (Minorization-Maximization) algorithm to find the MLE:
 *   p_i^(new) = W_i / Σ_j(n_ij / (p_i + p_j))
 *
 * Where:
 *   - W_i = effective wins for toy i (wins + 0.5 * ties)
 *   - n_ij = number of comparisons between i and j (always 1 in our case)
 *   - The sum is over all opponents j that i has faced
 *
 * Key implementation details:
 *   - Normalize scores after each iteration for numerical stability
 *   - Early stopping when max score change < tolerance
 *   - All-losses toys get small positive score (0.01) to avoid singularities
 *   - Uncompared toys get neutral score (1.0) → average after normalization
 *
 * References:
 *   - Hunter (2004): MM algorithms for generalized Bradley-Terry models
 *   - Ford (1957): MLE exists iff comparison graph is strongly connected
 *
 * @param stats - Per-toy win/loss/tie statistics from comparisons
 * @param allToys - List of all toy slugs to rate
 * @param maxIterations - Maximum iterations before stopping (default: 300)
 * @param tolerance - Convergence threshold for early stopping (default: 1e-5)
 * @returns Map of toy slug → raw Bradley-Terry score (not yet normalized to 1-10)
 */
function computeBradleyTerryScores(
	stats: Map<string, ToyStats>,
	allToys: string[],
	maxIterations = 300,
	tolerance = 1e-5,
	dimensionName?: string,
): Map<string, number> {
	const scores = new Map<string, number>()

	// Bayesian prior pseudo-counts: act as "virtual games" against a reference opponent
	// This prevents undefeated toys (W>0, L=0) from having scores → ∞
	// and all-losses toys (W=0, L>0) from having scores → 0
	const PRIOR_WINS = 0.5
	const PRIOR_LOSSES = 0.5

	// Initialize all toys with score 1.0
	for (const toy of allToys) {
		scores.set(toy, 1.0)
	}

	// For verbose logging: track a sample toy with data
	const sampleToy = Array.from(stats.keys())[0]

	if (VERBOSE) {
		const toysWithData = Array.from(stats.keys()).length
		const toysWithNoData = allToys.length - toysWithData
		console.log(`\n  [${dimensionName}] Starting Bradley-Terry iterations`)
		console.log(`    Toys with comparison data: ${toysWithData}`)
		console.log(`    Toys with no data (will get neutral score): ${toysWithNoData}`)
		console.log(
			`    Prior pseudo-counts: ${PRIOR_WINS} wins, ${PRIOR_LOSSES} losses (virtual games)`,
		)
		if (sampleToy) {
			const s = stats.get(sampleToy)!
			console.log(
				`    Sample toy "${sampleToy}": W=${s.wins} L=${s.losses} T=${s.ties} opponents=${s.opponents.size}`,
			)
		}
	}

	let finalIter = maxIterations
	for (let iter = 0; iter < maxIterations; iter++) {
		const newScores = new Map<string, number>()
		let maxChange = 0

		// For verbose: track sample toy's calculation
		let sampleCalc: {
			effectiveWins: number
			denominator: number
			rawScore: number
		} | null = null

		for (const toy of allToys) {
			const toyStats = stats.get(toy)

			if (!toyStats || toyStats.opponents.size === 0) {
				// No data → neutral score (will normalize to average)
				newScores.set(toy, 1.0)
				continue
			}

			// Effective wins: actual wins + half-ties + prior virtual wins
			const effectiveWins = toyStats.wins + toyStats.ties * 0.5 + PRIOR_WINS

			// MM denominator: Σ(1 / (p_i + p_j)) for all opponents
			// Plus prior term: virtual games against reference opponent with score 1.0
			const myScore = scores.get(toy) ?? 1.0
			let denominator = (PRIOR_WINS + PRIOR_LOSSES) / (myScore + 1.0)
			for (const opponent of toyStats.opponents) {
				const oppScore = scores.get(opponent) ?? 1.0
				denominator += 1 / (myScore + oppScore)
			}

			// With prior, effectiveWins is always > 0 and denominator is always > 0
			const rawScore = effectiveWins / denominator
			newScores.set(toy, rawScore)

			if (VERBOSE && toy === sampleToy) {
				sampleCalc = { denominator, effectiveWins, rawScore }
			}
		}

		// NORMALIZE: sum to number of toys (keeps scores around 1.0)
		const total = Array.from(newScores.values()).reduce((a, b) => a + b, 0)
		const scale = allToys.length / total

		for (const toy of allToys) {
			const normalized = (newScores.get(toy) ?? 1.0) * scale
			maxChange = Math.max(
				maxChange,
				Math.abs(normalized - (scores.get(toy) ?? 1.0)),
			)
			scores.set(toy, normalized)
		}

		// Verbose logging at key iterations
		if (
			VERBOSE &&
			(iter === 0 ||
				iter === 4 ||
				iter === 9 ||
				iter === 49 ||
				iter === 99 ||
				iter === maxIterations - 1)
		) {
			const allScores = Array.from(scores.values())
			const min = Math.min(...allScores)
			const max = Math.max(...allScores)
			const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length
			console.log(
				`    Iter ${iter + 1}: maxChange=${maxChange.toExponential(3)} scores=[${min.toFixed(4)}..${max.toFixed(4)}] avg=${avg.toFixed(4)}`,
			)
			if (sampleCalc && sampleToy) {
				const finalScore = scores.get(sampleToy) ?? 0
				console.log(
					`      "${sampleToy}": W_eff=${sampleCalc.effectiveWins} denom=${sampleCalc.denominator.toFixed(4)} raw=${sampleCalc.rawScore.toFixed(4)} → normalized=${finalScore.toFixed(4)}`,
				)
			}
		}

		if (maxChange < tolerance) {
			console.log(
				`  Converged after ${iter + 1} iterations (maxChange=${maxChange.toExponential(3)} < tol=${tolerance})`,
			)
			finalIter = iter + 1
			break
		}
	}

	if (VERBOSE && finalIter === maxIterations) {
		console.log(`  Did NOT converge after ${maxIterations} iterations`)
	}

	// Final score distribution
	if (VERBOSE) {
		const allScores = Array.from(scores.entries())
			.filter(([toy]) => stats.has(toy))
			.map(([, score]) => score)
			.sort((a, b) => b - a)
		console.log(
			`    Final score range (toys with data): [${allScores[allScores.length - 1]?.toFixed(4) ?? "N/A"}..${allScores[0]?.toFixed(4) ?? "N/A"}]`,
		)
		console.log(`    Top 3 raw scores:`)
		const sorted = Array.from(scores.entries())
			.filter(([toy]) => stats.has(toy))
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
		for (const [toy, score] of sorted) {
			const s = stats.get(toy)!
			console.log(
				`      ${toy}: ${score.toFixed(4)} (W=${s.wins} L=${s.losses} T=${s.ties})`,
			)
		}
	}

	return scores
}

// Print statistics for each dimension
function printDimensionStats(
	stats: Map<Dimension, Map<string, ToyStats>>,
	allToys: string[],
): void {
	console.log("\n=== Dimension Statistics ===\n")

	for (const dim of DIMENSIONS) {
		const dimStats = stats.get(dim) ?? new Map()

		// Get comparison counts for all toys (0 if no data)
		const comparisonsPerToy = allToys.map((toy) => ({
			count: dimStats.get(toy)?.opponents.size ?? 0,
			toy,
		}))

		// Calculate total comparisons (each comparison is counted in both toys, so divide by 2)
		const totalComparisons =
			comparisonsPerToy.reduce((sum, { count }) => sum + count, 0) / 2

		// Mean and median
		const counts = comparisonsPerToy.map(({ count }) => count)
		const mean = counts.reduce((a, b) => a + b, 0) / counts.length
		const sortedCounts = [...counts].sort((a, b) => a - b)
		const mid = Math.floor(sortedCounts.length / 2)
		const median =
			sortedCounts.length % 2 === 0
				? (sortedCounts[mid - 1] + sortedCounts[mid]) / 2
				: sortedCounts[mid]

		// Toys with data
		const toysWithData = comparisonsPerToy.filter(({ count }) => count > 0).length

		// Sort for lowest/highest (alphabetical tiebreaker)
		const sortedAsc = [...comparisonsPerToy].sort(
			(a, b) => a.count - b.count || a.toy.localeCompare(b.toy),
		)
		const sortedDesc = [...comparisonsPerToy].sort(
			(a, b) => b.count - a.count || a.toy.localeCompare(b.toy),
		)

		console.log(`${dim}:`)
		console.log(`  Total comparisons: ${totalComparisons}`)
		console.log(`  Toys with data: ${toysWithData} / ${allToys.length}`)
		console.log(`  Mean comparisons per toy: ${mean.toFixed(1)}`)
		console.log(`  Median comparisons per toy: ${median}`)

		console.log("\n  10 toys with FEWEST comparisons:")
		for (let i = 0; i < Math.min(10, sortedAsc.length); i++) {
			const { toy, count } = sortedAsc[i]
			console.log(`    ${i + 1}. ${toy}: ${count}`)
		}

		console.log("\n  10 toys with MOST comparisons:")
		for (let i = 0; i < Math.min(10, sortedDesc.length); i++) {
			const { toy, count } = sortedDesc[i]
			console.log(`    ${i + 1}. ${toy}: ${count}`)
		}

		console.log("")
	}
}

/**
 * Convert Bradley-Terry scores to Elo ratings.
 *
 * Formula: Elo = ELO_K × log₁₀(BT_score) + ELO_BASE
 *
 * Key properties:
 * - BT score of 1.0 → Elo = 1000 (exactly average)
 * - 10x BT ratio → 400 Elo difference
 * - Output is integer Elo ratings
 *
 * @param scores - Raw Bradley-Terry scores (must be > 0)
 * @param allToys - List of all toy slugs
 * @returns Map of toy slug → integer Elo rating
 */
function convertToElo(
	scores: Map<string, number>,
	allToys: string[],
): Map<string, number> {
	const eloRatings = new Map<string, number>()

	for (const toy of allToys) {
		const btScore = scores.get(toy) ?? 1.0
		// Bayesian prior ensures btScore > 0, but guard anyway
		const safeScore = Math.max(btScore, 1e-10)
		const elo = ELO_K * Math.log10(safeScore) + ELO_BASE
		// Round to integer
		eloRatings.set(toy, Math.round(elo))
	}

	return eloRatings
}

/**
 * Rating stats for dynamic color/scale thresholds.
 * Written to rating-stats.json for runtime consumption.
 */
interface RatingStats {
	computed: string
	// Distribution stats (across all values: 7 dimensions + total per toy)
	count: number
	min: number
	max: number
	mean: number
	median: number
	p5: number
	p10: number
	p25: number
	p30: number
	p70: number
	p75: number
	p90: number
	p95: number
	// Toy-level stats
	toyCount: number
	// Tier counts (based on total Elo)
	tierCounts: {
		top: number // >= p70
		middle: number // p30 to p70
		bottom: number // < p30
	}
	// Per-dimension averages
	dimensionAverages: {
		generativity: number
		developmentalLongevity: number
		productiveChallenge: number
		sensoryEngagement: number
		expressiveRange: number
		socialAffordance: number
		practicalSustainability: number
		total: number
	}
}

/**
 * Compute percentile from sorted array.
 * Uses linear interpolation for non-integer indices.
 */
function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	const index = (p / 100) * (sorted.length - 1)
	const lower = Math.floor(index)
	const upper = Math.ceil(index)
	if (lower === upper) return sorted[lower]
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

interface ToyRatings {
	slug: string
	generativity: number
	developmentalLongevity: number
	productiveChallenge: number
	sensoryEngagement: number
	expressiveRange: number
	socialAffordance: number
	practicalSustainability: number
	total: number
}

/**
 * Compute distribution stats from all rating values.
 * Includes all dimension values and totals.
 */
function computeRatingStats(allValues: number[], toyRatings: ToyRatings[]): RatingStats {
	const sorted = [...allValues].sort((a, b) => a - b)
	const sum = sorted.reduce((a, b) => a + b, 0)

	// Compute percentiles first (needed for tier counts)
	const p30 = Math.round(percentile(sorted, 30))
	const p70 = Math.round(percentile(sorted, 70))

	// Compute tier counts based on total Elo
	const tierCounts = {
		bottom: toyRatings.filter((t) => t.total < p30).length,
		middle: toyRatings.filter((t) => t.total >= p30 && t.total < p70).length,
		top: toyRatings.filter((t) => t.total >= p70).length,
	}

	// Compute per-dimension averages
	const dimensionAverages = {
		developmentalLongevity: Math.round(
			toyRatings.reduce((acc, t) => acc + t.developmentalLongevity, 0) / toyRatings.length,
		),
		expressiveRange: Math.round(
			toyRatings.reduce((acc, t) => acc + t.expressiveRange, 0) / toyRatings.length,
		),
		generativity: Math.round(
			toyRatings.reduce((acc, t) => acc + t.generativity, 0) / toyRatings.length,
		),
		practicalSustainability: Math.round(
			toyRatings.reduce((acc, t) => acc + t.practicalSustainability, 0) / toyRatings.length,
		),
		productiveChallenge: Math.round(
			toyRatings.reduce((acc, t) => acc + t.productiveChallenge, 0) / toyRatings.length,
		),
		sensoryEngagement: Math.round(
			toyRatings.reduce((acc, t) => acc + t.sensoryEngagement, 0) / toyRatings.length,
		),
		socialAffordance: Math.round(
			toyRatings.reduce((acc, t) => acc + t.socialAffordance, 0) / toyRatings.length,
		),
		total: Math.round(
			toyRatings.reduce((acc, t) => acc + t.total, 0) / toyRatings.length,
		),
	}

	return {
		computed: new Date().toISOString(),
		count: sorted.length,
		dimensionAverages,
		max: sorted[sorted.length - 1],
		mean: Math.round(sum / sorted.length),
		median: Math.round(percentile(sorted, 50)),
		min: sorted[0],
		p10: Math.round(percentile(sorted, 10)),
		p25: Math.round(percentile(sorted, 25)),
		p30,
		p5: Math.round(percentile(sorted, 5)),
		p70,
		p75: Math.round(percentile(sorted, 75)),
		p90: Math.round(percentile(sorted, 90)),
		p95: Math.round(percentile(sorted, 95)),
		tierCounts,
		toyCount: toyRatings.length,
	}
}

// Main execution
function main() {
	console.log("Computing ratings from pairwise comparisons...\n")

	const allToys = getAllToySlugs()
	console.log(`Found ${allToys.length} toys`)

	const comparisons = readComparisons()
	console.log(`Found ${comparisons.length} comparisons\n`)

	if (comparisons.length === 0) {
		console.log("No comparisons found. Creating default ratings file.")
		const header =
			"slug,generativity,developmental_longevity,productive_challenge,sensory_engagement,expressive_range,social_affordance,practical_sustainability,total"
		const lines = [header]
		for (const toy of allToys.sort()) {
			// Default Elo of 1000 (average)
			lines.push(
				`${toy},${ELO_BASE},${ELO_BASE},${ELO_BASE},${ELO_BASE},${ELO_BASE},${ELO_BASE},${ELO_BASE},${ELO_BASE}`,
			)
		}
		fs.writeFileSync(RATINGS_FILE, `${lines.join("\n")}\n`)
		console.log(`Wrote ${RATINGS_FILE}`)
		return
	}

	const stats = computeStats(comparisons)

	// Print dimension statistics
	printDimensionStats(stats, allToys)

	// Compute Elo ratings for each dimension
	const dimensionScores = new Map<Dimension, Map<string, number>>()

	for (const dim of DIMENSIONS) {
		const dimStats = stats.get(dim)
		if (!dimStats) continue
		const btScores = computeBradleyTerryScores(dimStats, allToys, 300, 1e-5, dim)
		const eloRatings = convertToElo(btScores, allToys)
		dimensionScores.set(dim, eloRatings)

		// Count toys with data
		const toysWithData = Array.from(dimStats.keys()).length
		console.log(`${dim}: ${toysWithData} toys have comparison data`)
	}

	// Write ratings CSV
	const header =
		"slug,generativity,developmental_longevity,productive_challenge,sensory_engagement,expressive_range,social_affordance,practical_sustainability,total"
	const lines = [header]

	for (const toy of allToys.sort()) {
		const gen = dimensionScores.get("generativity")?.get(toy) ?? ELO_BASE
		const dev = dimensionScores.get("developmental_longevity")?.get(toy) ?? ELO_BASE
		const prod = dimensionScores.get("productive_challenge")?.get(toy) ?? ELO_BASE
		const sens = dimensionScores.get("sensory_engagement")?.get(toy) ?? ELO_BASE
		const expr = dimensionScores.get("expressive_range")?.get(toy) ?? ELO_BASE
		const soc = dimensionScores.get("social_affordance")?.get(toy) ?? ELO_BASE
		const prac = dimensionScores.get("practical_sustainability")?.get(toy) ?? ELO_BASE
		// Total = arithmetic mean of dimension Elos (same scale as dimensions)
		const total = Math.round((gen + dev + prod + sens + expr + soc + prac) / 7)

		lines.push(`${toy},${gen},${dev},${prod},${sens},${expr},${soc},${prac},${total}`)
	}

	fs.writeFileSync(RATINGS_FILE, `${lines.join("\n")}\n`)
	console.log(`\nWrote Elo ratings to ${RATINGS_FILE}`)

	// Collect all rating values and toy-level ratings for stats computation
	const allRatingValues: number[] = []
	const toyRatings: ToyRatings[] = []
	for (const toy of allToys) {
		const gen = dimensionScores.get("generativity")?.get(toy) ?? ELO_BASE
		const dev = dimensionScores.get("developmental_longevity")?.get(toy) ?? ELO_BASE
		const prod = dimensionScores.get("productive_challenge")?.get(toy) ?? ELO_BASE
		const sens = dimensionScores.get("sensory_engagement")?.get(toy) ?? ELO_BASE
		const expr = dimensionScores.get("expressive_range")?.get(toy) ?? ELO_BASE
		const soc = dimensionScores.get("social_affordance")?.get(toy) ?? ELO_BASE
		const prac = dimensionScores.get("practical_sustainability")?.get(toy) ?? ELO_BASE
		const total = Math.round((gen + dev + prod + sens + expr + soc + prac) / 7)
		allRatingValues.push(gen, dev, prod, sens, expr, soc, prac, total)
		toyRatings.push({
			developmentalLongevity: dev,
			expressiveRange: expr,
			generativity: gen,
			practicalSustainability: prac,
			productiveChallenge: prod,
			sensoryEngagement: sens,
			slug: toy,
			socialAffordance: soc,
			total,
		})
	}

	// Compute and write rating stats
	const ratingStats = computeRatingStats(allRatingValues, toyRatings)
	fs.writeFileSync(RATING_STATS_FILE, JSON.stringify(ratingStats, null, "\t"))
	console.log(`Wrote rating stats to ${RATING_STATS_FILE}`)
	console.log(`  Distribution: min=${ratingStats.min} p30=${ratingStats.p30} median=${ratingStats.median} p70=${ratingStats.p70} max=${ratingStats.max}`)
	console.log(`  Tiers: top=${ratingStats.tierCounts.top} middle=${ratingStats.tierCounts.middle} bottom=${ratingStats.tierCounts.bottom}`)

	// Print some stats
	const sortedByTotal = allToys
		.map((toy) => {
			const gen = dimensionScores.get("generativity")?.get(toy) ?? ELO_BASE
			const dev =
				dimensionScores.get("developmental_longevity")?.get(toy) ?? ELO_BASE
			const prod = dimensionScores.get("productive_challenge")?.get(toy) ?? ELO_BASE
			const sens = dimensionScores.get("sensory_engagement")?.get(toy) ?? ELO_BASE
			const expr = dimensionScores.get("expressive_range")?.get(toy) ?? ELO_BASE
			const soc = dimensionScores.get("social_affordance")?.get(toy) ?? ELO_BASE
			const prac =
				dimensionScores.get("practical_sustainability")?.get(toy) ?? ELO_BASE
			// Mean of 7 dimension Elos
			const total = Math.round((gen + dev + prod + sens + expr + soc + prac) / 7)
			return { total, toy }
		})
		.sort((a, b) => b.total - a.total)

	console.log("\nTop 10 toys by mean Elo:")
	for (let i = 0; i < Math.min(10, sortedByTotal.length); i++) {
		const { toy, total } = sortedByTotal[i]
		// Win probability vs average toy
		const winProb = 1 / (1 + 10 ** ((ELO_BASE - total) / ELO_K))
		console.log(
			`  ${i + 1}. ${toy}: ${total} (${Math.round(winProb * 100)}% win rate vs avg)`,
		)
	}
}

main()
