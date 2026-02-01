import crypto from "node:crypto";
import { db } from "../db";

const favoriteColumns = [
	"id",
	"streamer_id",
	"streamer_login",
	"streamer_name",
	"notify",
	"created_at",
] as const;

type ToggleFavoriteInput = {
	streamer_id: string;
	streamer_login: string;
	streamer_name: string;
};

type SetNotifyInput = {
	streamer_id: string;
	notify: boolean;
};

export function listFavorites() {
	return db.selectFrom("favorites").select(favoriteColumns).execute();
}

export async function toggleFavorite(input: ToggleFavoriteInput) {
	const existing = await db
		.selectFrom("favorites")
		.select(["id"])
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
}

export async function setFavoriteNotify(input: SetNotifyInput) {
	await db
		.updateTable("favorites")
		.set({ notify: input.notify ? 1 : 0 })
		.where("streamer_id", "=", input.streamer_id)
		.execute();

	return await db
		.selectFrom("favorites")
		.select(favoriteColumns)
		.where("streamer_id", "=", input.streamer_id)
		.executeTakeFirst();
}
