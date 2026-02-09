import { generateObject } from "ai";
import pRetry, { AbortError } from "p-retry";
import { z } from "zod/v4";
import { getModel, isAIConfigured, type TaskComplexity } from "./ai-provider";
import { estimateCost, trackLLMCall } from "./llm-analytics";
import { checkCache, storeInCache } from "./llm-cache";
import type { Condition, LLMEvaluation } from "./types";

const LLM_TIMEOUT_MS = 10000;
const LLM_MAX_RETRIES = 3;

// Zod schemas for structured LLM outputs with Chain-of-Thought

const evaluationSchema = z.object({
	thinking: z
		.string()
		.describe("Step-by-step reasoning process (chain of thought)"),
	match: z.boolean().describe("Whether the content meets the criteria"),
	confidence: z.number().describe("Confidence score between 0 and 1"),
	reasoning: z.string().describe("Brief one-sentence summary of decision"),
});

const sentimentSchema = z.object({
	thinking: z
		.string()
		.describe("Step-by-step analysis of sentiment indicators"),
	sentiment: z
		.enum(["positive", "negative", "neutral"])
		.describe("Overall sentiment of the text"),
	reasoning: z.string().describe("Brief one-sentence summary"),
});

const qualitySchema = z.object({
	thinking: z
		.string()
		.describe(
			"Step-by-step assessment of helpfulness, detail, and professionalism",
		),
	score: z.string().describe("Quality score from 0 to 100 as a number string"),
	reasoning: z.string().describe("Brief one-sentence summary"),
});

// Helper: wrap AI call with timeout + retry

async function withResilience<T>(fn: () => Promise<T>): Promise<T> {
	return pRetry(
		async () => {
			return Promise.race([
				fn(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("LLM timeout")), LLM_TIMEOUT_MS),
				),
			]);
		},
		{
			retries: LLM_MAX_RETRIES,
			onFailedAttempt: (context) => {
				const errMsg = context.error.message;
				const isRetryable =
					errMsg.includes("429") ||
					errMsg.includes("rate limit") ||
					errMsg.includes("500") ||
					errMsg.includes("503") ||
					errMsg === "LLM timeout";

				if (!isRetryable) {
					throw new AbortError(errMsg);
				}

				console.warn(
					`LLM attempt ${context.attemptNumber} failed: ${errMsg}. Retrying...`,
				);
			},
		},
	);
}

// Check if conditions contain LLM-backed operators

export function hasLLMConditions(conditions: Condition[]): boolean {
	return conditions.some(
		(c) => c.op === "llm" || c.op === "sentiment" || c.op === "quality_score",
	);
}

export function getLLMConditions(conditions: Condition[]): Condition[] {
	return conditions.filter(
		(c) => c.op === "llm" || c.op === "sentiment" || c.op === "quality_score",
	);
}

// Evaluators for each LLM operator

