import { evaluateCondition } from "./operators";
import {
	evaluateLLMCondition,
	evaluateQualityScore,
	evaluateSentiment,
} from "./llm-evaluator";
import type {
	Condition,
	LLMOperator,
	SimulationConditionResult,
	SimulationResult,
} from "./types";
import { LLM_OPERATORS } from "./types";

function isLLMOperator(op: string): op is LLMOperator {
	return LLM_OPERATORS.includes(op as LLMOperator);
}

async function evaluateSingleCondition(
	condition: Condition,
	record: Record<string, unknown>,
): Promise<SimulationConditionResult> {
	const fieldValue = record[condition.field];

	if (isLLMOperator(condition.op)) {
		const strValue = fieldValue as string | null;
		let result: { match: boolean; reasoning: string };

		switch (condition.op) {
			case "sentiment":
				result = await evaluateSentiment(
					strValue,
					condition.value as string,
				);
				break;
			case "quality_score":
				result = await evaluateQualityScore(
					strValue,
					condition.value as number,
				);
				break;
			default:
				result = await evaluateLLMCondition(
					strValue,
					condition.value as string,
				);
				break;
		}

		return {
			field: condition.field,
			op: condition.op,
			value: condition.value,
			actual: fieldValue ?? null,
			passed: result.match,
			reasoning: result.reasoning,
		};
	}

	// Static condition
	const passed = evaluateCondition(condition, record);

	return {
		field: condition.field,
		op: condition.op,
		value: condition.value,
		actual: fieldValue ?? null,
		passed,
	};
}

export async function simulateRule(
	conditions: Condition[],
	metadata: Record<string, unknown>,
): Promise<SimulationResult> {
	const start = Date.now();

	if (conditions.length === 0) {
		return {
			matches: true,
			conditionResults: [],
			durationMs: Date.now() - start,
		};
	}

	const conditionResults: SimulationConditionResult[] = [];

	for (const condition of conditions) {
		try {
			const result = await evaluateSingleCondition(condition, metadata);
			conditionResults.push(result);
		} catch (err) {
			conditionResults.push({
				field: condition.field,
				op: condition.op,
				value: condition.value,
				actual: metadata[condition.field] ?? null,
				passed: false,
				reasoning: `Error: ${(err as Error).message}`,
			});
		}
	}

	const matches = conditionResults.every((r) => r.passed);

	return {
		matches,
		conditionResults,
		durationMs: Date.now() - start,
	};
}
