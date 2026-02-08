import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { profiles, rewardGrants, rewardRules, visits } from "./schema";

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
		`Found ${data.profiles.length} profiles, ${data.visits.length} visits`,
	);

	// Clear existing data (order matters due to foreign keys)
	console.log("Clearing existing data...");
	await db.delete(rewardGrants);
	await db.delete(rewardRules);
	await db.delete(visits);
	await db.delete(profiles);

	// Insert profiles
	console.log("Inserting profiles...");
	await db.insert(profiles).values(
		data.profiles.map((p) => ({
			id: p.id,
			name: p.name,
			pointBalance: p.pointBalance,
			onboarded: p.onboarded,
		})),
	);

	// Insert visits in chunks of 500
	console.log("Inserting visits...");
	const visitChunks = chunk(data.visits, 500);

	for (let i = 0; i < visitChunks.length; i++) {
		const batch = visitChunks[i];
		await db.insert(visits).values(
			batch.map((v) => ({
				id: v.id,
				profileId: v.profileId,
				clockInTime: v.clockInTime ? new Date(v.clockInTime) : null,
				clockOutTime: v.clockOutTime ? new Date(v.clockOutTime) : null,
				scheduledStartTime: new Date(v.scheduledStartTime),
				scheduledEndTime: new Date(v.scheduledEndTime),
				correctClockInMethod: v.correctClockInMethod,
				documentation: v.documentation,
				createdAt: new Date(v.createdAt),
				updatedAt: new Date(v.updatedAt),
			})),
		);
		console.log(
			`  chunk ${i + 1}/${visitChunks.length} (${batch.length} rows)`,
		);
	}

	// Verify counts
	const profileCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(profiles);
	const visitCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(visits);

	console.log("\nSeed complete!");
	console.log(`  Profiles: ${profileCount[0].count}`);
	console.log(`  Visits: ${visitCount[0].count}`);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
