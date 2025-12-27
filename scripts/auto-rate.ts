import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import cliProgress from "cli-progress"
import { program } from "commander"
import pLimit from "p-limit"
import {
	type Dimension,
	type DimensionInfo,
	saveComparison,
	VALID_DIMENSIONS,
} from "../lib/comparisons"

type Provider = "claude" | "codex"

interface CliOptions {
	concurrency: number
	dryRun: boolean
	dimension?: string
	limit: number
	verbose: boolean
	model?: string
	provider: Provider
}

program
	.name("auto-rate")
	.description("Automatically rate toys using LLM pairwise comparisons")
	.option("-c, --concurrency <n>", "Number of parallel calls", "3")
	.option("-n, --dry-run", "Show what would be rated without calling LLM")
	.option("-v, --verbose", "Show LLM CLI output in real-time")
	.option("-d, --dimension <name>", "Only rate one dimension")
	.option("-l, --limit <n>", "Pairs per batch (default: 40)", "40")
	.option("-m, --model <name>", "Model to use (e.g., haiku for claude, o3 for codex)")
	.option("-p, --provider <name>", "LLM provider: claude or codex", "claude")
	.parse()

const opts = program.opts()

const options: CliOptions = {
	concurrency: Number.parseInt(opts.concurrency, 10),
	dimension: opts.dimension,
	dryRun: opts.dryRun ?? false,
	limit: Number.parseInt(opts.limit, 10),
	model: opts.model,
	provider: opts.provider as Provider,
	verbose: opts.verbose ?? false,
}

// Validate provider
if (options.provider !== "claude" && options.provider !== "codex") {
	console.error(`Invalid provider: ${options.provider}. Must be "claude" or "codex"`)
	process.exit(1)
}

// Validate dimension if provided
if (options.dimension && !VALID_DIMENSIONS.includes(options.dimension as Dimension)) {
	console.error(`Invalid dimension: ${options.dimension}`)
	console.error(`Valid dimensions: ${VALID_DIMENSIONS.join(", ")}`)
	process.exit(1)
}

// Types for prepare-dimension output
interface PreparedBatch {
	selectedDimension: DimensionInfo & { medianComparisons: number }
	allDimensionsOverview: {
		key: Dimension
		medianComparisons: number
		totalComparisons: number
	}[]
	pairs: { toyA: string; toyB: string }[]
	toys: { slug: string; name: string; content: string }[]
	stats: {
		pairsInBatch: number
		uniqueToysInBatch: number
		totalToys: number
		allComplete: boolean
	}
	connectivity: {
		initial: {
			componentCount: number
			articulationPointCount: number
			zeroConnectionToys: number
		}
		final: {
			componentCount: number
			articulationPointCount: number
		}
		phaseCounts: {
			bridgePairs: number
			strengthenPairs: number
			coveragePairs: number
		}
	}
}

// Call prepare-dimension.ts and parse output
function getPreparedBatch(limit: number, dimension?: string): PreparedBatch {
	const args = ["tsx", "packages/toys/scripts/prepare-dimension.ts", "-l", String(limit)]
	if (dimension) {
		args.push("-d", dimension)
	}

	const result = spawnSync("npx", args, {
		cwd: process.cwd(),
		encoding: "utf-8",
	})

	if (result.status !== 0) {
		throw new Error(`prepare-dimension failed: ${result.stderr}`)
	}

	return JSON.parse(result.stdout) as PreparedBatch
}

// Lookup toy by slug from batch
interface ToyInfo {
	slug: string
	name: string
	content: string
}

function getToyBySlug(toys: ToyInfo[], slug: string): ToyInfo {
	const toy = toys.find((t) => t.slug === slug)
	if (!toy) {
		throw new Error(`Toy not found: ${slug}`)
	}
	return toy
}

