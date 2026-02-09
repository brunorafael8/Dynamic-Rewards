import { simulateRule } from "../src/modules/rules/engine/simulator";
import type { Condition } from "../src/modules/rules/engine/types";
import { buildCondition, buildEvent } from "./helpers";

// Mock LLM dependencies (avoid real API calls)
jest.mock("../src/modules/rules/engine/ai-provider", () => ({
	isAIConfigured: jest.fn(() => true),
	getModel: jest.fn(() => "mock-model"),
}));

jest.mock("ai", () => ({
	generateObject: jest.fn(async () => ({
		object: {
			thinking: "Step by step analysis of the documentation.",
			match: true,
			confidence: 0.92,
			reasoning: "Documentation is thorough and helpful.",
		},
	})),
}));

jest.mock("../src/modules/rules/engine/llm-cache", () => ({
	checkCache: jest.fn(() => null),
	storeInCache: jest.fn(),
}));

jest.mock("../src/modules/rules/engine/llm-analytics", () => ({
	trackLLMCall: jest.fn(),
	estimateCost: jest.fn(() => 0),
}));

describe("Rule Simulator", () => {
	it("should return all conditions passing when metadata matches", async () => {
		const conditions: Condition[] = [
			buildCondition("correctClockInMethod", "eq", true),
			buildCondition("documentation", "not_null"),
		];
		const metadata = buildEvent();

		const result = await simulateRule(conditions, metadata);

		expect(result.matches).toBe(true);
		expect(result.conditionResults).toHaveLength(2);
		expect(result.conditionResults[0].passed).toBe(true);
		expect(result.conditionResults[1].passed).toBe(true);
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("should return false when one condition fails", async () => {
		const conditions: Condition[] = [
			buildCondition("correctClockInMethod", "eq", true),
			buildCondition("documentation", "contains", "nonexistent text"),
		];
		const metadata = buildEvent();

		const result = await simulateRule(conditions, metadata);

		expect(result.matches).toBe(false);
		expect(result.conditionResults[0].passed).toBe(true);
		expect(result.conditionResults[1].passed).toBe(false);
		expect(result.conditionResults[1].actual).toBe("Patient visit completed");
	});

	it("should match when conditions array is empty", async () => {
		const result = await simulateRule([], {});

		expect(result.matches).toBe(true);
		expect(result.conditionResults).toHaveLength(0);
	});

	it("should include actual field values in results", async () => {
		const conditions: Condition[] = [
			buildCondition("correctClockInMethod", "eq", false),
		];
		const metadata = buildEvent({ correctClockInMethod: true });

		const result = await simulateRule(conditions, metadata);

		expect(result.matches).toBe(false);
		expect(result.conditionResults[0].actual).toBe(true);
		expect(result.conditionResults[0].value).toBe(false);
	});

	it("should evaluate LLM conditions and include reasoning", async () => {
		const conditions: Condition[] = [
			buildCondition("documentation", "llm", "Is this documentation helpful?"),
		];
		const metadata = buildEvent();

		const result = await simulateRule(conditions, metadata);

		expect(result.matches).toBe(true);
		expect(result.conditionResults[0].passed).toBe(true);
		expect(result.conditionResults[0].reasoning).toBeDefined();
		expect(result.conditionResults[0].reasoning).toContain("thorough");
	});

	it("should handle missing fields gracefully", async () => {
		const conditions: Condition[] = [
			buildCondition("nonexistent", "eq", "value"),
		];

		const result = await simulateRule(conditions, {});

		expect(result.matches).toBe(false);
		expect(result.conditionResults[0].actual).toBeNull();
		expect(result.conditionResults[0].passed).toBe(false);
	});
});
