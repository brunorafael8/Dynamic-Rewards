import { z } from "zod/v4";

export const listProfilesQuery = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});

export const profileParams = z.object({
	id: z.string().uuid(),
});
