import { program } from "commander"
import { type Dimension, saveComparison, VALID_DIMENSIONS } from "../lib/comparisons"

program
	.name("save-vote")
	.description("Save a single comparison vote")
	.argument("<dimension>", "Dimension being compared")
	.argument("<toyA>", "First toy slug")
	.argument("<toyB>", "Second toy slug")
	.argument("<winner>", "Winner: toyA slug, toyB slug, or 'tie'")
	.parse()

const [dimension, toyA, toyB, winner] = program.args

// Validate dimension
if (!VALID_DIMENSIONS.includes(dimension as Dimension)) {
	console.error(`Invalid dimension: ${dimension}`)
	console.error(`Valid dimensions: ${VALID_DIMENSIONS.join(", ")}`)
	process.exit(1)
}

// Validate winner
if (winner !== toyA && winner !== toyB && winner !== "tie") {
	console.error(`Invalid winner: ${winner}`)
	console.error(`Must be "${toyA}", "${toyB}", or "tie"`)
	process.exit(1)
}

const result = saveComparison({ dimension, toyA, toyB, winner })

if (result.success) {
	console.log(`Saved: ${dimension} | ${toyA} vs ${toyB} → ${winner}`)
} else {
	console.error(`Failed to save: ${result.error}`)
	process.exit(1)
}
