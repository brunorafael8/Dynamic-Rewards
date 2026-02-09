import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { employees, events, rewardGrants, rewardRules } from "./schema";

interface SeedProfile {
	id: string;
	name: string;
	pointBalance: number;
	onboarded: boolean;
}

interface SeedVisit {
	id: string;
	profileId: string;
	clockInTime: string | null;
	clockOutTime: string | null;
	scheduledStartTime: string;
	scheduledEndTime: string;
	correctClockInMethod: boolean;
	documentation: string | null;
	createdAt: string;
	updatedAt: string;
}

interface SeedData {
	profiles: SeedProfile[];
	visits: SeedVisit[];
}

function chunk<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

async function seed() {
	console.log("Reading seed data...");
	const raw = readFileSync(join(__dirname, "../../data/data.json"), "utf-8");
	const data: SeedData = JSON.parse(raw);

	console.log(
		`Found ${data.profiles.length} employees, ${data.visits.length} events`,
	);

	// Clear existing data (order matters due to foreign keys)
	console.log("Clearing existing data...");
	await db.delete(rewardGrants);
	await db.delete(rewardRules);
	await db.delete(events);
	await db.delete(employees);

	// Insert employees (transformed from profiles)
	console.log("Inserting employees...");
	await db.insert(employees).values(
		data.profiles.map((p) => ({
			id: p.id,
			name: p.name,
			point_balance: p.pointBalance,
			onboarded: p.onboarded,
		})),
	);

	// Transform visits to events: each visit becomes a "shift" event with all data in metadata
	console.log("Inserting events...");
	const eventChunks = chunk(data.visits, 500);

	for (let i = 0; i < eventChunks.length; i++) {
		const batch = eventChunks[i];
		await db.insert(events).values(
			batch.map((v) => ({
				id: v.id,
				employee_id: v.profileId,
				type: "shift",
				timestamp: v.clockInTime ? new Date(v.clockInTime) : new Date(v.createdAt),
				metadata: {
					clockInTime: v.clockInTime,
					clockOutTime: v.clockOutTime,
					scheduledStartTime: v.scheduledStartTime,
					scheduledEndTime: v.scheduledEndTime,
					correctClockInMethod: v.correctClockInMethod,
					documentation: v.documentation,
				},
				createdAt: new Date(v.createdAt),
				updatedAt: new Date(v.updatedAt),
			})),
		);
		console.log(
			`  chunk ${i + 1}/${eventChunks.length} (${batch.length} rows)`,
		);
	}

	// Verify counts
	const employeeCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(employees);
	const eventCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(events);

	console.log("\nSeed complete!");
	console.log(`  Employees: ${employeeCount[0].count}`);
	console.log(`  Events: ${eventCount[0].count}`);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
