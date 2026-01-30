import { Database as BunDatabase } from "bun:sqlite";
import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { runMigrations } from "./migrations";
import type { Database } from "./types";

const DB_PATH = process.env.WITCH_DB_PATH || "witch.db";

const sqlite = new BunDatabase(DB_PATH, { create: true });

sqlite.run("PRAGMA foreign_keys = ON");

export const db = new Kysely<Database>({
	dialect: new BunSqliteDialect({ database: sqlite }),
});

await runMigrations(db);
