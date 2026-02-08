import OpenAI from "openai";
import type { Condition } from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
	if (!process.env.OPENAI_API_KEY) return null;

	if (!client) {
		client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	}
	return client;
}

export function hasLLMConditions(conditions: Condition[]): boolean {
	return conditions.some((c) => c.op === "llm");
}

export function getLLMConditions(conditions: Condition[]): Condition[] {
	return conditions.filter((c) => c.op === "llm");
}

export async function evaluateLLMCondition(
	fieldValue: string | null,
	prompt: string,
): Promise<boolean> {
	const openai = getClient();
	if (!openai) return false;

	if (!fieldValue) return false;

	try {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a judge evaluating employee visit data. Respond with ONLY 'true' or 'false', nothing else.",
				},
				{
					role: "user",
					content: `${prompt}\n\nContent to evaluate:\n"${fieldValue}"`,
				},
			],
			temperature: 0,
			max_tokens: 5,
		});

		const answer = response.choices[0]?.message?.content?.trim().toLowerCase();
		return answer === "true";
	} catch (err) {
		// Don't break the pipeline on LLM failures
		console.error("LLM evaluation failed:", (err as Error).message);
		return false;
	}
}
