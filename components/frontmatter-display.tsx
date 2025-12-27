import { ExternalLink } from "lucide-react"
import type { ReactNode } from "react"

interface FrontmatterDisplayProps {
	frontmatter: Record<string, unknown>
}

// Fields to skip (already displayed elsewhere or internal)
const SKIP_FIELDS = new Set(["name", "link", "version"])

// Field display order (known fields first, then alphabetical for unknown)
const FIELD_ORDER = ["typical_age", "materials", "links"]

// Special field configurations
const FIELD_CONFIG: Record<
	string,
	{ label: string; fullWidth?: boolean }
> = {
	typical_age: { label: "Ages" },
	materials: { label: "Materials" },
	links: { label: "References", fullWidth: true },
}

function humanizeKey(key: string): string {
	return key
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase())
}

function LinksList({ links }: { links: string[] }) {
	return (
		<ul className="space-y-2">
			{links.map((url, index) => (
				<li key={index} className="flex items-center gap-2 text-sm">
					<ExternalLink
						className="w-4 h-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline break-all"
					>
						{url}
					</a>
				</li>
			))}
		</ul>
	)
}

function renderValue(value: unknown): ReactNode {
	if (Array.isArray(value)) {
		// Check if it's an array of URLs
		if (value.every((v) => typeof v === "string" && v.startsWith("http"))) {
			return <LinksList links={value as string[]} />
		}
		return value.join(", ")
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No"
	}
	return String(value)
}

function DescriptionItem({
	label,
	value,
	fullWidth = false,
}: {
	label: string
	value: ReactNode
	fullWidth?: boolean
}) {
	return (
		<div
			className={`border-t border-border py-4 ${fullWidth ? "sm:col-span-2" : "sm:col-span-1"}`}
		>
			<dt className="text-sm font-medium text-foreground">{label}</dt>
			<dd className="mt-1 text-sm text-muted-foreground">{value}</dd>
		</div>
	)
}

export function FrontmatterDisplay({ frontmatter }: FrontmatterDisplayProps) {
	// Filter out skipped fields
	const displayableFields = Object.entries(frontmatter).filter(
		([key]) => !SKIP_FIELDS.has(key),
	)

	if (displayableFields.length === 0) {
		return null
	}

	// Sort: known fields first (in FIELD_ORDER), then alphabetical
	const sortedFields = displayableFields.sort(([a], [b]) => {
		const aIndex = FIELD_ORDER.indexOf(a)
		const bIndex = FIELD_ORDER.indexOf(b)
		if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
		if (aIndex !== -1) return -1
		if (bIndex !== -1) return 1
		return a.localeCompare(b)
	})

	return (
		<dl className="grid grid-cols-1 sm:grid-cols-2 mb-8">
			{sortedFields.map(([key, value]) => {
				const config = FIELD_CONFIG[key]
				const label = config?.label ?? humanizeKey(key)
				const fullWidth = config?.fullWidth ?? false
				const renderedValue = renderValue(value)

				return (
					<DescriptionItem
						key={key}
						label={label}
						value={renderedValue}
						fullWidth={fullWidth}
					/>
				)
			})}
		</dl>
	)
}