export async function evaluateLLMCondition(
	fieldValue: string | null,
	prompt: string,
): Promise<LLMEvaluation> {
	if (!isAIConfigured() || !fieldValue) {
		return { match: false, confidence: 0, reasoning: "Skipped" };
	}

	// 🔍 Check semantic cache first
	const cachedResult = checkCache(prompt, fieldValue);
	if (cachedResult) {
		// Track cache hit in analytics
		trackLLMCall({
			timestamp: new Date(),
			model: "cached",
			complexity: "simple",
			inputTokens: 0,
			outputTokens: 0,
			latencyMs: 0,
			cost: 0,
			cached: true,
			operator: "llm",
		});
		return cachedResult;
	}

	const startTime = Date.now();

	try {
		// Hybrid routing based on production patterns (RouteLLM, Anyscale):
		// Calculate complexity score (0-1) and route based on thresholds
		const estimatedTokens = Math.ceil(prompt.length / 4); // ~4 chars per token
		const hasReasoningKeywords =
			/why|how|compare|analyze|evaluate|explain|assess|judge/i.test(prompt);
		const hasDeepReasoningKeywords =
			/compare.*and|analyze.*in.*detail|evaluate.*multiple|explain.*why.*and.*how/i.test(
				prompt,
			);

		// Complexity score: weighted sum of signals
		let complexityScore = 0;
		complexityScore += Math.min(estimatedTokens / 100, 0.4); // Token length (max 0.4)
		complexityScore += hasReasoningKeywords ? 0.2 : 0; // Reasoning indicators
		complexityScore += hasDeepReasoningKeywords ? 0.2 : 0; // Deep reasoning
		complexityScore += fieldValue.length > 500 ? 0.2 : 0; // Long content to evaluate

		// Tiered thresholds (calibrated for cost-quality balance)
		const ULTRA_THRESHOLD = 0.75; // Top ~10% → Opus/o1 (most expensive, most capable)
		const COMPLEX_THRESHOLD = 0.4; // ~40% → Sonnet/GPT-4o (balanced)

		const complexity: TaskComplexity =
			complexityScore > ULTRA_THRESHOLD
				? "ultra-complex"
				: complexityScore > COMPLEX_THRESHOLD
					? "complex"
					: "simple";

		const model = getModel(complexity);

		// 🧠 Chain-of-Thought prompting for better reasoning
		const cotPrompt = `${prompt}

Think step-by-step before answering:
1. What are the key aspects to evaluate?
2. What evidence supports or contradicts the criteria?
3. What's your confidence level and why?

Content to evaluate:
"${fieldValue}"`;

		const { object } = await withResilience(() =>
			generateObject({
				model,
				schema: evaluationSchema,
				system:
					"You are a judge evaluating employee visit data. Use chain-of-thought reasoning to make accurate decisions.",
				prompt: cotPrompt,
			}),
		);

		const latencyMs = Date.now() - startTime;

		// Estimate tokens (rough approximation)
		const inputTokens = Math.ceil((cotPrompt.length + 100) / 4);
		const outputTokens = Math.ceil(
			(object.thinking.length + object.reasoning.length + 20) / 4,
		);

		// 📊 Track analytics
		trackLLMCall({
			timestamp: new Date(),
			model: String(model),
			complexity,
			inputTokens,
			outputTokens,
			latencyMs,
			cost: estimateCost(String(model), inputTokens, outputTokens),
			cached: false,
			operator: "llm",
		});

		// 💾 Store in cache for future similar queries
		storeInCache(prompt, fieldValue, object);

		return object;
	} catch (err) {
		console.error("LLM evaluation failed:", (err as Error).message);
		return { match: false, confidence: 0, reasoning: "Evaluation failed" };
	}
}

export async function evaluateSentiment(
	fieldValue: string | null,
	expectedSentiment: string,
): Promise<LLMEvaluation> {
	if (!isAIConfigured() || !fieldValue) {
		return { match: false, confidence: 0, reasoning: "Skipped" };
	}

	const cacheKey = `sentiment:${expectedSentiment}`;

	// 🔍 Check cache
	const cachedResult = checkCache(cacheKey, fieldValue);
	if (cachedResult) {
		trackLLMCall({
			timestamp: new Date(),
			model: "cached",
			complexity: "simple",
			inputTokens: 0,
			outputTokens: 0,
			latencyMs: 0,
			cost: 0,
			cached: true,
			operator: "sentiment",
		});
		return cachedResult;
	}

	const startTime = Date.now();

	try {
		// Sentiment classification is straightforward binary task
		// → Use fast/cheap model (Haiku/Mini)
		const model = getModel("simple");

		// 🧠 Chain-of-Thought for sentiment
		const cotPrompt = `Analyze the sentiment of this text.

Think step-by-step:
1. Identify key emotional indicators (positive/negative words)
2. Consider overall tone and context
3. Determine if sentiment is positive, negative, or neutral

Text to analyze:
"${fieldValue}"`;

		const { object } = await withResilience(() =>
			generateObject({
				model,
				schema: sentimentSchema,
				system:
					"You are a sentiment analyzer for employee visit documentation. Use chain-of-thought reasoning.",
				prompt: cotPrompt,
			}),
		);

		const latencyMs = Date.now() - startTime;
		const inputTokens = Math.ceil((cotPrompt.length + 80) / 4);
		const outputTokens = Math.ceil(
			(object.thinking.length + object.reasoning.length + 10) / 4,
		);

		// 📊 Track analytics
		trackLLMCall({
			timestamp: new Date(),
			model: String(model),
			complexity: "simple",
			inputTokens,
			outputTokens,
			latencyMs,
			cost: estimateCost(String(model), inputTokens, outputTokens),
			cached: false,
			operator: "sentiment",
		});

		const result = {
			match: object.sentiment === expectedSentiment,
			confidence: 1,
			reasoning: object.reasoning,
		};

		// 💾 Store in cache
		storeInCache(cacheKey, fieldValue, result);

		return result;
	} catch (err) {
		console.error("Sentiment evaluation failed:", (err as Error).message);
		return { match: false, confidence: 0, reasoning: "Evaluation failed" };
	}
}

