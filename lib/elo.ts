/**
 * Elo rating utilities for toy display.
 *
 * Key properties:
 * - Elo 1000 = average toy
 * - 400 point difference = 10x skill ratio = 91% win probability
 *
 * These constants are duplicated from scripts/compute-ratings.ts
 * to avoid importing build scripts into runtime code.
 */

// Keep in sync with scripts/compute-ratings.ts
export const ELO_K = 400 // Scale factor: 400 pts = 10x skill ratio
export const ELO_BASE = 1000 // Average toy rating

/**
 * Calculate win probability against an average toy (Elo 1000).
 *
 * Formula: P(win) = 1 / (1 + 10^((1000 - elo) / 400))
 *
 * @param elo - The toy's Elo rating
 * @returns Win probability as 0-1 (e.g., 0.76 for Elo 1200)
 */
export function eloToWinProbability(elo: number): number {
	return 1 / (1 + 10 ** ((ELO_BASE - elo) / ELO_K))
}

/**
 * Map Elo to a bar percentage for visualization.
 *
 * Range: 600 → 0%, 1000 → 50%, 1400 → 100%
 * Values outside this range are clamped.
 *
 * @param elo - The toy's Elo rating
 * @returns Percentage for bar width (0-100)
 */
export function eloToBarPercentage(elo: number): number {
	// Range spans 800 points (600 to 1400)
	return Math.max(0, Math.min(100, ((elo - 600) / 800) * 100))
}

/**
 * Get Tailwind gradient classes for Elo-based coloring.
 *
 * @param elo - The toy's Elo rating
 * @returns Tailwind gradient classes for backgrounds
 */
export function getEloColor(elo: number): string {
	if (elo >= 1200) return "from-emerald-500 to-teal-600" // Excellent
	if (elo >= 1000) return "from-amber-500 to-orange-500" // Above average
	return "from-rose-400 to-pink-500" // Below average
}

/**
 * Get solid Tailwind color class for Elo (for bars).
 *
 * @param elo - The toy's Elo rating
 * @returns Tailwind solid background class
 */
export function getEloBarColor(elo: number): string {
	if (elo >= 1200) return "bg-emerald-500" // Excellent
	if (elo >= 1000) return "bg-amber-500" // Above average
	return "bg-rose-400" // Below average
}

/**
 * Get a descriptive label for an Elo rating.
 *
 * @param elo - The toy's Elo rating
 * @returns Human-readable tier label
 */
export function getEloLabel(elo: number): string {
	if (elo >= 1300) return "Elite"
	if (elo >= 1200) return "Excellent"
	if (elo >= 1100) return "Above Average"
	if (elo >= 1000) return "Average"
	if (elo >= 900) return "Below Average"
	return "Poor"
}

/**
 * Format win probability for display.
 *
 * @param elo - The toy's Elo rating
 * @returns Formatted string like "76%"
 */
export function formatWinProbability(elo: number): string {
	const prob = eloToWinProbability(elo)
	return `${Math.round(prob * 100)}%`
}
