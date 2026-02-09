import { evaluateLLMCondition } from "../src/modules/rules/engine/llm-evaluator";
import * as aiProvider from "../src/modules/rules/engine/ai-provider";

// Mock AI provider
jest.mock("../src/modules/rules/engine/ai-provider", () => ({
	isAIConfigured: jest.fn(() => true),
	getModel: jest.fn(() => "mock-model"),
}));

// Mock AI SDK
jest.mock("ai", () => ({
	generateObject: jest.fn(async () => ({
		object: {
			thinking: "The documentation mentions a safety checklist was completed.",
			match: true,
			confidence: 0.95,
			reasoning: "The documentation is thorough and professional.",
		},
	})),
}));

// Mock llm-cache (avoid side effects)
jest.mock("../src/modules/rules/engine/llm-cache", () => ({
	checkCache: jest.fn(() => null),
	storeInCache: jest.fn(),
}));

// Mock llm-analytics (avoid side effects)
jest.mock("../src/modules/rules/engine/llm-analytics", () => ({
	trackLLMCall: jest.fn(),
	estimateCost: jest.fn(() => 0),
}));

describe("LLM Evaluation", () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
		jest.mocked(aiProvider.isAIConfigured).mockReturnValueOnce(false);

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
