import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateLLMCondition } from "../src/modules/rules/engine/llm-evaluator";
import * as aiProvider from "../src/modules/rules/engine/ai-provider";

// Mock AI provider
vi.mock("../src/modules/rules/engine/ai-provider", () => ({
	isAIConfigured: vi.fn(() => true),
	getModel: vi.fn(() => "mock-model"),
}));

// Mock AI SDK
vi.mock("ai", () => ({
	generateObject: vi.fn(async () => ({
		object: {
			match: true,
			confidence: 0.95,
			reasoning: "The documentation is thorough and professional.",
		},
	})),
}));

describe("LLM Evaluation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should evaluate documentation with LLM operator", async () => {
		const result = await evaluateLLMCondition(
			"Comprehensive shift notes with safety checklist completed.",
			"Is this documentation thorough?",
		);

		expect(result.match).toBe(true);
		expect(result.confidence).toBeGreaterThan(0.9);
		expect(result.reasoning).toContain("thorough");
	});

	it("should skip evaluation when AI not configured", async () => {
		vi.mocked(aiProvider.isAIConfigured).mockReturnValueOnce(false);

		const result = await evaluateLLMCondition(
			"Some text",
			"Is this helpful?",
		);

		expect(result.match).toBe(false);
		expect(result.confidence).toBe(0);
		expect(result.reasoning).toBe("Skipped");
	});

	it("should skip evaluation when field value is null", async () => {
		const result = await evaluateLLMCondition(null, "Is this helpful?");

		expect(result.match).toBe(false);
		expect(result.confidence).toBe(0);
		expect(result.reasoning).toBe("Skipped");
	});
});
