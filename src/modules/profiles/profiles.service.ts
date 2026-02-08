import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { profiles, rewardGrants, rewardRules } from "../../db/schema";
import { NotFoundError } from "../../shared/errors";

export async function listProfiles(limit: number, offset: number) {
	const data = await db
		.select()
		.from(profiles)
		.orderBy(desc(profiles.pointBalance))
		.limit(limit)
		.offset(offset);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(profiles);

	return { data, meta: { total: count, limit, offset } };
}

export async function getProfile(id: string) {
	const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));

	if (!profile) {
		throw new NotFoundError("Profile", id);
	}

	const grants = await db
		.select({
			id: rewardGrants.id,
			ruleName: rewardRules.name,
			pointsAwarded: rewardGrants.pointsAwarded,
			visitId: rewardGrants.visitId,
			createdAt: rewardGrants.createdAt,
		})
		.from(rewardGrants)
		.innerJoin(rewardRules, eq(rewardGrants.ruleId, rewardRules.id))
		.where(eq(rewardGrants.profileId, id))
		.orderBy(desc(rewardGrants.createdAt));

	return { ...profile, grants };
}
