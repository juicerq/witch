import { type Kysely, type Migration, Migrator } from "kysely";
import type { Database } from "../types";
import * as m001 from "./001_initial";
import * as m002 from "./002_stream_history";

const migrations: Record<string, Migration> = {
	"001_initial": m001,
	"002_stream_history": m002,
};

export async function runMigrations(db: Kysely<Database>) {
	const migrator = new Migrator({
		db,
		provider: { getMigrations: () => Promise.resolve(migrations) },
	});

	const { error, results } = await migrator.migrateToLatest();

	results?.forEach((result) => {
		if (result.status === "Success") {
			console.log(`Migration "${result.migrationName}" applied`);
		} else if (result.status === "Error") {
			console.error(`Migration "${result.migrationName}" failed`);
		}
	});

	if (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}
