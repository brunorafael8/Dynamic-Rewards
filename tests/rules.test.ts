import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { profiles, rewardGrants, rewardRules, visits } from "../src/db/schema";
import { processVisits } from "../src/modules/rules/engine/evaluator";

describe("Rule Engine - Integration", () => {
	let testProfileId: string;
	let testVisitId: string;

	beforeEach(async () => {
		// Clean tables (cascade to handle FK constraints)
		await db.execute(
			sql`TRUNCATE reward_grants, visits, reward_rules, profiles CASCADE`,
		);

		// Seed test profile
		const [profile] = await db
			.insert(profiles)
			.values({
				name: "Test User",
				pointBalance: 0,
				onboarded: true,
			})
			.returning();
		testProfileId = profile.id;

		// Seed test visit
		const [visit] = await db
			.insert(visits)
			.values({
				profileId: testProfileId,
				clockInTime: new Date("2024-01-15T08:00:00Z"),
				scheduledStartTime: new Date("2024-01-15T09:00:00Z"),
				correctClockInMethod: true,
				documentation: "Follow-up needed",
			})
			.returning();
		testVisitId = visit.id;
	});

	afterAll(async () => {
		await db.execute(
			sql`TRUNCATE reward_grants, visits, reward_rules, profiles CASCADE`,
		);
	});

	it("should create grant and update balance when rule matches", async () => {
		// Create rule
		await db.insert(rewardRules).values({
			name: "Correct Clock-In Method",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: true,
		});

		// Process visits
		const result = await processVisits();

		expect(result.totalVisits).toBe(1);
		expect(result.grantsCreated).toBe(1);
		expect(result.totalPointsAwarded).toBe(10);

		// Verify grant created
		const grants = await db.select().from(rewardGrants);
		expect(grants).toHaveLength(1);
		expect(grants[0].pointsAwarded).toBe(10);

		// Verify balance updated
		const profile = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, testProfileId));
		expect(profile[0].pointBalance).toBe(10);
	});

	it("should handle multiple matching rules", async () => {
		// Create two rules
		await db.insert(rewardRules).values([
			{
				name: "Correct Method",
				conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
				points: 10,
				active: true,
			},
			{
				name: "Has Documentation",
				conditions: [{ field: "documentation", op: "not_null" }],
				points: 15,
				active: true,
			},
		]);

		const result = await processVisits();

		expect(result.grantsCreated).toBe(2);
		expect(result.totalPointsAwarded).toBe(25);

		// Verify balance
		const profile = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, testProfileId));
		expect(profile[0].pointBalance).toBe(25);
	});

	it("should enforce idempotency (no double grants)", async () => {
		// Create rule
		await db.insert(rewardRules).values({
			name: "Test Rule",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: true,
		});

		// Process first time
		const result1 = await processVisits();
		expect(result1.grantsCreated).toBe(1);

		// Process second time
		const result2 = await processVisits();
		expect(result2.grantsCreated).toBe(0);
		expect(result2.skippedExisting).toBe(1);

		// Balance should not change
		const profile = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, testProfileId));
		expect(profile[0].pointBalance).toBe(10);
	});

	it("should skip inactive rules", async () => {
		// Create inactive rule
		await db.insert(rewardRules).values({
			name: "Inactive Rule",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: false,
		});

		const result = await processVisits();

		expect(result.grantsCreated).toBe(0);
		expect(result.totalPointsAwarded).toBe(0);
	});

	it("should not grant points when conditions don't match", async () => {
		// Create rule that won't match
		await db.insert(rewardRules).values({
			name: "Wrong Method",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: false }],
			points: 10,
			active: true,
		});

		const result = await processVisits();

		expect(result.grantsCreated).toBe(0);
		expect(result.totalPointsAwarded).toBe(0);
	});

	it("should handle complex conditions (multiple AND)", async () => {
		await db.insert(rewardRules).values({
			name: "Early + Documented",
			conditions: [
				{ field: "clockInTime", op: "lte_field", value: "scheduledStartTime" },
				{ field: "documentation", op: "not_null" },
			],
			points: 20,
			active: true,
		});

		const result = await processVisits();

		expect(result.grantsCreated).toBe(1);
		expect(result.totalPointsAwarded).toBe(20);
	});

	it("should handle contains operator", async () => {
		await db.insert(rewardRules).values({
			name: "Follow-up Documentation",
			conditions: [
				{ field: "documentation", op: "contains", value: "follow-up" },
			],
			points: 15,
			active: true,
		});

		const result = await processVisits();

		expect(result.grantsCreated).toBe(1);
		expect(result.totalPointsAwarded).toBe(15);
	});

	it("should process specific visit IDs only", async () => {
		// Create second visit
		await db.insert(visits).values({
			profileId: testProfileId,
			clockInTime: new Date(),
			correctClockInMethod: false,
		});

		await db.insert(rewardRules).values({
			name: "Test Rule",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: true,
		});

		// Process only first visit
		const result = await processVisits([testVisitId]);

		expect(result.totalVisits).toBe(1);
		expect(result.grantsCreated).toBe(1);
	});
});
