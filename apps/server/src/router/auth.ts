import crypto from "crypto";
import { z } from "zod";
import { db } from "../db";
import { getValidToken } from "../lib/auth";
import { publicProcedure, router } from "../lib/trpc";
import { twitchService } from "../services/twitch";

export const authRouter = router({
	getLoginUrl: publicProcedure.query(() => {
		return twitchService.getAuthUrl();
	}),

	callback: publicProcedure
		.input(
			z.object({
				code: z.string(),
				state: z.string(),
			})
		)
		.mutation(async ({ input }) => {
			const tokens = await twitchService.exchangeCode(input.code, input.state);
			const user = await twitchService.getCurrentUser(tokens.access_token);

			await db.deleteFrom("tokens").where("user_id", "=", user.id).execute();

			const expiresAt = new Date(
				Date.now() + tokens.expires_in * 1000
			).toISOString();

			await db
				.insertInto("tokens")
				.values({
					id: crypto.randomUUID(),
					user_id: user.id,
					access_token: tokens.access_token,
					refresh_token: tokens.refresh_token,
					expires_at: expiresAt,
				})
				.execute();

			return {
				success: true,
				user: {
					id: user.id,
					login: user.login,
					display_name: user.display_name,
					profile_image_url: user.profile_image_url,
				},
			};
		}),

	status: publicProcedure.query(async () => {
		const token = await getValidToken();

		if (!token) {
			return { authenticated: false };
		}

		const user = await twitchService.getCurrentUser(token.access_token);

		return {
			authenticated: true,
			user: {
				id: user.id,
				login: user.login,
				display_name: user.display_name,
				profile_image_url: user.profile_image_url,
			},
		};
	}),

	logout: publicProcedure.mutation(async () => {
		await db.deleteFrom("tokens").execute();
		return { success: true };
	}),
});
