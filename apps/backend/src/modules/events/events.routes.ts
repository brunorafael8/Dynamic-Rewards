import type { FastifyPluginAsync } from "fastify";
import { z } from "zod/v4";
import { processEvents } from "../rules/engine/evaluator";

const processBody = z.object({
	eventIds: z.array(z.string().uuid()).min(1),
});

export const eventRoutes: FastifyPluginAsync = async (app) => {
	// Process specific events
	app.post("/process", async (request) => {
		const { eventIds } = processBody.parse(request.body);
		return processEvents(eventIds);
	});

	// Process all events
	app.post("/process-all", async (request) => {
		request.log.info("Processing all events against active rules...");
		return processEvents();
	});
};
