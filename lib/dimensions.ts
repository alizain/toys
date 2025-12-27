export type Dimension =
	| "generativity"
	| "developmental_longevity"
	| "productive_challenge"
	| "sensory_engagement"
	| "expressive_range"
	| "social_affordance"
	| "practical_sustainability"

export interface Comparison {
	dimension: Dimension
	toyA: string
	toyB: string
	winner: string // slug of winning toy, or "tie"
	timestamp: string
}

export interface DimensionInfo {
	key: Dimension
	label: string
	question: string
	description: string
	keyQuestions: string[]
	scoringGuide: { score: number; description: string }[]
}

export const DIMENSIONS: DimensionInfo[] = [
	{
		description:
			"Based on Papert's 'Low Floor, High Ceiling, Wide Walls' (easy to start, infinitely deep, multiple pathways), Reggio's 'Loose Parts' (materials that can be moved, combined, transformed endlessly), and Montessori's 'Flexibility' (transforms into many things, not fixed purpose).",
		key: "generativity",
		keyQuestions: [
			"Can a child use this 100 different ways?",
			"Does it combine with other toys/materials?",
			"Is there a 'correct' way to play, or endless valid ways?",
		],
		label: "Generativity",
		question: "How many different things can a child create or do with this toy?",
		scoringGuide: [
			{
				description: "Single predetermined use (puzzle with one solution)",
				score: 1,
			},
			{
				description: "Few variations on one theme (specific vehicle toy)",
				score: 3,
			},
			{ description: "Moderate variety (board game with some strategy)", score: 5 },
			{
				description: "High variety (construction set with instructions)",
				score: 7,
			},
			{
				description: "Infinite possibilities (magna-tiles, wooden blocks, loose parts)",
				score: 10,
			},
		],
	},
	{
		description:
			"Based on Piaget's Developmental Stages (different toys captivate at different stages), Papert's 'Objects to Think With' (gears that he loved as a child continued to teach him as an adult), and Bregan's 'Repeatability' (daily use for years, not one-time novelty).",
		key: "developmental_longevity",
		keyQuestions: [
			"Can a 2-year-old and 8-year-old both find this engaging (in different ways)?",
			"Does complexity grow with the child?",
			"Will this be passed to siblings/cousins/next generation?",
		],
		label: "Developmental Longevity",
		question: "How long does this toy remain engaging across a child's development?",
		scoringGuide: [
			{
				description: "Interest lasts days/weeks (novelty toys, single-use kits)",
				score: 1,
			},
			{ description: "Interest lasts months (age-specific puzzles)", score: 3 },
			{
				description: "Interest lasts 1-2 years within a developmental stage",
				score: 5,
			},
			{
				description: "Interest spans multiple developmental stages (3-5 years)",
				score: 7,
			},
			{
				description:
					"Multi-generational appeal (wooden blocks, magna-tiles: 1-year-old to adult)",
				score: 10,
			},
		],
	},
	{
		description:
			"Based on Papert's 'Hard Fun' (it's fun because it's hard, not in spite of being hard), Montessori's 'Isolation of Difficulty' (focus on one challenge at a time, mastery through repetition), and Piaget's Zone of Proximal Development (slightly beyond current ability, but achievable).",
		key: "productive_challenge",
		keyQuestions: [
			"Does the toy create 'resistance' requiring problem-solving?",
			"Are mistakes visible and fixable (Papert's 'debugging mindset')?",
			"Can a child return to this with new skills and find new challenges?",
		],
		label: "Productive Challenge",
		question:
			"Does this toy create the conditions for 'hard fun' — deep engagement through meaningful difficulty?",
		scoringGuide: [
			{ description: "No challenge (passive entertainment)", score: 1 },
			{ description: "Trivial challenge (quickly mastered, no depth)", score: 3 },
			{
				description: "Moderate challenge (some skill required, finite ceiling)",
				score: 5,
			},
			{
				description: "Progressive challenge (difficulty scales with skill)",
				score: 7,
			},
			{
				description: "Infinite mastery curve (always something new to attempt)",
				score: 10,
			},
		],
	},
	{
		description:
			"Based on Montessori's Sensorial Materials ('the senses are the gateway to knowledge'), Piaget's Constructivism ('experimenting and manipulating physical objects is the main way children learn'), and Reggio's Material Quality (natural materials with texture, weight, temperature, smell).",
		key: "sensory_engagement",
		keyQuestions: [
			"What does it feel like? Sound like? Look like?",
			"Is there satisfying physical feedback (click, connection, weight)?",
			"Natural materials over plastic?",
		],
		label: "Sensory Engagement",
		question:
			"How richly does this toy engage the senses and support physical manipulation?",
		scoringGuide: [
			{ description: "Minimal sensory input (screens, static plastic)", score: 1 },
			{ description: "Single sense engaged (visual only)", score: 3 },
			{
				description: "Multiple senses, synthetic materials (quality plastic)",
				score: 5,
			},
			{ description: "Rich multi-sensory, some natural materials", score: 7 },
			{
				description: "Deeply tactile, natural materials (wood, metal, fabric, ceramic)",
				score: 10,
			},
		],
	},
	{
		description:
			"Based on Reggio's '100 Languages' (children express through visual, kinesthetic, spatial, dramatic, musical, mathematical languages), Papert's 'Objects to Think With' (bridge between concrete experience and abstract ideas), and Piaget's Symbolic Play (objects representing other things, imagination made manifest).",
		key: "expressive_range",
		keyQuestions: [
			"Can this represent a rocket ship? A restaurant? A feeling?",
			"Does it support pretend play and symbolic representation?",
			"Can children tell stories, test theories, express emotions through it?",
		],
		label: "Expressive Range",
		question:
			"Can children use this toy to communicate ideas across Malaguzzi's '100 languages'?",
		scoringGuide: [
			{ description: "No expressive function (consumables, single-use)", score: 1 },
			{
				description: "Single mode of expression (purely visual or purely kinesthetic)",
				score: 3,
			},
			{ description: "2-3 expressive modes (building + storytelling)", score: 5 },
			{
				description: "Multiple modes (visual + spatial + dramatic + social)",
				score: 7,
			},
			{
				description: "Full symbolic range (can represent any idea, story, emotion)",
				score: 10,
			},
		],
	},
	{
		description:
			"Based on Reggio's Social Constructivism ('learning as children and teachers working collaboratively'), Piaget's Games with Rules (negotiation, fairness, perspective-taking), and Vygotsky's ZPD (learning enhanced through interaction with more knowledgeable others).",
		key: "social_affordance",
		keyQuestions: [
			"Can multiple children work on this simultaneously?",
			"Does it require communication to use together?",
			"Is there enough material for sharing without scarcity?",
		],
		label: "Social Affordance",
		question:
			"Does this toy naturally invite collaboration, negotiation, and shared meaning-making?",
		scoringGuide: [
			{
				description: "Solitary only (personal puzzles, single-player games)",
				score: 1,
			},
			{
				description: "Parallel play (side-by-side, not truly collaborative)",
				score: 3,
			},
			{ description: "Turn-taking (board games with alternating play)", score: 5 },
			{
				description: "Cooperative building (joint construction, shared creation)",
				score: 7,
			},
			{
				description:
					"Deep collaboration (requires negotiation, role assignment, shared vision)",
				score: 10,
			},
		],
	},
	{
		description:
			"Based on Bregan's 'Cleanup Ease' (annoying many pieces vs. zero cleanup), Montessori's 'Order' (materials that can be beautifully stored and displayed), Reggio's 'Environment as Third Teacher' (fits into thoughtfully designed spaces), and durability (multi-generational, hand-me-down worthy).",
		key: "practical_sustainability",
		keyQuestions: [
			"Play-to-cleanup ratio?",
			"Will this survive years of use and multiple children?",
			"Does it have a logical home? Can it be displayed beautifully?",
		],
		label: "Practical Sustainability",
		question: "Does this toy respect parents' time and family resources?",
		scoringGuide: [
			{
				description:
					"Nightmare (tiny pieces, constant loss, painful to step on, breaks easily)",
				score: 1,
			},
			{
				description: "Annoying (many pieces, slow cleanup, moderate durability)",
				score: 3,
			},
			{ description: "Neutral (reasonable cleanup, decent durability)", score: 5 },
			{ description: "Pleasant (quick cleanup, durable, stores well)", score: 7 },
			{
				description: "Effortless (few pieces, elegant storage, lasts generations)",
				score: 10,
			},
		],
	},
]

export const VALID_DIMENSIONS: Dimension[] = [
	"generativity",
	"developmental_longevity",
	"productive_challenge",
	"sensory_engagement",
	"expressive_range",
	"social_affordance",
	"practical_sustainability",
]
