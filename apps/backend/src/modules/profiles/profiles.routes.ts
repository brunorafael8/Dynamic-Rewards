import type { FastifyPluginAsync } from "fastify";
import { listProfilesQuery, profileParams } from "./profiles.schema";
import { getProfile, listProfiles } from "./profiles.service";

export const profileRoutes: FastifyPluginAsync = async (app) => {
	app.get("/", async (request) => {
		const query = listProfilesQuery.parse(request.query);
		const result = await listProfiles(query.limit, query.offset);
		return result;
	});

	app.get("/:id", async (request) => {
		const { id } = profileParams.parse(request.params);
		return getProfile(id);
	});
};
