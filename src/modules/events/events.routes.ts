import type { FastifyPluginAsync } from "fastify";
import { z } from "zod/v4";
import { processVisits } from "../rules/engine/evaluator";

const processBody = z.object({
	visitIds: z.array(z.string().uuid()).min(1),
});

export const eventRoutes: FastifyPluginAsync = async (app) => {
	// Process specific visits
	app.post("/process", async (request) => {
		const { visitIds } = processBody.parse(request.body);
		return processVisits(visitIds);
	});

	// Process all visits
	app.post("/process-all", async (request) => {
		request.log.info("Processing all visits against active rules...");
		return processVisits();
	});
};
