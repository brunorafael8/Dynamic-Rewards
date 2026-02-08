import type { Condition } from "./types";

type OperatorFn = (
	fieldValue: unknown,
	conditionValue: unknown,
	record: Record<string, unknown>,
) => boolean;

const operators: Record<string, OperatorFn> = {
	eq: (fieldValue, condValue) => fieldValue === condValue,

	neq: (fieldValue, condValue) => fieldValue !== condValue,

	gt: (fieldValue, condValue) => {
		if (fieldValue == null || condValue == null) return false;
		return (fieldValue as number) > (condValue as number);
	},

	gte: (fieldValue, condValue) => {
		if (fieldValue == null || condValue == null) return false;
		return (fieldValue as number) >= (condValue as number);
	},

	lt: (fieldValue, condValue) => {
		if (fieldValue == null || condValue == null) return false;
		return (fieldValue as number) < (condValue as number);
	},

	lte: (fieldValue, condValue) => {
		if (fieldValue == null || condValue == null) return false;
		return (fieldValue as number) <= (condValue as number);
	},

	not_null: (fieldValue) => fieldValue != null,

	is_null: (fieldValue) => fieldValue == null,

	lte_field: (fieldValue, condValue, record) => {
		if (typeof condValue !== "string") return false;
		const otherValue = record[condValue];
		if (fieldValue == null || otherValue == null) return false;
		return (fieldValue as number) <= (otherValue as number);
	},

	gte_field: (fieldValue, condValue, record) => {
		if (typeof condValue !== "string") return false;
		const otherValue = record[condValue];
		if (fieldValue == null || otherValue == null) return false;
		return (fieldValue as number) >= (otherValue as number);
	},

	contains: (fieldValue, condValue) => {
		if (typeof fieldValue !== "string" || typeof condValue !== "string")
			return false;
		return fieldValue.toLowerCase().includes(condValue.toLowerCase());
	},
};

export function evaluateCondition(
	condition: Condition,
	record: Record<string, unknown>,
): boolean {
	// LLM conditions are handled separately
	if (condition.op === "llm") return true;

	const operatorFn = operators[condition.op];
	if (!operatorFn) return false;

	const fieldValue = record[condition.field];
	return operatorFn(fieldValue, condition.value, record);
}

export function evaluateAllConditions(
	conditions: Condition[],
	record: Record<string, unknown>,
): boolean {
	return conditions.every((c) => evaluateCondition(c, record));
}

// Expose for extensibility: register custom operators at runtime
export function registerOperator(name: string, fn: OperatorFn) {
	operators[name] = fn;
}
