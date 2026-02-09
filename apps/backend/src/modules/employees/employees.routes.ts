import type { FastifyPluginAsync } from "fastify";
import { employeeParams, listEmployeesQuery } from "./employees.schema";
import { getEmployee, listEmployees } from "./employees.service";

export const employeeRoutes: FastifyPluginAsync = async (app) => {
	app.get("/", async (request) => {
		const query = listEmployeesQuery.parse(request.query);
		const result = await listEmployees(query.limit, query.offset);
		return result;
	});

	app.get("/:id", async (request) => {
		const { id } = employeeParams.parse(request.params);
		return getEmployee(id);
	});
};
