// Stub types for bun:sqlite to allow desktop to compile
// The actual implementation runs in the server process
declare module "bun:sqlite" {
	export class Database {
		constructor(filename: string, options?: { create?: boolean });
		run(sql: string): void;
		close(): void;
	}
}
