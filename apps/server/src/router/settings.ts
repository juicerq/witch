import { z } from "zod";
import { db } from "../db";
import { publicProcedure, router } from "../lib/trpc";

export const settingsRouter = router({
	get: publicProcedure.query(async () => {
		const rows = await db.selectFrom("settings").selectAll().execute();

		const settings: Record<string, string> = {};
		for (const row of rows) {
			settings[row.key] = row.value;
		}

		return settings as { polling_interval: string; notifications_enabled: string };
	}),

	update: publicProcedure
		.input(
			z.object({
				polling_interval: z.string().optional(),
				notifications_enabled: z.string().optional(),
			})
		)
		.mutation(async ({ input }) => {
			const entries = Object.entries(input).filter(
				([, value]) => value !== undefined
			);

			for (const [key, value] of entries) {
				await db
					.insertInto("settings")
					.values({ key, value: value as string })
					.onConflict((oc) => oc.column("key").doUpdateSet({ value: value as string }))
					.execute();
			}

			const rows = await db.selectFrom("settings").selectAll().execute();

			const settings: Record<string, string> = {};
			for (const row of rows) {
				settings[row.key] = row.value;
			}

			return settings as { polling_interval: string; notifications_enabled: string };
		}),
});
