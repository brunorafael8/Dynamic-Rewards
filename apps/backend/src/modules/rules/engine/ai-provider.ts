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

export type TaskComplexity = "simple" | "complex";

/**
 * Hybrid LLM Model Selection Strategy (2026 Best Practices)
 *
 * Routes requests to appropriate models based on task complexity:
 * - Simple tasks → Fast/cheap models (Haiku, GPT-4o-mini)
 * - Complex tasks → Powerful models (Sonnet, GPT-4o)
 *
 * Complexity Heuristics:
 * - Token count: Longer prompts (>100 chars) → complex
 * - Reasoning depth: Multi-step reasoning indicators → complex
 * - Quality threshold: High standards (≥70) → complex
 * - Task type: Classification → simple, Evaluation → complex
 *
 * References:
 * - https://dev.to/superorange0707/choosing-an-llm-in-2026-the-practical-comparison-table-specs-cost-latency-compatibility-354g
 * - https://arxiv.org/html/2503.01141v1 (Token Complexity)
 * - https://ai-sdk.dev/docs/introduction (Vercel AI SDK)
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
		return complexity === "simple"
			? "claude-haiku-4-5-20251001"  // Fast ($0.25/$1.25 per M tokens), 80% HumanEval
			: "claude-sonnet-4-5-20250929"; // Balanced, 50.4% grad-level reasoning
	}

	// OpenAI
	return complexity === "simple"
		? "gpt-4o-mini"  // Fast ($0.15/$0.60 per M tokens)
		: "gpt-4o";      // Powerful, best for reasoning
}
