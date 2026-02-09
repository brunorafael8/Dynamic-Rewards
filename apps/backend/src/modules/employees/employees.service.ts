import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { employees, rewardGrants, rewardRules } from "../../db/schema";
import { NotFoundError } from "../../shared/errors";

export async function listEmployees(limit: number, offset: number) {
	const data = await db
		.select()
		.from(employees)
		.orderBy(desc(employees.point_balance))
		.limit(limit)
		.offset(offset);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(employees);

	return { data, meta: { total: count, limit, offset } };
}

export async function getEmployee(id: string) {
	const [employee] = await db.select().from(employees).where(eq(employees.id, id));

	if (!employee) {
		throw new NotFoundError("Employee", id);
	}

	const grants = await db
		.select({
			id: rewardGrants.id,
			ruleName: rewardRules.name,
			pointsAwarded: rewardGrants.points_awarded,
			eventId: rewardGrants.event_id,
			createdAt: rewardGrants.createdAt,
		})
		.from(rewardGrants)
		.innerJoin(rewardRules, eq(rewardGrants.rule_id, rewardRules.id))
		.where(eq(rewardGrants.employee_id, id))
		.orderBy(desc(rewardGrants.createdAt));

	return { ...employee, grants };
}
