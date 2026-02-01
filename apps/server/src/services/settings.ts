import { db } from "../db";
import type { Settings } from "../db/types";

const defaultSettings: Settings = {
	polling_interval: "30000",
	notifications_enabled: "true",
};

function rowsToSettings(rows: { key: string; value: string }[]): Settings {
	const settings: Settings = { ...defaultSettings };
	for (const row of rows) {
		switch (row.key) {
			case "polling_interval":
				settings.polling_interval = row.value;
				break;
			case "notifications_enabled":
				settings.notifications_enabled = row.value;
				break;
		}
	}
	return settings;
}

export async function getSettings(): Promise<Settings> {
	const rows = await db
		.selectFrom("settings")
		.select(["key", "value"])
		.execute();
	return rowsToSettings(rows);
}

export async function updateSettings(
	input: Partial<Settings>,
): Promise<Settings> {
	const entries: Array<[keyof Settings, string]> = [];
	if (input.polling_interval !== undefined) {
		entries.push(["polling_interval", input.polling_interval]);
	}
	if (input.notifications_enabled !== undefined) {
		entries.push(["notifications_enabled", input.notifications_enabled]);
	}

	for (const [key, value] of entries) {
		await db
			.insertInto("settings")
			.values({ key, value })
			.onConflict((oc) => oc.column("key").doUpdateSet({ value }))
			.execute();
	}

	return await getSettings();
}