// Build the markdown prompt using batch data
function buildPrompt(dimension: DimensionInfo, toyA: ToyInfo, toyB: ToyInfo): string {
	const scoringGuideText = dimension.scoringGuide
		.map(
			(sg: { score: number; description: string }) => `- ${sg.score}: ${sg.description}`,
		)
		.join("\n")

	const keyQuestionsText = dimension.keyQuestions.map((q: string) => `- ${q}`).join("\n")

	return `# Toy Comparison: ${dimension.label}

## Dimension
${dimension.question}

## Description
${dimension.description}

## Key Questions
${keyQuestionsText}

## Scoring Guide
${scoringGuideText}

---

## Toy A: ${toyA.name}
${toyA.content}

## Toy B: ${toyB.name}
${toyB.content}

---

Which toy scores higher on ${dimension.label}?
Reply with "a" if Toy A scores higher, "b" if Toy B scores higher, or "tie" if they're roughly equal.`
}

// JSON schema for Claude's response
const JSON_SCHEMA = JSON.stringify({
	properties: {
		winner: {
			enum: ["a", "b", "tie"],
			type: "string",
		},
	},
	required: ["winner"],
	type: "object",
})

// Run Claude CLI and get response
async function runClaude(
	prompt: string,
	verbose: boolean,
	model: string | null,
): Promise<{ winner: "a" | "b" | "tie" }> {
	return new Promise((resolve, reject) => {
		const args = ["-p", "--output-format", "json", "--json-schema", JSON_SCHEMA, prompt]
		if (model) {
			args.unshift("--model", model)
		}
		if (verbose) {
			args.unshift("--verbose", "--debug")
		}
		// In verbose mode, inherit stderr directly for real-time debug output
		const child = spawn("claude", args, {
			env: { ...process.env },
			stdio: ["pipe", "pipe", verbose ? "inherit" : "pipe"],
		})

		let stdout = ""
		let stderr = ""

		child.stdout?.on("data", (data) => {
			const chunk = data.toString()
			stdout += chunk
			if (verbose) {
				process.stdout.write(chunk)
			}
		})

		// Only capture stderr if not in verbose mode (otherwise it's inherited)
		if (!verbose) {
			child.stderr?.on("data", (data) => {
				const chunk = data.toString()
				stderr += chunk
			})
		}

		child.on("error", (error) => {
			reject(new Error(`Failed to spawn claude: ${error.message}`))
		})

		child.on("close", (code) => {
			if (code !== 0) {
				reject(
					new Error(
						`Claude CLI exited with code ${code}\nstderr: ${stderr}\nstdout: ${stdout}`,
					),
				)
				return
			}

			try {
				const parsed = JSON.parse(stdout)
				// With --json-schema, output is in structured_output field
				let result: { winner: "a" | "b" | "tie" }

				if (parsed.structured_output) {
					// --json-schema puts validated JSON in structured_output
					result = parsed.structured_output
				} else if (parsed.winner) {
					// Direct result (fallback)
					result = parsed
				} else {
					throw new Error(`Unexpected response structure: ${stdout}`)
				}

				if (!["a", "b", "tie"].includes(result.winner)) {
					throw new Error(`Invalid winner value: ${result.winner}`)
				}

				resolve(result)
			} catch (error) {
				reject(
					new Error(`Failed to parse Claude response: ${error}\nRaw output: ${stdout}`),
				)
			}
		})
	})
}

// JSON schema object for Codex (needs to be written to a file)
// OpenAI requires additionalProperties: false
const JSON_SCHEMA_OBJ = {
	additionalProperties: false,
	properties: {
		winner: {
			enum: ["a", "b", "tie"],
			type: "string",
		},
	},
	required: ["winner"],
	type: "object",
}

