import crypto from "crypto";
import { z } from "zod";
import { db } from "../db";
import { publicProcedure, router } from "../lib/trpc";

export const favoritesRouter = router({
	list: publicProcedure.query(async () => {
		return db.selectFrom("favorites").selectAll().execute();
	}),

	toggle: publicProcedure
		.input(
			z.object({
				streamer_id: z.string(),
				streamer_login: z.string(),
				streamer_name: z.string(),
			})
		)
		.mutation(async ({ input }) => {
			const existing = await db
				.selectFrom("favorites")
				.selectAll()
				.where("streamer_id", "=", input.streamer_id)
				.executeTakeFirst();

			if (existing) {
				await db
					.deleteFrom("favorites")
					.where("streamer_id", "=", input.streamer_id)
					.execute();

				return { is_favorite: false };
			}

			await db
				.insertInto("favorites")
				.values({
					id: crypto.randomUUID(),
					streamer_id: input.streamer_id,
					streamer_login: input.streamer_login,
					streamer_name: input.streamer_name,
				})
				.execute();

			return { is_favorite: true };
		}),

	setNotify: publicProcedure
		.input(
			z.object({
				streamer_id: z.string(),
				notify: z.boolean(),
			})
		)
		.mutation(async ({ input }) => {
			await db
				.updateTable("favorites")
				.set({ notify: input.notify ? 1 : 0 })
				.where("streamer_id", "=", input.streamer_id)
				.execute();

			const updated = await db
				.selectFrom("favorites")
				.selectAll()
				.where("streamer_id", "=", input.streamer_id)
				.executeTakeFirst();

			return updated;
		}),
});
