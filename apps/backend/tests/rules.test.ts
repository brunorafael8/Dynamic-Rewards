import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { employees, rewardGrants, rewardRules, events } from "../src/db/schema";
import { processEvents } from "../src/modules/rules/engine/evaluator";

describe("Rule Engine - Integration", () => {
	let testEmployeeId: string;
	let testEventId: string;

	beforeEach(async () => {
		// Clean tables (cascade to handle FK constraints)
		await db.execute(
			sql`TRUNCATE reward_grants, events, reward_rules, employees CASCADE`,
		);

		// Seed test employee
		const [employee] = await db
			.insert(employees)
			.values({
				name: "Test User",
				point_balance: 0,
				onboarded: true,
			})
			.returning();
		testEmployeeId = employee.id;

		// Seed test event with shift metadata
		const [event] = await db
			.insert(events)
			.values({
				employee_id: testEmployeeId,
				type: "shift",
				timestamp: new Date("2024-01-15T08:00:00Z"),
				metadata: {
					clockInTime: new Date("2024-01-15T08:00:00Z"),
					scheduledStartTime: new Date("2024-01-15T09:00:00Z"),
					correctClockInMethod: true,
					documentation: "Follow-up needed",
				},
			})
			.returning();
		testEventId = event.id;
	});

	afterAll(async () => {
		await db.execute(
			sql`TRUNCATE reward_grants, events, reward_rules, employees CASCADE`,
		);
	});

	it("should create grant and update balance when rule matches", async () => {
		// Create rule
		await db.insert(rewardRules).values({
			name: "Correct Clock-In Method",
			event_type: "shift",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: true,
		});

		// Process events
		const result = await processEvents();

		expect(result.totalEvents).toBe(1);
		expect(result.grantsCreated).toBe(1);
		expect(result.totalPointsAwarded).toBe(10);

		// Verify grant created
		const grants = await db.select().from(rewardGrants);
		expect(grants).toHaveLength(1);
		expect(grants[0].points_awarded).toBe(10);

		// Verify balance updated
		const employee = await db
			.select()
			.from(employees)
			.where(eq(employees.id, testEmployeeId));
		expect(employee[0].point_balance).toBe(10);
	});

	it("should handle multiple matching rules", async () => {
		// Create two rules
		await db.insert(rewardRules).values([
			{
				name: "Correct Method",
				event_type: "shift",
				conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
				points: 10,
				active: true,
			},
			{
				name: "Has Documentation",
				event_type: "shift",
				conditions: [{ field: "documentation", op: "not_null" }],
				points: 15,
				active: true,
			},
		]);

		const result = await processEvents();

		expect(result.grantsCreated).toBe(2);
		expect(result.totalPointsAwarded).toBe(25);

		// Verify balance
		const employee = await db
			.select()
			.from(employees)
			.where(eq(employees.id, testEmployeeId));
		expect(employee[0].point_balance).toBe(25);
	});

	it("should enforce idempotency (no double grants)", async () => {
		// Create rule
		await db.insert(rewardRules).values({
			name: "Test Rule",
			event_type: "shift",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: true,
		});

		// Process first time
		const result1 = await processEvents();
		expect(result1.grantsCreated).toBe(1);

		// Process second time
		const result2 = await processEvents();
		expect(result2.grantsCreated).toBe(0);
		expect(result2.skippedExisting).toBe(1);

		// Balance should not change
		const employee = await db
			.select()
			.from(employees)
			.where(eq(employees.id, testEmployeeId));
		expect(employee[0].point_balance).toBe(10);
	});

	it("should skip inactive rules", async () => {
		// Create inactive rule
		await db.insert(rewardRules).values({
			name: "Inactive Rule",
			event_type: "shift",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: false,
		});

		const result = await processEvents();

		expect(result.grantsCreated).toBe(0);
		expect(result.totalPointsAwarded).toBe(0);
	});

	it("should not grant points when conditions don't match", async () => {
		// Create rule that won't match
		await db.insert(rewardRules).values({
			name: "Wrong Method",
			event_type: "shift",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: false }],
			points: 10,
			active: true,
		});

		const result = await processEvents();

		expect(result.grantsCreated).toBe(0);
		expect(result.totalPointsAwarded).toBe(0);
	});

	it("should handle complex conditions (multiple AND)", async () => {
		await db.insert(rewardRules).values({
			name: "Early + Documented",
			event_type: "shift",
			conditions: [
				{ field: "clockInTime", op: "lte_field", value: "scheduledStartTime" },
				{ field: "documentation", op: "not_null" },
			],
			points: 20,
			active: true,
		});

		const result = await processEvents();

		expect(result.grantsCreated).toBe(1);
		expect(result.totalPointsAwarded).toBe(20);
	});

	it("should handle contains operator", async () => {
		await db.insert(rewardRules).values({
			name: "Follow-up Documentation",
			event_type: "shift",
			conditions: [
				{ field: "documentation", op: "contains", value: "follow-up" },
			],
			points: 15,
			active: true,
		});

		const result = await processEvents();

		expect(result.grantsCreated).toBe(1);
		expect(result.totalPointsAwarded).toBe(15);
	});

	it("should process specific event IDs only", async () => {
		// Create second event
		await db.insert(events).values({
			employee_id: testEmployeeId,
			type: "shift",
			timestamp: new Date(),
			metadata: {
				correctClockInMethod: false,
			},
		});

		await db.insert(rewardRules).values({
			name: "Test Rule",
			event_type: "shift",
			conditions: [{ field: "correctClockInMethod", op: "eq", value: true }],
			points: 10,
			active: true,
		});

		// Process only first event
		const result = await processEvents([testEventId]);

		expect(result.totalEvents).toBe(1);
		expect(result.grantsCreated).toBe(1);
	});
});
