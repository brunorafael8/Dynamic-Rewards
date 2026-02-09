import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { db } from "../../db";
import {
	employees,
	events,
	rewardGrants,
	rewardRules,
} from "../../db/schema";

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
		await db.delete(events);
		await db.delete(employees);

		// Insert employees (transformed from profiles)
		await db.insert(employees).values(
			data.profiles.map((p) => ({
				id: p.id,
				name: p.name,
				point_balance: p.pointBalance,
				onboarded: p.onboarded,
			})),
		);

		// Transform visits to events: each visit becomes a "shift" event with all data in metadata
		const eventChunks = chunk(data.visits, 500);
		for (const batch of eventChunks) {
			await db.insert(events).values(
				batch.map((v) => ({
					id: v.id,
					employee_id: v.profileId,
					type: "shift", // Event type representing a work shift
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
		}

		return {
			message: "Seed complete",
			employees: data.profiles.length,
			events: data.visits.length,
		};
	});
};
