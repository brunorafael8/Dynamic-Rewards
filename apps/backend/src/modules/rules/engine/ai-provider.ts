import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

type ProviderFactory = (apiKey: string) => (modelId: string) => LanguageModel;

const providers: Record<string, ProviderFactory> = {
	openai: (apiKey) => createOpenAI({ apiKey }),
	anthropic: (apiKey) => createAnthropic({ apiKey }),
};

function getApiKey(): string | undefined {
	return process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
}

export function isAIConfigured(): boolean {
	return !!getApiKey();
}

export type TaskComplexity = "simple" | "complex" | "ultra-complex";

/**
 * Hybrid LLM Model Selection Strategy (2026 Best Practices)
 *
 * Three-tier routing based on weighted complexity score (0-1):
 * - Simple (< 0.4) → Fast/cheap models (Haiku $0.25, GPT-4o-mini $0.15)
 * - Complex (0.4-0.75) → Balanced models (Sonnet, GPT-4o)
 * - Ultra-complex (> 0.75) → Most powerful (Opus, o1-preview)
 *
 * Complexity Scoring (weighted 0-1):
 * - Token count (max 0.4): Longer prompts need stronger models
 * - Reasoning keywords (0.2): "why", "analyze", "evaluate"
 * - Deep reasoning (0.2): Multi-part comparisons, detailed analysis
 * - Content length (0.2): Long content to evaluate (>500 chars)
 *
 * Calibrated thresholds: ~50% simple, ~40% complex, ~10% ultra
 * Cost savings: Up to 3.66x while maintaining quality
 *
 * References:
 * - RouteLLM: https://github.com/lm-sys/RouteLLM
 * - Research: https://arxiv.org/html/2406.18665v1
 * - Token Complexity: https://arxiv.org/html/2503.01141v1
 */
export function getModel(complexity: TaskComplexity = "simple"): LanguageModel {
	const apiKey = getApiKey();
	if (!apiKey) throw new Error("No AI API key configured");

	const providerName = process.env.AI_PROVIDER || "openai";

	// Hybrid model selection: use cheaper models for simple tasks, powerful ones for complex
	const modelId = process.env.AI_MODEL || getDefaultModel(providerName, complexity);

	const factory = providers[providerName];
	if (!factory) {
		const supported = Object.keys(providers).join(", ");
		throw new Error(
			`Unknown AI provider: ${providerName}. Supported: ${supported}`,
		);
	}

	return factory(apiKey)(modelId);
}

function getDefaultModel(provider: string, complexity: TaskComplexity): string {
	if (provider === "anthropic") {
		if (complexity === "ultra-complex") {
			return "claude-opus-4-6-20250514"; // Most powerful, deep reasoning
		}
		return complexity === "simple"
			? "claude-haiku-4-5-20251001"  // Fast ($0.25/$1.25 per M tokens), 80% HumanEval
			: "claude-sonnet-4-5-20250929"; // Balanced, 50.4% grad-level reasoning
	}

	// OpenAI
	if (complexity === "ultra-complex") {
		return "o1-preview"; // Deep reasoning, slower but most capable
	}
	return complexity === "simple"
		? "gpt-4o-mini"  // Fast ($0.15/$0.60 per M tokens)
		: "gpt-4o";      // Powerful, best for reasoning
}
