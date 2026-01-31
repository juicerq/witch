import { z } from "zod";
import { db } from "../db";
import type { Settings } from "../db/types";
import { publicProcedure, router } from "../lib/trpc";

/** Default settings values */
const defaultSettings: Settings = {
	polling_interval: "30000",
	notifications_enabled: "true",
};

/** Converts settings rows to typed Settings object */
function rowsToSettings(rows: { key: string; value: string }[]): Settings {
	const settings = { ...defaultSettings };
	for (const row of rows) {
		if (row.key in settings) {
			settings[row.key as keyof Settings] = row.value;
		}
	}
	return settings;
}

export const settingsRouter = router({
	get: publicProcedure.query(async () => {
		const rows = await db.selectFrom("settings").selectAll().execute();
		return rowsToSettings(rows);
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
			return rowsToSettings(rows);
		}),
});
