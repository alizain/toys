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

import ratingStats from "../rating-stats.json"

// Keep in sync with scripts/compute-ratings.ts
export const ELO_K = 400 // Scale factor: 400 pts = 10x skill ratio
export const ELO_BASE = 1000 // Average toy rating

// Export stats for use in other components (e.g., filter panel)
export { ratingStats }

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
 * Uses actual data distribution:
 * - p5 → 0%
 * - median → 50%
 * - p95 → 100%
 *
 * Values outside this range are clamped.
 *
 * @param elo - The toy's Elo rating
 * @returns Percentage for bar width (0-100)
 */
export function eloToBarPercentage(elo: number): number {
	const { p5, median, p95 } = ratingStats

	if (elo <= median) {
		// Map p5 → 0%, median → 50%
		const range = median - p5
		if (range === 0) return 50
		return Math.max(0, ((elo - p5) / range) * 50)
	} else {
		// Map median → 50%, p95 → 100%
		const range = p95 - median
		if (range === 0) return 50
		return Math.min(100, 50 + ((elo - median) / range) * 50)
	}
}

/**
 * Get Tailwind gradient classes for Elo-based coloring.
 *
 * Uses percentile-based thresholds:
 * - Top 30% (above p70): emerald/teal
 * - Middle 40% (p30-p70): amber/orange
 * - Bottom 30% (below p30): rose/pink
 *
 * @param elo - The toy's Elo rating
 * @returns Tailwind gradient classes for backgrounds
 */
export function getEloColor(elo: number): string {
	const { p30, p70 } = ratingStats

	if (elo >= p70) return "from-emerald-500 to-teal-600" // Top 30%
	if (elo >= p30) return "from-amber-500 to-orange-500" // Middle 40%
	return "from-rose-400 to-pink-500" // Bottom 30%
}

/**
 * Get solid Tailwind color class for Elo (for bars).
 *
 * Uses same percentile thresholds as getEloColor.
 *
 * @param elo - The toy's Elo rating
 * @returns Tailwind solid background class
 */
export function getEloBarColor(elo: number): string {
	const { p30, p70 } = ratingStats

	if (elo >= p70) return "bg-emerald-500" // Top 30%
	if (elo >= p30) return "bg-amber-500" // Middle 40%
	return "bg-rose-400" // Bottom 30%
}

/**
 * Get a descriptive label for an Elo rating.
 *
 * Uses percentile-based thresholds for meaningful labels.
 *
 * @param elo - The toy's Elo rating
 * @returns Human-readable tier label
 */
export function getEloLabel(elo: number): string {
	const { p10, p25, p75, p90 } = ratingStats

	if (elo >= p90) return "Excellent"
	if (elo >= p75) return "Good"
	if (elo >= p25) return "Average"
	if (elo >= p10) return "Below Average"
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
