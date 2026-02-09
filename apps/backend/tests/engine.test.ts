import {
	evaluateAllConditions,
	evaluateCondition,
} from "../src/modules/rules/engine/operators";
import { buildCondition, buildEvent } from "./helpers";

describe("Rule Engine - Operators", () => {
	describe("eq operator", () => {
		it("should match when values are equal", () => {
			const record = buildEvent({ correctClockInMethod: true });
			const condition = buildCondition("correctClockInMethod", "eq", true);
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when values differ", () => {
			const record = buildEvent({ correctClockInMethod: false });
			const condition = buildCondition("correctClockInMethod", "eq", true);
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("neq operator", () => {
		it("should match when values are different", () => {
			const record = buildEvent({ documentation: "Some text" });
			const condition = buildCondition("documentation", "neq", null);
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when values are equal", () => {
			const record = buildEvent({ documentation: null });
			const condition = buildCondition("documentation", "neq", null);
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("not_null operator", () => {
		it("should match when field has a value", () => {
			const record = buildEvent({ clockInTime: new Date() });
			const condition = buildCondition("clockInTime", "not_null");
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when field is null", () => {
			const record = buildEvent({ clockInTime: null });
			const condition = buildCondition("clockInTime", "not_null");
			expect(evaluateCondition(condition, record)).toBe(false);
		});

		it("should not match when field is undefined", () => {
			const record = buildEvent({ clockInTime: undefined });
			const condition = buildCondition("clockInTime", "not_null");
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("is_null operator", () => {
		it("should match when field is null", () => {
			const record = buildEvent({ documentation: null });
			const condition = buildCondition("documentation", "is_null");
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when field has value", () => {
			const record = buildEvent({ documentation: "text" });
			const condition = buildCondition("documentation", "is_null");
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("lte_field operator", () => {
		it("should match when field <= other field (early clock-in)", () => {
			const clockIn = new Date("2024-01-15T08:00:00Z");
			const scheduled = new Date("2024-01-15T09:00:00Z");
			const record = buildEvent({
				clockInTime: clockIn,
				scheduledStartTime: scheduled,
			});
			const condition = buildCondition(
				"clockInTime",
				"lte_field",
				"scheduledStartTime",
			);
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when field > other field (late clock-in)", () => {
			const clockIn = new Date("2024-01-15T10:00:00Z");
			const scheduled = new Date("2024-01-15T09:00:00Z");
			const record = buildEvent({
				clockInTime: clockIn,
				scheduledStartTime: scheduled,
			});
			const condition = buildCondition(
				"clockInTime",
				"lte_field",
				"scheduledStartTime",
			);
			expect(evaluateCondition(condition, record)).toBe(false);
		});

		it("should return false when other field is missing", () => {
			const record = buildEvent({ clockInTime: new Date() });
			const condition = buildCondition(
				"clockInTime",
				"lte_field",
				"nonExistentField",
			);
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("gte_field operator", () => {
		it("should match when field >= other field", () => {
			const clockOut = new Date("2024-01-15T18:00:00Z");
			const scheduled = new Date("2024-01-15T17:00:00Z");
			const record = buildEvent({
				clockOutTime: clockOut,
				scheduledEndTime: scheduled,
			});
			const condition = buildCondition(
				"clockOutTime",
				"gte_field",
				"scheduledEndTime",
			);
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when field < other field", () => {
			const clockOut = new Date("2024-01-15T16:00:00Z");
			const scheduled = new Date("2024-01-15T17:00:00Z");
			const record = buildEvent({
				clockOutTime: clockOut,
				scheduledEndTime: scheduled,
			});
			const condition = buildCondition(
				"clockOutTime",
				"gte_field",
				"scheduledEndTime",
			);
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("contains operator", () => {
		it("should match when string contains substring (case insensitive)", () => {
			const record = buildEvent({ documentation: "Follow-up needed" });
			const condition = buildCondition(
				"documentation",
				"contains",
				"follow-up",
			);
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should match with different casing", () => {
			const record = buildEvent({ documentation: "URGENT CASE" });
			const condition = buildCondition("documentation", "contains", "urgent");
			expect(evaluateCondition(condition, record)).toBe(true);
		});

		it("should not match when substring is not found", () => {
			const record = buildEvent({ documentation: "Regular visit" });
			const condition = buildCondition("documentation", "contains", "urgent");
			expect(evaluateCondition(condition, record)).toBe(false);
		});

		it("should return false for non-string fields", () => {
			const record = buildEvent({ correctClockInMethod: true });
			const condition = buildCondition(
				"correctClockInMethod",
				"contains",
				"true",
			);
			expect(evaluateCondition(condition, record)).toBe(false);
		});
	});

	describe("gt/gte/lt/lte operators", () => {
		it("should work with numbers", () => {
			const record = { pointBalance: 100 };
			expect(
				evaluateCondition(buildCondition("pointBalance", "gt", 50), record),
			).toBe(true);
			expect(
				evaluateCondition(buildCondition("pointBalance", "gte", 100), record),
			).toBe(true);
			expect(
				evaluateCondition(buildCondition("pointBalance", "lt", 200), record),
			).toBe(true);
			expect(
				evaluateCondition(buildCondition("pointBalance", "lte", 100), record),
			).toBe(true);
		});

		it("should return false for null values", () => {
			const record = { pointBalance: null };
			expect(
				evaluateCondition(buildCondition("pointBalance", "gt", 50), record),
			).toBe(false);
		});
	});

	describe("evaluateAllConditions", () => {
		it("should return true when all conditions match (AND logic)", () => {
			const record = buildEvent({
				correctClockInMethod: true,
				documentation: "Completed",
			});
			const conditions = [
				buildCondition("correctClockInMethod", "eq", true),
				buildCondition("documentation", "not_null"),
			];
			expect(evaluateAllConditions(conditions, record)).toBe(true);
		});

		it("should return false when any condition fails", () => {
			const record = buildEvent({
				correctClockInMethod: false,
				documentation: "Completed",
			});
			const conditions = [
				buildCondition("correctClockInMethod", "eq", true),
				buildCondition("documentation", "not_null"),
			];
			expect(evaluateAllConditions(conditions, record)).toBe(false);
		});

		it("should return true for empty conditions array", () => {
			const record = buildEvent();
			expect(evaluateAllConditions([], record)).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should return false for unknown operator", () => {
			const record = buildEvent();
			const condition = buildCondition("field", "unknown_op", "value");
			expect(evaluateCondition(condition, record)).toBe(false);
		});

		it("should return false when field does not exist", () => {
			const record = buildEvent();
			const condition = buildCondition("nonExistentField", "eq", true);
			expect(evaluateCondition(condition, record)).toBe(false);
		});

		it("should skip LLM conditions (handled separately)", () => {
			const record = buildEvent({ documentation: "Some text" });
			const condition = buildCondition(
				"documentation",
				"llm",
				"Is this helpful?",
			);
			expect(evaluateCondition(condition, record)).toBe(true);
		});
	});
});
