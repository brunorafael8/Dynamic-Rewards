import type { FastifyInstance } from "fastify";
import {
	getAnalytics,
	resetAnalytics,
} from "../rules/engine/llm-analytics";
import {
	clearCache,
	getCacheStats,
} from "../rules/engine/llm-cache";

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /analytics/llm
	 * Returns comprehensive LLM usage analytics
	 */
	app.get("/llm", async () => {
		const analytics = getAnalytics();
		const cacheStats = getCacheStats();

		return {
			...analytics,
			cache: cacheStats,
		};
	});

	/**
	 * DELETE /analytics/llm
	 * Reset analytics (useful for demos/testing)
	 */
	app.delete("/llm", async () => {
		resetAnalytics();
		clearCache();
		return { message: "Analytics and cache cleared" };
	});

	/**
	 * GET /analytics/llm/summary
	 * Returns a formatted summary for display
	 */
	app.get("/llm/summary", async () => {
		const analytics = getAnalytics();
		const cacheStats = getCacheStats();

		if (analytics.totalCalls === 0) {
			return {
				message: "No LLM calls tracked yet. Process some events to see analytics.",
			};
		}

		return {
			summary: {
				totalCalls: analytics.totalCalls,
				cachedCalls: Math.round(analytics.cacheHitRate * analytics.totalCalls),
				cacheHitRate: `${(analytics.cacheHitRate * 100).toFixed(1)}%`,
				totalCost: `$${analytics.totalCost.toFixed(4)}`,
				costSavings: `$${analytics.costSavingsVsOpus.toFixed(4)}`,
				savingsMultiplier: `${(
					analytics.costSavingsVsOpus / analytics.totalCost +
					1
				).toFixed(2)}x`,
				avgLatency: `${Math.round(analytics.avgLatencyMs)}ms`,
			},
			complexity: {
				simple: `${analytics.complexityDistribution.simple} (${((analytics.complexityDistribution.simple / analytics.totalCalls) * 100).toFixed(0)}%)`,
				complex: `${analytics.complexityDistribution.complex} (${((analytics.complexityDistribution.complex / analytics.totalCalls) * 100).toFixed(0)}%)`,
				ultraComplex: `${analytics.complexityDistribution.ultraComplex} (${((analytics.complexityDistribution.ultraComplex / analytics.totalCalls) * 100).toFixed(0)}%)`,
			},
			models: analytics.modelUsage,
			operators: analytics.operatorUsage,
			cache: {
				entries: cacheStats.cacheSize,
				totalHits: cacheStats.totalHits,
				avgHitsPerEntry: cacheStats.avgHitsPerEntry.toFixed(1),
			},
		};
	});
}
