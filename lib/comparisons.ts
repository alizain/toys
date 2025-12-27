import "server-only"

import fs from "node:fs"
import path from "node:path"

// Re-export client-safe types and constants from dimensions.ts
export {
	type Comparison,
	DIMENSIONS,
	type Dimension,
	type DimensionInfo,
	VALID_DIMENSIONS,
} from "./dimensions"

import { type Comparison, type Dimension, VALID_DIMENSIONS } from "./dimensions"

// Use process.cwd() which points to the package root in Next.js
function getPackageRoot(): string {
	const dir = process.cwd()

	// If we're in the monorepo root, navigate to packages/toys
	if (fs.existsSync(path.join(dir, "packages/toys/toys"))) {
		return path.join(dir, "packages/toys")
	}

	return dir
}

const PACKAGE_ROOT = getPackageRoot()
const COMPARISONS_FILE = path.join(PACKAGE_ROOT, "comparisons.csv")

export function ensureComparisonsFile(): void {
	if (!fs.existsSync(COMPARISONS_FILE)) {
		fs.writeFileSync(COMPARISONS_FILE, "dimension,toy_a,toy_b,winner,timestamp\n")
	}
}

export function appendComparison(comparison: Comparison): void {
	ensureComparisonsFile()
	const line = `${comparison.dimension},${comparison.toyA},${comparison.toyB},${comparison.winner},${comparison.timestamp}\n`
	fs.appendFileSync(COMPARISONS_FILE, line)
}

export function getExistingComparisons(): Comparison[] {
	if (!fs.existsSync(COMPARISONS_FILE)) {
		return []
	}

	const content = fs.readFileSync(COMPARISONS_FILE, "utf-8")
	const lines = content.trim().split("\n")

	const comparisons: Comparison[] = []
	for (let i = 1; i < lines.length; i++) {
		const [dimension, toyA, toyB, winner, timestamp] = lines[i].split(",")
		if (dimension && toyA && toyB && winner) {
			comparisons.push({
				dimension: dimension as Dimension,
				timestamp: timestamp || "",
				toyA,
				toyB,
				winner,
			})
		}
	}

	return comparisons
}

export function getComparisonKey(
	dimension: Dimension,
	toyA: string,
	toyB: string,
): string {
	// Normalize the key so A vs B and B vs A are the same
	const [first, second] = [toyA, toyB].sort()
	return `${dimension}:${first}:${second}`
}

export interface SaveComparisonInput {
	dimension: string
	toyA: string
	toyB: string
	winner: string // toyA slug, toyB slug, or "tie"
}

export type SaveComparisonResult = { success: true } | { success: false; error: string }

export function saveComparison(input: SaveComparisonInput): SaveComparisonResult {
	const { dimension, toyA, toyB, winner } = input

	// Validate all fields present
	if (!dimension || !toyA || !toyB || !winner) {
		return { error: "Missing required fields", success: false }
	}

	// Validate dimension
	if (!VALID_DIMENSIONS.includes(dimension as Dimension)) {
		return {
			error: `Invalid dimension: ${dimension}. Must be one of: ${VALID_DIMENSIONS.join(", ")}`,
			success: false,
		}
	}

	// Validate winner is toyA, toyB, or "tie"
	if (winner !== toyA && winner !== toyB && winner !== "tie") {
		return {
			error: `Invalid winner: ${winner}. Must be "${toyA}", "${toyB}", or "tie"`,
			success: false,
		}
	}

	// Append to CSV
	appendComparison({
		dimension: dimension as Dimension,
		timestamp: new Date().toISOString(),
		toyA,
		toyB,
		winner,
	})

	return { success: true }
}
