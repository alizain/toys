# Toy Rating Subagent Prompt

Use this prompt when spawning subagents to rate toys via pairwise comparisons.

## The Prompt

```
You are rating toys using pairwise comparisons. The system automatically selects which dimension needs the most work.

## Your Task

1. Run this command to get your batch:
   ```
   npx tsx --tsconfig tsconfig.tsxrepl.json packages/toys/scripts/prepare-dimension.ts
   ```

2. The output contains:
   - `selectedDimension`: The auto-selected dimension with full criteria (key, label, question, description, keyQuestions, scoringGuide)
   - `allDimensionsOverview`: Quick stats on all dimensions (for visibility)
   - `pairs`: The pairs to compare (toyA, toyB slugs)
   - `toys`: Only the toys needed for these pairs (slug, name, content)
   - `stats`: Batch info including `allComplete` flag

3. If `stats.allComplete` is true, all comparisons are done - report this and stop.

4. For each pair in `pairs`:
   - Apply the `selectedDimension` criteria:
     - Read the `question` (what you're evaluating)
     - Consider each `keyQuestions` item
     - Use the `scoringGuide` to mentally score each toy (1-10). The scoring guide is guidance only, not hard rules - use your judgment for toys that don't fit neatly into the examples
   - Decide which toy scores higher, or if they're roughly equal (tie)

5. Save each decision:
   ```
   npx tsx --tsconfig tsconfig.tsxrepl.json packages/toys/scripts/save-vote.ts <dimension> <toyA> <toyB> <winner>
   ```
   Where:
   - `<dimension>` is `selectedDimension.key`
   - `<toyA>` and `<toyB>` are the slugs from the pair
   - `<winner>` is the winning toy's slug, or "tie" if within ~1-2 points

## Important
- DO NOT read any files - all toy content is already included in the `toys` array from prepare-dimension.ts
- DO NOT use Read, Glob, or Grep tools - everything you need is in the JSON output

## Tips
- Run multiple save-vote commands in parallel for speed
- If genuinely close, use "tie"

Start by running the prepare-dimension command.
```

## Options

The script supports these options:

- `--limit <n>`: Max pairs per batch (default: 50)
- `--sort-every <n>`: Re-sort toys after N pairs (default: 5). Lower = better coverage spread, higher = fewer unique toys in batch

Example with custom limit:
```
npx tsx packages/toys/scripts/prepare-dimension.ts --limit 100
```

## How It Works

1. **Auto-selects dimension**: Picks the dimension with the lowest median comparison count (least covered)
2. **Greedy pair selection**: Prioritizes toys with fewest comparisons
3. **Periodic re-sorting**: Re-sorts by count every N pairs to spread coverage evenly
4. **Filters toys**: Only includes toys appearing in the selected pairs (token efficient)

## Spawning the Agent

```typescript
Task({
  description: "Rate toy comparisons",
  subagent_type: "general-purpose",
  prompt: `<paste the prompt above>`
})
```

## Running Multiple Batches

The script is idempotent - each run checks existing comparisons and returns new pairs. Run repeatedly until `stats.allComplete` is true.

DO NOT RUN prepare-dimension.ts MULTIPLE TIMES IN PARALLEL! The script looks at _completed_ comparisons to figure out what to tackle next. Since no new comparisons would have been completed if you run them in parallel, you're going to get the same stats.

To increase parallelism, increase `--limit`!
