export interface Condition {
	field: string;
	op: string;
	value?: unknown;
}

export interface ProcessResult {
	totalVisits: number;
	totalRulesEvaluated: number;
	grantsCreated: number;
	totalPointsAwarded: number;
	skippedExisting: number;
	errors: string[];
	durationMs: number;
}
