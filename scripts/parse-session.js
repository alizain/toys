const fs = require("node:fs")

const sessionPath =
	process.argv[2] ||
	"/Users/alizain/.claude/projects/-Users-alizain-803-web-packages-toys/eb94088a-a782-4bf4-a57c-c486019f0c53.jsonl"

const content = fs.readFileSync(sessionPath, "utf8")
const lines = content.split("\n").filter((l) => l.trim())

console.log("Total lines:", lines.length)

const userMessages = []
const assistantTexts = []
const timestamps = []
const toolUses = []

for (const line of lines) {
	try {
		const obj = JSON.parse(line)

		if (obj.timestamp) timestamps.push(obj.timestamp)

		if (obj.type === "user") {
			const cnt = obj.message?.content
			if (Array.isArray(cnt)) {
				for (const item of cnt) {
					if (item.type === "text" && item.text) {
						userMessages.push(item.text.substring(0, 600))
					}
				}
			} else if (typeof cnt === "string") {
				userMessages.push(cnt.substring(0, 600))
			}
		}

		if (obj.type === "assistant") {
			const cnt = obj.message?.content
			if (Array.isArray(cnt)) {
				for (const item of cnt) {
					if (
						item.type === "text" &&
						item.text &&
						item.text.length > 50 &&
						assistantTexts.length < 30
					) {
						assistantTexts.push(item.text.substring(0, 400))
					}
					if (item.type === "tool_use") {
						toolUses.push(item.name)
					}
				}
			}
		}
	} catch (_e) {}
}

console.log("\n=== TIMESTAMPS ===")
console.log("First:", timestamps[0])
console.log("Last:", timestamps[timestamps.length - 1])
console.log("Count:", timestamps.length)

console.log(`\n=== USER MESSAGES (${userMessages.length} total) ===`)
userMessages.slice(0, 25).forEach((m, i) => {
	console.log("\n--- User Message", i + 1, "---")
	console.log(m)
})

console.log("\n=== ASSISTANT EXCERPTS ===")
assistantTexts.slice(0, 20).forEach((t, i) => {
	console.log("\n--- Assistant", i + 1, "---")
	console.log(t)
})

console.log("\n=== TOP TOOLS USED ===")
const counts = {}
for (const t of toolUses) {
	counts[t] = (counts[t] || 0) + 1
}
Object.entries(counts)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 20)
	.forEach(([tool, count]) => {
		console.log(`${tool}: ${count}`)
	})
