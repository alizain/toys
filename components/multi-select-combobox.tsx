"use client"

import {
	Combobox,
	ComboboxButton,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from "@headlessui/react"
import { Check, ChevronDown, X } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { cn } from "@/lib/cn"

interface MultiSelectComboboxProps<T extends string> {
	options: Array<{ value: T; label: string }>
	selected: T[]
	onChange: (selected: T[]) => void
	placeholder: string
	label: string
}

export function MultiSelectCombobox<T extends string>({
	options,
	selected,
	onChange,
	placeholder,
	label,
}: MultiSelectComboboxProps<T>) {
	const inputId = useId()
	const [query, setQuery] = useState("")

	const filteredOptions = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()
		if (!normalizedQuery) return options
		return options.filter((option) =>
			option.label.toLowerCase().includes(normalizedQuery),
		)
	}, [options, query])

	const selectedLookup = useMemo(() => new Set(selected), [selected])

	const selectedOptions = useMemo(
		() => options.filter((option) => selectedLookup.has(option.value)),
		[options, selectedLookup],
	)

	const handleChange = (values: T[]) => {
		onChange(values)
		setQuery("")
	}

	const removeSelection = (value: T) => {
		onChange(selected.filter((item) => item !== value))
	}

	return (
		<div className="space-y-2">
			<label
				htmlFor={inputId}
				className="text-xs font-medium text-muted-foreground"
			>
				{label}
			</label>
			<Combobox
				value={selected}
				onChange={handleChange}
				multiple
			>
				<div className="relative">
					<ComboboxInput
						id={inputId}
						placeholder={placeholder}
						displayValue={() => ""}
						onChange={(event) => setQuery(event.target.value)}
						className={cn(
							"w-full text-sm bg-background border border-border rounded-xl",
							"px-3 py-2.5 pr-9 text-foreground placeholder:text-muted-foreground",
							"focus:outline-none focus:ring-2 focus:ring-primary/50",
						)}
					/>
					<ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
						<ChevronDown className="w-4 h-4" />
					</ComboboxButton>

					<ComboboxOptions
						className={cn(
							"absolute z-20 mt-2 w-full rounded-xl border border-border",
							"bg-card shadow-lg overflow-hidden",
						)}
					>
						{filteredOptions.length === 0 ? (
							<div className="px-3 py-2 text-sm text-muted-foreground">
								No options match your search
							</div>
						) : (
							filteredOptions.map((option) => (
								<ComboboxOption
									key={option.value}
									value={option.value}
									className={({ active, selected: isSelected }) =>
										cn(
											"flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer",
											active && "bg-muted/60",
											isSelected && "font-medium text-foreground",
										)
									}
								>
									<span>{option.label}</span>
									<span className="text-muted-foreground">
										{selectedLookup.has(option.value) && (
											<Check className="w-4 h-4 text-emerald-500" />
										)}
									</span>
								</ComboboxOption>
							))
						)}
					</ComboboxOptions>
				</div>
			</Combobox>

			{selectedOptions.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedOptions.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => removeSelection(option.value)}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full",
								"bg-muted px-2.5 py-1 text-xs text-muted-foreground",
								"hover:bg-muted/70 hover:text-foreground transition-colors",
							)}
						>
							<span>{option.label}</span>
							<X className="w-3 h-3" />
						</button>
					))}
				</div>
			)}
		</div>
	)
}
