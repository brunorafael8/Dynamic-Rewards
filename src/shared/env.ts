import { z } from "zod/v4";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	OPENAI_API_KEY: z.string().optional(),
	PORT: z.coerce.number().default(3000),
});

export function validateEnv() {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.error("Invalid environment variables:");
		console.error(result.error.format());
		process.exit(1);
	}

	return result.data;
}

export type Env = ReturnType<typeof validateEnv>;
