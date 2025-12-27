import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import cliProgress from "cli-progress"
import { program } from "commander"
import matter from "gray-matter"
import pLimit from "p-limit"

interface CliOptions {
	concurrency: number
	dryRun: boolean
	limit?: number
	verbose: boolean
	model?: string
	filter?: string
}

program
	.name("generate-pages")
	.description("Generate factual markdown pages for toys using LLM")
	.option("-c, --concurrency <n>", "Number of parallel calls", "3")
	.option("-n, --dry-run", "Show what would be generated without calling LLM")
	.option("-v, --verbose", "Show LLM CLI output in real-time")
	.option("-l, --limit <n>", "Stop after n toys")
	.option("-m, --model <name>", "Model to use (default: gpt-5.2)")
	.option("-f, --filter <slug>", "Only generate for toys matching this slug pattern")
	.parse()

const opts = program.opts()

const options: CliOptions = {
	concurrency: Number.parseInt(opts.concurrency, 10),
	dryRun: opts.dryRun ?? false,
	filter: opts.filter,
	limit: opts.limit ? Number.parseInt(opts.limit, 10) : undefined,
	model: opts.model,
	verbose: opts.verbose ?? false,
}

// Toy info from existing files
interface ToyInfo {
	slug: string
	name: string
	link: string
	filePath: string
	hasGeneratedAt: boolean
}

function getPackageRoot(): string {
	const dir = process.cwd()
	if (fs.existsSync(path.join(dir, "packages/toys/toys"))) {
		return path.join(dir, "packages/toys")
	}
	return dir
}

function loadToys(): ToyInfo[] {
	const packageRoot = getPackageRoot()
	const toysFolder = path.join(packageRoot, "toys")

	if (!fs.existsSync(toysFolder)) {
		throw new Error(`Toys folder not found: ${toysFolder}`)
	}

	const toyFolders = fs.readdirSync(toysFolder).filter((f) => {
		const toyPath = path.join(toysFolder, f)
		return (
			fs.statSync(toyPath).isDirectory() && fs.existsSync(path.join(toyPath, "index.md"))
		)
	})

	return toyFolders.map((folderName) => {
		const filePath = path.join(toysFolder, folderName, "index.md")
		const fileContent = fs.readFileSync(filePath, "utf-8")
		const slug = folderName

		try {
			const { data } = matter(fileContent)
			return {
				filePath,
				hasGeneratedAt: !!data.generated_at,
				link: data.link || "",
				name: data.name || slug,
				slug,
			}
		} catch {
			// Fallback for files with YAML parsing issues
			const lines = fileContent.split("\n")
			let name = slug
			let link = ""

			if (lines[0] === "---") {
				for (let i = 1; i < lines.length; i++) {
					if (lines[i] === "---") {
						break
					}
					if (lines[i].startsWith("name:")) {
						name = lines[i].substring(5).trim()
					}
					if (lines[i].startsWith("link:")) {
						link = lines[i].substring(5).trim()
					}
				}
			}

			return {
				filePath,
				hasGeneratedAt: false,
				link,
				name,
				slug,
			}
		}
	})
}

// Build the prompt for generating a toy page
function buildPrompt(toy: ToyInfo): string {
	return `You are writing a factual reference page about a toy for a toy database. Your goal is to provide objective information that helps understand what this toy is and how children interact with it.

Toy: ${toy.name}
Manufacturer link: ${toy.link}

Output a complete markdown file with YAML frontmatter and body.

FRONTMATTER (between --- markers):
- name: the toy name
- link: ${toy.link}
- age_range: manufacturer's recommended age (e.g. "3+", "6-12", "1-3")
- price_range: typical retail price range (e.g. "$20-40", "$50-150")

BODY SECTIONS (use ## headings):

Start with 2-3 factual sentences describing what this toy is (no heading needed for this intro).

## What's Included
Describe what comes in the box - pieces, components, accessories. Be specific about quantities and types where known.

## Materials
List what the toy is made of - plastics, wood, metal, fabric, electronics, etc.

## How Kids Play
Describe observable play patterns - what do children actually do with this toy? List specific activities, not judgments about quality.

## Variants
If applicable, list different versions, sizes, or editions. Include notable competing/alternative brands if relevant.

IMPORTANT GUIDELINES:
- Be factual and objective
- Do NOT rate, judge, or evaluate the toy
- Do NOT use phrases like "great for", "perfect for", "excellent", etc.
- Focus on what the toy IS, not how good it is
- If you don't know something, omit it rather than guess`
}

