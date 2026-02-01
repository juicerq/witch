import { z } from "zod";
import { publicProcedure, router } from "../lib/trpc";
import {
	getAuthStatus,
	getLoginUrl,
	handleAuthCallback,
	logout,
} from "../services/auth";

const schemas = {
	callbackInput: z.object({
		code: z.string(),
		state: z.string(),
	}),
} as const;

export const authRouter = router({
	getLoginUrl: publicProcedure.query(() => {
		return getLoginUrl();
	}),

	callback: publicProcedure
		.input(schemas.callbackInput)
		.mutation(({ input }) => {
			return handleAuthCallback(input.code, input.state);
		}),

	status: publicProcedure.query(() => {
		return getAuthStatus();
	}),

	logout: publicProcedure.mutation(() => {
		return logout();
	}),
});
