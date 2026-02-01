import { z } from "zod";
import { publicProcedure, router } from "../lib/trpc";
import { getSettings, updateSettings } from "../services/settings";

const schemas = {
	updateInput: z.object({
		polling_interval: z.string().optional(),
		notifications_enabled: z.string().optional(),
	}),
} as const;

export const settingsRouter = router({
	get: publicProcedure.query(() => {
		return getSettings();
	}),

	update: publicProcedure.input(schemas.updateInput).mutation(({ input }) => {
		return updateSettings(input);
	}),
});