// Run Codex CLI and get response
async function runCodex(
	prompt: string,
	verbose: boolean,
	model: string | null,
): Promise<{ winner: "a" | "b" | "tie" }> {
	// Write schema to temp file (codex requires a file path)
	const schemaPath = path.join(os.tmpdir(), `auto-rate-schema-${Date.now()}.json`)
	const outputPath = path.join(os.tmpdir(), `auto-rate-output-${Date.now()}.txt`)
	fs.writeFileSync(schemaPath, JSON.stringify(JSON_SCHEMA_OBJ))

	return new Promise((resolve, reject) => {
		const args = [
			"exec",
			"--full-auto",
			"--model",
			model ?? "gpt-5.2", // Default to best available model
			"--output-schema",
			schemaPath,
			"-o",
			outputPath,
			prompt,
		]
		if (verbose) {
			args.push("--json") // Output events as JSONL for verbose mode
		}

		// In verbose mode, inherit stderr directly for real-time debug output
		const child = spawn("codex", args, {
			env: { ...process.env },
			stdio: ["pipe", verbose ? "inherit" : "pipe", verbose ? "inherit" : "pipe"],
		})

		let stdout = ""
		let stderr = ""

		if (!verbose) {
			child.stdout?.on("data", (data) => {
				stdout += data.toString()
			})
			child.stderr?.on("data", (data) => {
				stderr += data.toString()
			})
		}

		child.on("error", (error) => {
			// Clean up temp files
			try {
				fs.unlinkSync(schemaPath)
			} catch {}
			try {
				fs.unlinkSync(outputPath)
			} catch {}
			reject(new Error(`Failed to spawn codex: ${error.message}`))
		})

		child.on("close", (code) => {
			// Clean up schema file
			try {
				fs.unlinkSync(schemaPath)
			} catch {}

			if (code !== 0) {
				try {
					fs.unlinkSync(outputPath)
				} catch {}
				reject(
					new Error(
						`Codex CLI exited with code ${code}\nstderr: ${stderr}\nstdout: ${stdout}`,
					),
				)
				return
			}

			try {
				// Read output from file
				const output = fs.readFileSync(outputPath, "utf-8").trim()
				fs.unlinkSync(outputPath)

				// Parse the JSON response
				const result = JSON.parse(output) as { winner: "a" | "b" | "tie" }

				if (!["a", "b", "tie"].includes(result.winner)) {
					throw new Error(`Invalid winner value: ${result.winner}`)
				}

				resolve(result)
			} catch (error) {
				try {
					fs.unlinkSync(outputPath)
				} catch {}
				reject(new Error(`Failed to parse Codex response: ${error}\nstdout: ${stdout}`))
			}
		})
	})
}

// Unified LLM runner that dispatches to the right provider
async function runLLM(
	prompt: string,
	provider: Provider,
	verbose: boolean,
	model: string | null,
): Promise<{ winner: "a" | "b" | "tie" }> {
	if (provider === "codex") {
		return runCodex(prompt, verbose, model)
	}
	return runClaude(prompt, verbose, model)
}

// Pair info for tracking current work
interface PairInfo {
	dimension: string
	toyA: string
	toyB: string
}

// Process a single comparison using batch data
async function processComparison(
	batch: PreparedBatch,
	pair: { toyA: string; toyB: string },
	provider: Provider,
	verbose: boolean,
	model: string | undefined,
): Promise<void> {
	const toyA = getToyBySlug(batch.toys, pair.toyA)
	const toyB = getToyBySlug(batch.toys, pair.toyB)
	const dimension = batch.selectedDimension

	if (verbose) {
		console.log(`\n--- Comparing: ${toyA.name} vs ${toyB.name} (${dimension.key}) ---\n`)
	}

	const prompt = buildPrompt(dimension, toyA, toyB)
	const response = await runLLM(prompt, provider, verbose, model ?? null)

	// Map a/b/tie to actual values
	let winner: string
	if (response.winner === "a") {
		winner = pair.toyA
	} else if (response.winner === "b") {
		winner = pair.toyB
	} else {
		winner = "tie"
	}

	if (verbose) {
		console.log(`\n--- Result: ${response.winner} (${winner}) ---\n`)
	}

	const result = saveComparison({
		dimension: dimension.key,
		toyA: pair.toyA,
		toyB: pair.toyB,
		winner,
	})

	if (!result.success) {
		throw new Error(`Failed to save comparison: ${result.error}`)
	}
}

