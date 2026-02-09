import { z } from "zod/v4";

const OPERATORS = [
	"eq",
	"neq",
	"gt",
	"gte",
	"lt",
	"lte",
	"not_null",
	"is_null",
	"lte_field",
	"gte_field",
	"contains",
	"llm",
	"sentiment",
	"quality_score",
] as const;

export type Operator = (typeof OPERATORS)[number];

const conditionSchema = z.object({
	field: z.string(),
	op: z.enum(OPERATORS),
	value: z.any().optional(),
});

export type Condition = z.infer<typeof conditionSchema>;

export const createRuleBody = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	event_type: z.string().default("shift"),
	conditions: z.array(conditionSchema).min(1),
	points: z.number().int().positive(),
});

export const updateRuleBody = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	event_type: z.string().optional(),
	conditions: z.array(conditionSchema).min(1).optional(),
	points: z.number().int().positive().optional(),
	active: z.boolean().optional(),
});

export const ruleParams = z.object({
	id: z.string().uuid(),
});

export const listRulesQuery = z.object({
	active: z
		.enum(["true", "false"])
		.transform((v) => v === "true")
		.optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});
