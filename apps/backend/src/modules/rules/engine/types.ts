export interface Condition {
	field: string;
	op: string;
	value?: unknown;
}

export interface ProcessResult {
	totalEvents: number;
	totalRulesEvaluated: number;
	grantsCreated: number;
	totalPointsAwarded: number;
	skippedExisting: number;
	errors: string[];
	durationMs: number;
}

export interface LLMEvaluation {
	match: boolean;
	confidence: number;
	reasoning: string;
}

export type LLMOperator = "llm" | "sentiment" | "quality_score";

export const LLM_OPERATORS: LLMOperator[] = [
	"llm",
	"sentiment",
	"quality_score",
];
