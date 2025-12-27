import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

// Use process.cwd() which points to the package root in Next.js
function getPackageRoot(): string {
	// In Next.js, process.cwd() is the package root
	// We need to find the toys-web package root
	const dir = process.cwd()

	// If we're in the monorepo root, navigate to packages/toys
	if (fs.existsSync(path.join(dir, "packages/toys/toys"))) {
		return path.join(dir, "packages/toys")
	}

	// Otherwise assume we're in the package root
	return dir
}

const PACKAGE_ROOT = getPackageRoot()
const TOYS_FOLDER = path.join(PACKAGE_ROOT, "toys")
const RATINGS_FILE = path.join(PACKAGE_ROOT, "ratings.csv")

export interface ToyRating {
	generativity: number
	developmentalLongevity: number
	productiveChallenge: number
	sensoryEngagement: number
	expressiveRange: number
	socialAffordance: number
	practicalSustainability: number
	total: number
}

export interface Toy {
	slug: string
	name: string
	link: string | null
	content: string
	rating: ToyRating | null
	version: number | null
	frontmatter: Record<string, unknown>
}

/**
 * Toys with a version are considered "ready for rating".
 * Used by /rate page and auto-rate script to filter the toy pool.
 */
export function isVersioned(
	toy: Pick<Toy, "version">,
): toy is Pick<Toy, "version"> & { version: number } {
	return toy.version !== null
}

function parseRatingsCSV(): Map<string, ToyRating> {
	const ratings = new Map<string, ToyRating>()

	if (!fs.existsSync(RATINGS_FILE)) {
		return ratings
	}

	const content = fs.readFileSync(RATINGS_FILE, "utf-8")
	const lines = content.trim().split("\n")

	// Skip header: slug,generativity,developmental_longevity,productive_challenge,sensory_engagement,expressive_range,social_affordance,practical_sustainability,total
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]
		const [
			slug,
			generativity,
			developmentalLongevity,
			productiveChallenge,
			sensoryEngagement,
			expressiveRange,
			socialAffordance,
			practicalSustainability,
			total,
		] = line.split(",")

		if (slug) {
			ratings.set(slug, {
				developmentalLongevity: Number.parseFloat(developmentalLongevity) || 0,
				expressiveRange: Number.parseFloat(expressiveRange) || 0,
				generativity: Number.parseFloat(generativity) || 0,
				practicalSustainability: Number.parseFloat(practicalSustainability) || 0,
				productiveChallenge: Number.parseFloat(productiveChallenge) || 0,
				sensoryEngagement: Number.parseFloat(sensoryEngagement) || 0,
				socialAffordance: Number.parseFloat(socialAffordance) || 0,
				total: Number.parseFloat(total) || 0,
			})
		}
	}

	return ratings
}

export async function getToys(): Promise<Toy[]> {
	if (!fs.existsSync(TOYS_FOLDER)) {
		return []
	}

	const ratings = parseRatingsCSV()

	// Each toy is a folder containing index.md
	const toyFolders = fs.readdirSync(TOYS_FOLDER).filter((f) => {
		const toyPath = path.join(TOYS_FOLDER, f)
		return (
			fs.statSync(toyPath).isDirectory() &&
			fs.existsSync(path.join(toyPath, "index.md"))
		)
	})

	const toys: Toy[] = toyFolders
		.map((folderName) => {
			const filePath = path.join(TOYS_FOLDER, folderName, "index.md")
			const fileContent = fs.readFileSync(filePath, "utf-8")
			const slug = folderName
			const rating = ratings.get(slug) || null

			try {
				const { data, content } = matter(fileContent)
				return {
					content: content.trim(),
					frontmatter: data,
					link: data.link || null,
					name: data.name || slug,
					rating,
					slug,
					version: typeof data.version === "number" ? data.version : null,
				}
			} catch {
				// Fallback for files with YAML parsing issues (e.g., unquoted colons)
				const lines = fileContent.split("\n")
				let name = slug
				let link: string | null = null
				let version: number | null = null
				let contentStart = 0

				// Try to extract name, link, and version from frontmatter manually
				if (lines[0] === "---") {
					for (let i = 1; i < lines.length; i++) {
						if (lines[i] === "---") {
							contentStart = i + 1
							break
						}
						if (lines[i].startsWith("name:")) {
							name = lines[i].substring(5).trim()
						}
						if (lines[i].startsWith("link:")) {
							link = lines[i].substring(5).trim()
						}
						if (lines[i].startsWith("version:")) {
							const v = Number.parseInt(lines[i].substring(8).trim(), 10)
							version = Number.isNaN(v) ? null : v
						}
					}
				}

				return {
					content: lines.slice(contentStart).join("\n").trim(),
					frontmatter: { name, link, version },
					link,
					name,
					rating,
					slug,
					version,
				}
			}
		})
		.filter(Boolean) as Toy[]

	// Sort by total rating (highest first), then by name
	toys.sort((a, b) => {
		if (a.rating && b.rating) {
			if (b.rating.total !== a.rating.total) {
				return b.rating.total - a.rating.total
			}
		}
		if (a.rating && !b.rating) return -1
		if (!a.rating && b.rating) return 1
		return a.name.localeCompare(b.name)
	})

	return toys
}

export async function getToyBySlug(slug: string): Promise<Toy | null> {
	const toys = await getToys()
	return toys.find((t) => t.slug === slug) || null
}
