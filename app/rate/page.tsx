import { DIMENSIONS, getComparisonKey, getExistingComparisons } from "@/lib/comparisons"
import { getToys, isVersioned } from "@/lib/toys"
import { RatingHarness } from "./rating-harness"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function RatePage() {
	const allToys = await getToys()
	const toys = allToys.filter(isVersioned)
	const existingComparisons = getExistingComparisons()

	// Build a set of already-compared pairs
	const comparedPairs = new Set(
		existingComparisons.map((c) => getComparisonKey(c.dimension, c.toyA, c.toyB)),
	)

	// Prepare toy data for client - include full content
	const toyData = toys.map((t) => ({
		content: t.content,
		link: t.link,
		name: t.name,
		slug: t.slug,
	}))

	return (
		<RatingHarness
			toys={toyData}
			comparedPairs={Array.from(comparedPairs)}
			dimensions={DIMENSIONS}
		/>
	)
}
