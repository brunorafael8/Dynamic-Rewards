/**
 * LLM Analytics & Cost Tracking
 *
 * Tracks LLM usage metrics for monitoring and optimization:
 * - Model usage distribution (Haiku/Sonnet/Opus)
 * - Token consumption (input/output)
 * - Latency per model
 * - Cost estimation
 * - Complexity tier distribution
 */

export interface LLMMetric {
	timestamp: Date;
	model: string;
	complexity: "simple" | "complex" | "ultra-complex";
	inputTokens: number;
	outputTokens: number;
	latencyMs: number;
	cost: number;
	cached: boolean;
	operator: "llm" | "sentiment" | "quality_score";
}

// Pricing per 1M tokens (as of 2026)
const MODEL_PRICING = {
	// Anthropic
	"claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
	"claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
	"claude-opus-4-6-20250514": { input: 15.0, output: 75.0 },
	// OpenAI
	"gpt-4o-mini": { input: 0.15, output: 0.6 },
	"gpt-4o": { input: 2.5, output: 10.0 },
	"o1-preview": { input: 15.0, output: 60.0 },
};

// In-memory store (for demo - in production use Redis/TimescaleDB)
const metrics: LLMMetric[] = [];

export function trackLLMCall(metric: LLMMetric): void {
	metrics.push(metric);
}

export interface LLMAnalytics {
	totalCalls: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalCost: number;
	cacheHitRate: number;
	avgLatencyMs: number;
	costSavingsVsOpus: number;
	complexityDistribution: {
		simple: number;
		complex: number;
		ultraComplex: number;
	};
	modelUsage: Record<string, number>;
	operatorUsage: Record<string, number>;
}

export function getAnalytics(): LLMAnalytics {
	if (metrics.length === 0) {
		return {
			totalCalls: 0,
			totalInputTokens: 0,
			totalOutputTokens: 0,
			totalCost: 0,
			cacheHitRate: 0,
			avgLatencyMs: 0,
			costSavingsVsOpus: 0,
			complexityDistribution: { simple: 0, complex: 0, ultraComplex: 0 },
			modelUsage: {},
			operatorUsage: {},
		};
	}

	const totalCalls = metrics.length;
	const totalInputTokens = metrics.reduce((sum, m) => sum + m.inputTokens, 0);
	const totalOutputTokens = metrics.reduce((sum, m) => sum + m.outputTokens, 0);
	const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);
	const cachedCalls = metrics.filter((m) => m.cached).length;
	const avgLatencyMs =
		metrics.reduce((sum, m) => sum + m.latencyMs, 0) / totalCalls;

	// Calculate cost if we always used Opus
	const opusPrice = MODEL_PRICING["claude-opus-4-6-20250514"];
	const costIfAlwaysOpus =
		(totalInputTokens * opusPrice.input) / 1_000_000 +
		(totalOutputTokens * opusPrice.output) / 1_000_000;

	// Complexity distribution
	const complexityDistribution = {
		simple: metrics.filter((m) => m.complexity === "simple").length,
		complex: metrics.filter((m) => m.complexity === "complex").length,
		ultraComplex: metrics.filter((m) => m.complexity === "ultra-complex")
			.length,
	};

	// Model usage
	const modelUsage: Record<string, number> = {};
	for (const metric of metrics) {
		modelUsage[metric.model] = (modelUsage[metric.model] || 0) + 1;
	}

	// Operator usage
	const operatorUsage: Record<string, number> = {};
	for (const metric of metrics) {
		operatorUsage[metric.operator] =
			(operatorUsage[metric.operator] || 0) + 1;
	}

	return {
		totalCalls,
		totalInputTokens,
		totalOutputTokens,
		totalCost,
		cacheHitRate: cachedCalls / totalCalls,
		avgLatencyMs,
		costSavingsVsOpus: costIfAlwaysOpus - totalCost,
		complexityDistribution,
		modelUsage,
		operatorUsage,
	};
}

export function estimateCost(
	model: string,
	inputTokens: number,
	outputTokens: number,
): number {
	const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
	if (!pricing) return 0;

	return (
		(inputTokens * pricing.input) / 1_000_000 +
		(outputTokens * pricing.output) / 1_000_000
	);
}

export function resetAnalytics(): void {
	metrics.length = 0;
}
