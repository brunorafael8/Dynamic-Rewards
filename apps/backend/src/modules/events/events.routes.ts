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

	// Process all events (or limit with ?limit=N query param)
	app.post("/process-all", async (request) => {
		const query = request.query as { limit?: string };
		const limit = query.limit ? Number.parseInt(query.limit, 10) : undefined;
		request.log.info(`Processing ${limit || "all"} events against active rules...`);
		return processEvents(undefined, limit);
	});
};
