import { z } from "zod";

// Condition schema
export const conditionSchema = z.object({
  field: z.string(),
  op: z.enum([
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
  ]),
  value: z.unknown().optional(),
});

// Create rule schema
export const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  event_type: z.string().default("shift"),
  conditions: z.array(conditionSchema).min(1),
  points: z.number().int().positive(),
});

// Update rule schema
export const updateRuleSchema = createRuleSchema.partial();

export type ConditionInput = z.infer<typeof conditionSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
