import { NextResponse } from "next/server"
import { saveComparison } from "@/lib/comparisons"

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { dimension, toyA, toyB, winner } = body

		const result = saveComparison({ dimension, toyA, toyB, winner })

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 })
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error("Error saving comparison:", error)
		return NextResponse.json({ error: "Failed to save comparison" }, { status: 500 })
	}
}
