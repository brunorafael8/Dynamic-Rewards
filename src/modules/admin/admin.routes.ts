import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { db } from "../../db";
import { profiles, rewardGrants, rewardRules, visits } from "../../db/schema";

interface SeedData {
	profiles: Array<{
		id: string;
		name: string;
		pointBalance: number;
		onboarded: boolean;
	}>;
	visits: Array<{
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
	}>;
}

function chunk<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
	app.get("/health", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	}));

	app.post("/seed", async (request) => {
		request.log.info("Starting database seed...");

		const raw = readFileSync(
			join(__dirname, "../../../data/data.json"),
			"utf-8",
		);
		const data: SeedData = JSON.parse(raw);

		// Clear in order (foreign keys)
		await db.delete(rewardGrants);
		await db.delete(rewardRules);
		await db.delete(visits);
		await db.delete(profiles);

		// Insert profiles
		await db.insert(profiles).values(
			data.profiles.map((p) => ({
				id: p.id,
				name: p.name,
				pointBalance: p.pointBalance,
				onboarded: p.onboarded,
			})),
		);

		// Insert visits in chunks
		const visitChunks = chunk(data.visits, 500);
		for (const batch of visitChunks) {
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
		}

		return {
			message: "Seed complete",
			profiles: data.profiles.length,
			visits: data.visits.length,
		};
	});
};