export async function evaluateQualityScore(
	fieldValue: string | null,
	threshold: number,
): Promise<LLMEvaluation> {
	if (!isAIConfigured() || !fieldValue) {
		return { match: false, confidence: 0, reasoning: "Skipped" };
	}

	const cacheKey = `quality:${threshold}`;

	// 🔍 Check cache
	const cachedResult = checkCache(cacheKey, fieldValue);
	if (cachedResult) {
		trackLLMCall({
			timestamp: new Date(),
			model: "cached",
			complexity: "simple",
			inputTokens: 0,
			outputTokens: 0,
			latencyMs: 0,
			cost: 0,
			cached: true,
			operator: "quality_score",
		});
		return cachedResult;
	}

	const startTime = Date.now();

	try {
		// Quality scoring with high thresholds (≥70) requires nuanced judgment
		// → Use powerful model (Sonnet/GPT-4o) for better discrimination
		const complexity: TaskComplexity =
			threshold >= 70 ? "complex" : "simple";
		const model = getModel(complexity);

		// 🧠 Chain-of-Thought for quality assessment
		const cotPrompt = `Rate the quality of this documentation on a scale of 0-100.

Think step-by-step:
1. Helpfulness: Does it provide useful information?
2. Detail: Is it thorough and specific?
3. Professionalism: Is the tone and writing appropriate?
4. Overall quality score (0-100)

Documentation to assess:
"${fieldValue}"`;

		const { object } = await withResilience(() =>
			generateObject({
				model,
				schema: qualitySchema,
				system:
					"You are a documentation quality assessor for employee visit notes. Use chain-of-thought reasoning to score accurately.",
				prompt: cotPrompt,
			}),
		);

		const latencyMs = Date.now() - startTime;
		const inputTokens = Math.ceil((cotPrompt.length + 120) / 4);
		const outputTokens = Math.ceil(
			(object.thinking.length + object.reasoning.length + 10) / 4,
		);

		// 📊 Track analytics
		trackLLMCall({
			timestamp: new Date(),
			model: String(model),
			complexity,
			inputTokens,
			outputTokens,
			latencyMs,
			cost: estimateCost(String(model), inputTokens, outputTokens),
			cached: false,
			operator: "quality_score",
		});

		const score = Number.parseInt(object.score, 10);
		const result = {
			match: score >= threshold,
			confidence: score / 100,
			reasoning: object.reasoning,
		};

		// 💾 Store in cache
		storeInCache(cacheKey, fieldValue, result);

		return result;
	} catch (err) {
		console.error("Quality evaluation failed:", (err as Error).message);
		return { match: false, confidence: 0, reasoning: "Evaluation failed" };
	}
}
