import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
	await db.schema
		.createTable("stream_sessions")
		.addColumn("id", "text", (col) => col.primaryKey())
		.addColumn("streamer_id", "text", (col) => col.notNull())
		.addColumn("streamer_login", "text", (col) => col.notNull())
		.addColumn("started_at", "text", (col) => col.notNull())
		.addColumn("ended_at", "text")
		.addColumn("game_name", "text")
		.addColumn("created_at", "text", (col) =>
			col.defaultTo(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		)
		.execute();

	await db.schema
		.createIndex("idx_stream_sessions_streamer_id")
		.on("stream_sessions")
		.column("streamer_id")
		.execute();

	await db.schema
		.createIndex("idx_stream_sessions_started_at")
		.on("stream_sessions")
		.column("started_at")
		.execute();
}
