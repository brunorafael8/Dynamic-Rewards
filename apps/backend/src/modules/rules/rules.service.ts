import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { rewardRules } from "../../db/schema";
import { NotFoundError } from "../../shared/errors";
import type { Condition } from "./rules.schema";

interface CreateRuleInput {
	name: string;
	description?: string;
	eventType: string;
	conditions: Condition[];
	points: number;
}

interface UpdateRuleInput {
	name?: string;
	description?: string;
	eventType?: string;
	conditions?: Condition[];
	points?: number;
	active?: boolean;
}

export async function createRule(input: CreateRuleInput) {
	const [rule] = await db
		.insert(rewardRules)
		.values({
			name: input.name,
			description: input.description,
			eventType: input.eventType,
			conditions: input.conditions,
			points: input.points,
		})
		.returning();

	return rule;
}

export async function listRules(
	filters: { active?: boolean },
	limit: number,
	offset: number,
) {
	const conditions = [];
	if (filters.active !== undefined) {
		conditions.push(eq(rewardRules.active, filters.active));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const data = await db
		.select()
		.from(rewardRules)
		.where(whereClause)
		.orderBy(desc(rewardRules.createdAt))
		.limit(limit)
		.offset(offset);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(rewardRules)
		.where(whereClause);

	return { data, meta: { total: count, limit, offset } };
}

export async function getRule(id: string) {
	const [rule] = await db
		.select()
		.from(rewardRules)
		.where(eq(rewardRules.id, id));

	if (!rule) {
		throw new NotFoundError("Rule", id);
	}

	return rule;
}

export async function updateRule(id: string, input: UpdateRuleInput) {
	await getRule(id); // Verify exists

	const [updated] = await db
		.update(rewardRules)
		.set({
			...input,
			updatedAt: new Date(),
		})
		.where(eq(rewardRules.id, id))
		.returning();

	return updated;
}

export async function deleteRule(id: string) {
	await getRule(id); // Verify exists

	const [updated] = await db
		.update(rewardRules)
		.set({ active: false, updatedAt: new Date() })
		.where(eq(rewardRules.id, id))
		.returning();

	return updated;
}
