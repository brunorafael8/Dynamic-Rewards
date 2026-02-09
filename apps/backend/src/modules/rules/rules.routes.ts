import type { FastifyPluginAsync } from "fastify";
import { z } from "zod/v4";
import {
	createRuleBody,
	listRulesQuery,
	ruleParams,
	updateRuleBody,
} from "./rules.schema";
import {
	createRule,
	deleteRule,
	getRule,
	listRules,
	updateRule,
} from "./rules.service";
import { simulateRule } from "./engine/simulator";
import type { Condition } from "./engine/types";

const simulateBody = z.object({
	metadata: z.record(z.string(), z.unknown()),
});

export const ruleRoutes: FastifyPluginAsync = async (app) => {
	app.post("/", async (request, reply) => {
		const body = createRuleBody.parse(request.body);
		const rule = await createRule(body);
		return reply.status(201).send(rule);
	});

	app.get("/", async (request) => {
		const { active, limit, offset } = listRulesQuery.parse(request.query);
		return listRules({ active }, limit, offset);
	});

	app.get("/:id", async (request) => {
		const { id } = ruleParams.parse(request.params);
		return getRule(id);
	});

	app.put("/:id", async (request) => {
		const { id } = ruleParams.parse(request.params);
		const body = updateRuleBody.parse(request.body);
		return updateRule(id, body);
	});

	app.delete("/:id", async (request) => {
		const { id } = ruleParams.parse(request.params);
		return deleteRule(id);
	});

	// Rule simulator: dry-run a rule against test metadata
	app.post("/:id/test", async (request) => {
		const { id } = ruleParams.parse(request.params);
		const { metadata } = simulateBody.parse(request.body);
		const rule = await getRule(id);
		const conditions = rule.conditions as Condition[];
		return simulateRule(conditions, metadata);
	});
};
