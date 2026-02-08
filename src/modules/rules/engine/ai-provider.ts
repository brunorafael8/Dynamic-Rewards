import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

type ProviderFactory = (apiKey: string) => (modelId: string) => LanguageModel;

const providers: Record<string, ProviderFactory> = {
	openai: (apiKey) => createOpenAI({ apiKey }),
	anthropic: (apiKey) => createAnthropic({ apiKey }),
};

function getApiKey(): string | undefined {
	return process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
}

export function isAIConfigured(): boolean {
	return !!getApiKey();
}

export function getModel(): LanguageModel {
	const apiKey = getApiKey();
	if (!apiKey) throw new Error("No AI API key configured");

	const providerName = process.env.AI_PROVIDER || "openai";
	const modelId = process.env.AI_MODEL || "gpt-4o-mini";

	const factory = providers[providerName];
	if (!factory) {
		const supported = Object.keys(providers).join(", ");
		throw new Error(
			`Unknown AI provider: ${providerName}. Supported: ${supported}`,
		);
	}

	return factory(apiKey)(modelId);
}
