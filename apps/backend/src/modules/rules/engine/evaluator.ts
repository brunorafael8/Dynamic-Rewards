import { eq, inArray, sql } from "drizzle-orm";
import pLimit from "p-limit";
import { db } from "../../../db";
import {
	employees,
	events,
	rewardGrants,
	rewardRules,
} from "../../../db/schema";
import {
	evaluateLLMCondition,
	evaluateQualityScore,
	evaluateSentiment,
	getLLMConditions,
	hasLLMConditions,
} from "./llm-evaluator";
import { evaluateAllConditions } from "./operators";
import type { Condition, LLMEvaluation, ProcessResult } from "./types";

const LLM_CONCURRENCY = 5;
const llmLimit = pLimit(LLM_CONCURRENCY);

function eventToRecord(
	event: typeof events.$inferSelect,
): Record<string, unknown> {
	return {
		id: event.id,
		employee_id: event.employee_id,
		type: event.type,
		timestamp: event.timestamp,
		...event.metadata, // Spread metadata fields to top level
		createdAt: event.createdAt,
		updatedAt: event.updatedAt,
	};
}

function dispatchLLMCondition(
	condition: Condition,
	fieldValue: string | null,
): Promise<LLMEvaluation> {
	switch (condition.op) {
		case "sentiment":
			return evaluateSentiment(fieldValue, condition.value as string);
		case "quality_score":
			return evaluateQualityScore(fieldValue, condition.value as number);
		default:
			return evaluateLLMCondition(fieldValue, condition.value as string);
	}
}

async function evaluateLLMConditionsForEvent(
	conditions: Condition[],
	record: Record<string, unknown>,
): Promise<boolean> {
	const llmConditions = getLLMConditions(conditions);
	if (llmConditions.length === 0) return true;

	// Process LLM conditions in parallel with concurrency limit
	const results = await Promise.all(
		llmConditions.map((condition) =>
			llmLimit(() => {
				const fieldValue = record[condition.field] as string | null;
				return dispatchLLMCondition(condition, fieldValue);
			}),
		),
	);

	// All LLM conditions must match
	return results.every((result) => result.match);
}

export async function processEvents(
	eventIds?: string[],
): Promise<ProcessResult> {
	const start = Date.now();
	const result: ProcessResult = {
		totalEvents: 0,
		totalRulesEvaluated: 0,
		grantsCreated: 0,
		totalPointsAwarded: 0,
		skippedExisting: 0,
		errors: [],
		durationMs: 0,
	};

	// 1. Fetch active rules
	const rules = await db
		.select()
		.from(rewardRules)
		.where(eq(rewardRules.active, true));

	if (rules.length === 0) {
		result.durationMs = Date.now() - start;
		return result;
	}

	// 2. Fetch events
	const eventList = eventIds
		? await db.select().from(events).where(inArray(events.id, eventIds))
		: await db.select().from(events);

	result.totalEvents = eventList.length;

	if (eventList.length === 0) {
		result.durationMs = Date.now() - start;
		return result;
	}

	// 3. Fetch existing grants in bulk (for idempotency check)
	const existingGrants = await db
		.select({
			rule_id: rewardGrants.rule_id,
			event_id: rewardGrants.event_id,
		})
		.from(rewardGrants);

	const existingSet = new Set(
		existingGrants.map((g) => `${g.rule_id}:${g.event_id}`),
	);

	// 4. Evaluate rules against events
	const grantsToInsert: Array<{
		rule_id: string;
		employee_id: string;
		event_id: string;
		points_awarded: number;
	}> = [];

	// Track points per employee for batch update
	const pointsDelta: Record<string, number> = {};

	for (const event of eventList) {
		const record = eventToRecord(event);

		for (const rule of rules) {
			result.totalRulesEvaluated++;

			const grantKey = `${rule.id}:${event.id}`;
			if (existingSet.has(grantKey)) {
				result.skippedExisting++;
				continue;
			}

			const conditions = rule.conditions as Condition[];

			// Evaluate static conditions first (fast)
			const staticMatch = evaluateAllConditions(conditions, record);
			if (!staticMatch) continue;

			// Then evaluate LLM conditions if needed (slow)
			if (hasLLMConditions(conditions)) {
				try {
					const llmMatch = await evaluateLLMConditionsForEvent(
						conditions,
						record,
					);
					if (!llmMatch) continue;
				} catch (err) {
					result.errors.push(
						`LLM error for event ${event.id}: ${(err as Error).message}`,
					);
					continue;
				}
			}

			// Match! Prepare grant
			grantsToInsert.push({
				rule_id: rule.id,
				employee_id: event.employee_id,
				event_id: event.id,
				points_awarded: rule.points,
			});

			pointsDelta[event.employee_id] =
				(pointsDelta[event.employee_id] || 0) + rule.points;
		}
	}

	// 5. Batch insert grants and update balances in transaction (atomicity)
	if (grantsToInsert.length > 0) {
		const CHUNK_SIZE = 500;

		await db.transaction(async (tx) => {
			// Insert grants in chunks
			for (let i = 0; i < grantsToInsert.length; i += CHUNK_SIZE) {
				const chunk = grantsToInsert.slice(i, i + CHUNK_SIZE);
				await tx.insert(rewardGrants).values(chunk);
			}

			// Update employee balances
			for (const [employeeId, delta] of Object.entries(pointsDelta)) {
				await tx
					.update(employees)
					.set({
						point_balance: sql`${employees.point_balance} + ${delta}`,
						updatedAt: new Date(),
					})
					.where(eq(employees.id, employeeId));
			}
		});

		result.grantsCreated = grantsToInsert.length;
		result.totalPointsAwarded = Object.values(pointsDelta).reduce(
			(sum, d) => sum + d,
			0,
		);
	}

	result.durationMs = Date.now() - start;
	return result;
}
