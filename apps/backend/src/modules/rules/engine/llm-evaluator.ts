import { generateObject } from "ai";
import pRetry, { AbortError } from "p-retry";
import { z } from "zod/v4";
import { getModel, isAIConfigured } from "./ai-provider";
import type { Condition, LLMEvaluation } from "./types";

const LLM_TIMEOUT_MS = 10000;
const LLM_MAX_RETRIES = 3;

// Zod schemas for structured LLM outputs

const evaluationSchema = z.object({
	match: z.boolean().describe("Whether the content meets the criteria"),
	confidence: z.number().describe("Confidence score between 0 and 1"),
	reasoning: z.string().describe("Brief one-sentence explanation"),
});

const sentimentSchema = z.object({
	sentiment: z
		.enum(["positive", "negative", "neutral"])
		.describe("Overall sentiment of the text"),
	reasoning: z.string().describe("Brief one-sentence explanation"),
});

const qualitySchema = z.object({
	score: z.string().describe("Quality score from 0 to 100 as a number string"),
	reasoning: z.string().describe("Brief one-sentence explanation"),
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

	try {
		// Hybrid routing based on production patterns (RouteLLM, Anyscale):
		// Calculate complexity score (0-1) and route based on thresholds
		const estimatedTokens = Math.ceil(prompt.length / 4); // ~4 chars per token
		const hasReasoningKeywords = /why|how|compare|analyze|evaluate|explain|assess|judge/i.test(prompt);
		const hasDeepReasoningKeywords = /compare.*and|analyze.*in.*detail|evaluate.*multiple|explain.*why.*and.*how/i.test(prompt);

		// Complexity score: weighted sum of signals
		let complexityScore = 0;
		complexityScore += Math.min(estimatedTokens / 100, 0.4); // Token length (max 0.4)
		complexityScore += hasReasoningKeywords ? 0.2 : 0; // Reasoning indicators
		complexityScore += hasDeepReasoningKeywords ? 0.2 : 0; // Deep reasoning
		complexityScore += fieldValue.length > 500 ? 0.2 : 0; // Long content to evaluate

		// Tiered thresholds (calibrated for cost-quality balance)
		const ULTRA_THRESHOLD = 0.75; // Top ~10% → Opus/o1 (most expensive, most capable)
		const COMPLEX_THRESHOLD = 0.4; // ~40% → Sonnet/GPT-4o (balanced)

		const complexity =
			complexityScore > ULTRA_THRESHOLD ? "ultra-complex" :
			complexityScore > COMPLEX_THRESHOLD ? "complex" :
			"simple";

		const { object } = await withResilience(() =>
			generateObject({
				model: getModel(complexity),
				schema: evaluationSchema,
				system: "You are a judge evaluating employee visit data. Be concise.",
				prompt: `${prompt}\n\nContent to evaluate:\n"${fieldValue}"`,
			}),
		);

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

	try {
		// Sentiment classification is straightforward binary task
		// → Use fast/cheap model (Haiku/Mini)
		const { object } = await withResilience(() =>
			generateObject({
				model: getModel("simple"),
				schema: sentimentSchema,
				system:
					"You are a sentiment analyzer for employee visit documentation. Be concise.",
				prompt: `Analyze the sentiment of this text:\n"${fieldValue}"`,
			}),
		);

		return {
			match: object.sentiment === expectedSentiment,
			confidence: 1,
			reasoning: object.reasoning,
		};
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

	try {
		// Quality scoring with high thresholds (≥70) requires nuanced judgment
		// → Use powerful model (Sonnet/GPT-4o) for better discrimination
		const complexity = threshold >= 70 ? "complex" : "simple";

		const { object } = await withResilience(() =>
			generateObject({
				model: getModel(complexity),
				schema: qualitySchema,
				system:
					"You are a documentation quality assessor for employee visit notes. Score based on helpfulness, detail, and professionalism. Be concise.",
				prompt: `Rate the quality of this documentation:\n"${fieldValue}"`,
			}),
		);

		const score = Number.parseInt(object.score, 10);
		return {
			match: score >= threshold,
			confidence: score / 100,
			reasoning: object.reasoning,
		};
	} catch (err) {
		console.error("Quality evaluation failed:", (err as Error).message);
		return { match: false, confidence: 0, reasoning: "Evaluation failed" };
	}
}
