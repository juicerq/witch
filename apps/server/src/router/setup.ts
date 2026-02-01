import { z } from "zod";
import { publicProcedure, router } from "../lib/trpc";
import {
	getSetupStatus,
	saveEnvConfig,
	validateTwitchCredentials,
} from "../services/setup";

const schemas = {
	validateInput: z.object({
		clientId: z.string(),
		clientSecret: z.string().nullable(),
		usePkce: z.boolean(),
	}),
	saveInput: z.object({
		clientId: z.string(),
		clientSecret: z.string().nullable(),
		usePkce: z.boolean(),
	}),
} as const;

export const setupRouter = router({
	status: publicProcedure.query(() => {
		return getSetupStatus();
	}),
	validate: publicProcedure
		.input(schemas.validateInput)
		.mutation(({ input }) => {
			return validateTwitchCredentials(input);
		}),
	save: publicProcedure.input(schemas.saveInput).mutation(({ input }) => {
		return saveEnvConfig(input);
	}),
});