// Run Codex CLI and get markdown response
async function runCodex(
	prompt: string,
	verbose: boolean,
	model: string | null,
): Promise<string> {
	// Write prompt to temp file for codex
	const outputPath = path.join(os.tmpdir(), `generate-pages-output-${Date.now()}.txt`)

	return new Promise((resolve, reject) => {
		const args = [
			"exec",
			"--dangerously-bypass-approvals-and-sandbox",
			"--model",
			model ?? "gpt-5.2",
			"-o",
			outputPath,
			prompt,
		]

		// In verbose mode, inherit stderr/stdout for real-time output
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
			try {
				fs.unlinkSync(outputPath)
			} catch {}
			reject(new Error(`Failed to spawn codex: ${error.message}`))
		})

		child.on("close", (code) => {
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
				resolve(output)
			} catch (error) {
				try {
					fs.unlinkSync(outputPath)
				} catch {}
				reject(new Error(`Failed to read Codex output: ${error}\nstdout: ${stdout}`))
			}
		})
	})
}

// Parse and validate the generated markdown, inject generated_at
function processGeneratedMarkdown(markdown: string): string {
	// Try to parse as frontmatter + content
	const { data, content } = matter(markdown)

	// Validate required frontmatter fields
	if (!data.name) {
		throw new Error("Generated markdown missing 'name' in frontmatter")
	}
	if (!data.link) {
		throw new Error("Generated markdown missing 'link' in frontmatter")
	}

	// Add generated_at timestamp
	data.generated_at = new Date().toISOString()

	// Reconstruct markdown with updated frontmatter
	return matter.stringify(content, data)
}

// Process a single toy
async function processToy(
	toy: ToyInfo,
	verbose: boolean,
	model: string | undefined,
): Promise<void> {
	if (verbose) {
		console.log(`\n--- Generating page for: ${toy.name} ---\n`)
	}

	const prompt = buildPrompt(toy)
	const generatedMarkdown = await runCodex(prompt, verbose, model ?? null)

	// Process and validate the generated markdown
	const finalMarkdown = processGeneratedMarkdown(generatedMarkdown)

	// Write to file
	fs.writeFileSync(toy.filePath, finalMarkdown)

	if (verbose) {
		console.log(`\n--- Wrote: ${toy.filePath} ---\n`)
	}
}

// Main function
async function main() {
	const startTime = Date.now()

	console.log("Loading toys...")
	let toys = loadToys()
	console.log(`Found ${toys.length} toys`)

	// Filter out toys that already have generated_at
	const alreadyGenerated = toys.filter((t) => t.hasGeneratedAt).length
	toys = toys.filter((t) => !t.hasGeneratedAt)
	console.log(`Skipping ${alreadyGenerated} already-generated toys`)
	console.log(`${toys.length} toys remaining`)

	// Apply slug filter if specified
	if (options.filter) {
		toys = toys.filter((t) => t.slug.includes(options.filter as string))
		console.log(`Filtered to ${toys.length} toys matching "${options.filter}"`)
	}

	// Apply limit if specified
	if (options.limit) {
		toys = toys.slice(0, options.limit)
		console.log(`Limited to ${toys.length} toys`)
	}

	if (toys.length === 0) {
		console.log("No toys to process!")
		return
	}

	// Dry run mode
	if (options.dryRun) {
		console.log("\n=== DRY RUN ===")
		console.log(
			`Would generate ${toys.length} pages with concurrency ${options.concurrency}`,
		)
		console.log("\nToys to process:")
		for (const toy of toys.slice(0, 10)) {
			console.log(`  - ${toy.slug}: ${toy.name}`)
		}
		if (toys.length > 10) {
			console.log(`  ... and ${toys.length - 10} more`)
		}
		return
	}

	// Set up progress bar (skip in verbose mode to avoid interference)
	const progressBar = options.verbose
		? null
		: new cliProgress.SingleBar(
				{
					format:
						"Generating [{bar}] {percentage}% | {value}/{total} | {rate}/sec | ETA: {eta_formatted}",
					hideCursor: true,
				},
				cliProgress.Presets.shades_classic,
			)
	progressBar?.start(toys.length, 0)

	// Set up concurrency limiter
	const limit = pLimit(options.concurrency)

	let completed = 0
	let currentToy: ToyInfo | null = null

	try {
		const tasks = toys.map((toy) =>
			limit(async () => {
				currentToy = toy
				await processToy(toy, options.verbose, options.model)
				completed++
				progressBar?.update(completed)
			}),
		)

		await Promise.all(tasks)
	} catch (error) {
		progressBar?.stop()
		console.error("\n\n=== GENERATE-PAGES FAILED ===")
		const failedToy = currentToy as ToyInfo | null
		if (failedToy) {
			console.error("Toy:", {
				name: failedToy.name,
				slug: failedToy.slug,
			})
		}
		console.error("Error:", error)
		console.error(
			"\nResume by re-running the script (already-generated toys are skipped)",
		)
		process.exit(1)
	}

	progressBar?.stop()

	// Summary
	const elapsed = (Date.now() - startTime) / 1000
	console.log(`\nDone! Generated ${completed} pages in ${elapsed.toFixed(1)}s`)
	console.log(`  - Skipped (already done): ${alreadyGenerated}`)
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
