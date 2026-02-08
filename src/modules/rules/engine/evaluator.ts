import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
	profiles,
	rewardGrants,
	rewardRules,
	visits,
} from "../../../db/schema";
import {
	evaluateLLMCondition,
	getLLMConditions,
	hasLLMConditions,
} from "./llm-evaluator";
import { evaluateAllConditions } from "./operators";
import type { Condition, ProcessResult } from "./types";

// TODO: Implement LLM concurrency throttling
// const LLM_CONCURRENCY = 5;

function visitToRecord(
	visit: typeof visits.$inferSelect,
): Record<string, unknown> {
	return {
		id: visit.id,
		profileId: visit.profileId,
		clockInTime: visit.clockInTime,
		clockOutTime: visit.clockOutTime,
		scheduledStartTime: visit.scheduledStartTime,
		scheduledEndTime: visit.scheduledEndTime,
		correctClockInMethod: visit.correctClockInMethod,
		documentation: visit.documentation,
		createdAt: visit.createdAt,
		updatedAt: visit.updatedAt,
	};
}

async function evaluateLLMConditionsForVisit(
	conditions: Condition[],
	record: Record<string, unknown>,
): Promise<boolean> {
	const llmConditions = getLLMConditions(conditions);
	if (llmConditions.length === 0) return true;

	for (const condition of llmConditions) {
		const fieldValue = record[condition.field];
		const result = await evaluateLLMCondition(
			fieldValue as string | null,
			condition.value as string,
		);
		if (!result) return false;
	}
	return true;
}

export async function processVisits(
	visitIds?: string[],
): Promise<ProcessResult> {
	const start = Date.now();
	const result: ProcessResult = {
		totalVisits: 0,
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

	// 2. Fetch visits
	const visitList = visitIds
		? await db.select().from(visits).where(inArray(visits.id, visitIds))
		: await db.select().from(visits);

	result.totalVisits = visitList.length;

	if (visitList.length === 0) {
		result.durationMs = Date.now() - start;
		return result;
	}

	// 3. Fetch existing grants in bulk (for idempotency check)
	const existingGrants = await db
		.select({
			ruleId: rewardGrants.ruleId,
			visitId: rewardGrants.visitId,
		})
		.from(rewardGrants);

	const existingSet = new Set(
		existingGrants.map((g) => `${g.ruleId}:${g.visitId}`),
	);

	// 4. Evaluate rules against visits
	const grantsToInsert: Array<{
		ruleId: string;
		profileId: string;
		visitId: string;
		pointsAwarded: number;
	}> = [];

	// Track points per profile for batch update
	const pointsDelta: Record<string, number> = {};

	for (const visit of visitList) {
		const record = visitToRecord(visit);

		for (const rule of rules) {
			result.totalRulesEvaluated++;

			const grantKey = `${rule.id}:${visit.id}`;
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
					const llmMatch = await evaluateLLMConditionsForVisit(
						conditions,
						record,
					);
					if (!llmMatch) continue;
				} catch (err) {
					result.errors.push(
						`LLM error for visit ${visit.id}: ${(err as Error).message}`,
					);
					continue;
				}
			}

			// Match! Prepare grant
			grantsToInsert.push({
				ruleId: rule.id,
				profileId: visit.profileId,
				visitId: visit.id,
				pointsAwarded: rule.points,
			});

			pointsDelta[visit.profileId] =
				(pointsDelta[visit.profileId] || 0) + rule.points;
		}
	}

	// 5. Batch insert grants and update balances in chunks
	if (grantsToInsert.length > 0) {
		const CHUNK_SIZE = 500;

		for (let i = 0; i < grantsToInsert.length; i += CHUNK_SIZE) {
			const chunk = grantsToInsert.slice(i, i + CHUNK_SIZE);
			await db.insert(rewardGrants).values(chunk);
		}

		// Update profile balances
		for (const [profileId, delta] of Object.entries(pointsDelta)) {
			await db
				.update(profiles)
				.set({
					pointBalance: sql`${profiles.pointBalance} + ${delta}`,
					updatedAt: new Date(),
				})
				.where(eq(profiles.id, profileId));
		}

		result.grantsCreated = grantsToInsert.length;
		result.totalPointsAwarded = Object.values(pointsDelta).reduce(
			(sum, d) => sum + d,
			0,
		);
	}

	result.durationMs = Date.now() - start;
	return result;
}