// Main function - processes batches until complete
async function main() {
	const startTime = Date.now()
	let totalCompleted = 0

	console.log(`Using provider: ${options.provider}`)
	if (options.model) {
		console.log(`Using model: ${options.model}`)
	}
	console.log(`Batch size: ${options.limit}`)
	if (options.dimension) {
		console.log(`Dimension: ${options.dimension}`)
	}
	console.log("")

	// Batch loop - prepare-dimension recalculates connectivity each time
	let batchNumber = 0
	while (true) {
		batchNumber++
		console.log(`\n=== Batch ${batchNumber} ===`)
		console.log("Fetching pairs from prepare-dimension...")

		const batch = getPreparedBatch(options.limit, options.dimension)

		// Show dimension overview
		console.log("\nDimension coverage (median comparisons):")
		for (const dim of batch.allDimensionsOverview) {
			const marker = dim.key === batch.selectedDimension.key ? "→" : " "
			console.log(
				`  ${marker} ${dim.key}: ${dim.medianComparisons} (${dim.totalComparisons} total)`,
			)
		}

		// Check if all complete
		if (batch.stats.allComplete) {
			console.log("\nAll comparisons complete!")
			break
		}

		console.log(
			`\nSelected: ${batch.selectedDimension.key} (${batch.selectedDimension.label})`,
		)
		console.log(`Pairs in batch: ${batch.stats.pairsInBatch}`)
		console.log(`Unique toys: ${batch.stats.uniqueToysInBatch}/${batch.stats.totalToys}`)
		console.log(
			`Connectivity: ${batch.connectivity.phaseCounts.bridgePairs} bridge, ` +
				`${batch.connectivity.phaseCounts.strengthenPairs} strengthen, ` +
				`${batch.connectivity.phaseCounts.coveragePairs} coverage`,
		)

		if (batch.pairs.length === 0) {
			console.log("No pairs to process in this batch.")
			break
		}

		// Dry run mode
		if (options.dryRun) {
			console.log("\n=== DRY RUN ===")
			console.log(`Would process ${batch.pairs.length} comparisons`)
			console.log("\nFirst 5 pairs:")
			for (const pair of batch.pairs.slice(0, 5)) {
				const toyA = getToyBySlug(batch.toys, pair.toyA)
				const toyB = getToyBySlug(batch.toys, pair.toyB)
				console.log(`  - ${toyA.name} vs ${toyB.name}`)
			}
			return
		}

		// Set up progress bar (skip in verbose mode to avoid interference)
		const progressBar = options.verbose
			? null
			: new cliProgress.SingleBar(
					{
						format: `Batch ${batchNumber} [{bar}] {percentage}% | {value}/{total} | {rate}/sec | ETA: {eta_formatted}`,
						hideCursor: true,
					},
					cliProgress.Presets.shades_classic,
				)
		progressBar?.start(batch.pairs.length, 0)

		// Set up concurrency limiter
		const limit = pLimit(options.concurrency)

		let completed = 0
		let currentPair: PairInfo | null = null

		try {
			const tasks = batch.pairs.map((pair) =>
				limit(async () => {
					currentPair = {
						dimension: batch.selectedDimension.key,
						toyA: pair.toyA,
						toyB: pair.toyB,
					}
					await processComparison(
						batch,
						pair,
						options.provider,
						options.verbose,
						options.model,
					)
					completed++
					totalCompleted++
					progressBar?.update(completed)
				}),
			)

			await Promise.all(tasks)
		} catch (error) {
			progressBar?.stop()
			console.error("\n\n=== AUTO-RATE FAILED ===")
			if (currentPair) {
				console.error("Pair:", currentPair)
			}
			console.error("Error:", error)
			console.error(
				"\nResume by re-running the script (already-completed pairs are skipped)",
			)
			process.exit(1)
		}

		progressBar?.stop()
		console.log(`Batch ${batchNumber} complete: ${completed} comparisons`)
	}

	// Summary
	const elapsed = (Date.now() - startTime) / 1000
	console.log(`\n=== DONE ===`)
	console.log(`Completed ${totalCompleted} comparisons in ${elapsed.toFixed(1)}s`)
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
