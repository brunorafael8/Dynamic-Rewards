export interface Condition {
	field: string;
	op: string;
	value?: unknown;
}

export interface RuleBreakdown {
	ruleId: string;
	ruleName: string;
	matchCount: number;
	pointsAwarded: number;
}

export interface ProcessResult {
	totalEvents: number;
	totalRulesEvaluated: number;
	grantsCreated: number;
	totalPointsAwarded: number;
	skippedExisting: number;
	errors: string[];
	durationMs: number;
	ruleBreakdown: RuleBreakdown[];
}

export interface SimulationConditionResult {
	field: string;
	op: string;
	value: unknown;
	actual: unknown;
	passed: boolean;
	reasoning?: string;
}

export interface SimulationResult {
	matches: boolean;
	conditionResults: SimulationConditionResult[];
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
