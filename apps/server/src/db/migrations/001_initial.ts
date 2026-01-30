import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
	const tables = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name='tokens'
  `.execute(db);

	if (tables.rows.length > 0) {
		return;
	}

	await db.schema
		.createTable("tokens")
		.addColumn("id", "text", (col) => col.primaryKey())
		.addColumn("user_id", "text", (col) => col.notNull())
		.addColumn("access_token", "text", (col) => col.notNull())
		.addColumn("refresh_token", "text", (col) => col.notNull())
		.addColumn("expires_at", "text", (col) => col.notNull())
		.addColumn("created_at", "text", (col) =>
			col.defaultTo(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		)
		.execute();

	await db.schema
		.createTable("favorites")
		.addColumn("id", "text", (col) => col.primaryKey())
		.addColumn("streamer_id", "text", (col) => col.notNull())
		.addColumn("streamer_login", "text", (col) => col.notNull())
		.addColumn("streamer_name", "text", (col) => col.notNull())
		.addColumn("notify", "integer", (col) => col.defaultTo(1))
		.addColumn("created_at", "text", (col) =>
			col.defaultTo(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		)
		.execute();

	await db.schema
		.createTable("settings")
		.addColumn("key", "text", (col) => col.primaryKey())
		.addColumn("value", "text", (col) => col.notNull())
		.execute();

	await db
		.insertInto("settings" as never)
		.values([
			{ key: "polling_interval", value: "60000" },
			{ key: "notifications_enabled", value: "true" },
		] as never)
		.execute();

	await db.schema
		.createIndex("idx_tokens_user_id")
		.on("tokens")
		.column("user_id")
		.execute();

	await db.schema
		.createIndex("idx_favorites_streamer_id")
		.on("favorites")
		.column("streamer_id")
		.execute();
}
