import { z } from "zod/v4";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	AI_PROVIDER: z.enum(["openai", "anthropic"]).default("openai").optional(),
	AI_MODEL: z.string().default("gpt-4o-mini").optional(),
	AI_API_KEY: z.string().optional(),
	OPENAI_API_KEY: z.string().optional(), // Legacy fallback
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
