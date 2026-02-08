import "dotenv/config";
import { buildApp } from "./app";
import { validateEnv } from "./shared/env";

const env = validateEnv();
const app = buildApp();

app.listen({ port: env.PORT, host: "0.0.0.0" }, (err, address) => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}
	app.log.info(`Server running at ${address}`);
});
