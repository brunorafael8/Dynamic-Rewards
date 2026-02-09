import cors from "@fastify/cors";
import Fastify from "fastify";
import { adminRoutes } from "./modules/admin/admin.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { employeeRoutes } from "./modules/employees/employees.routes";
import { eventRoutes } from "./modules/events/events.routes";
import { ruleRoutes } from "./modules/rules/rules.routes";
import { AppError, ValidationError } from "./shared/errors";

export function buildApp() {
	const app = Fastify({
		logger: {
			level: process.env.LOG_LEVEL || "info",
		},
	});

	app.register(cors, { origin: true });

	// Routes
	app.register(employeeRoutes, { prefix: "/employees" });
	app.register(ruleRoutes, { prefix: "/rules" });
	app.register(eventRoutes, { prefix: "/events" });
	app.register(analyticsRoutes, { prefix: "/analytics" });
	app.register(adminRoutes);

	// Global error handler
	app.setErrorHandler((error, request, reply) => {
		if (error instanceof AppError) {
			return reply.status(error.statusCode).send({
				error: error.name,
				message: error.message,
				...(error instanceof ValidationError && error.details
					? { details: error.details }
					: {}),
			});
		}

		// Postgres unique constraint violation
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "23505"
		) {
			return reply.status(409).send({
				error: "Conflict",
				message: "Resource already exists",
			});
		}

		request.log.error(error);
		return reply.status(500).send({
			error: "InternalServerError",
			message: "Something went wrong",
		});
	});

	return app;
}
