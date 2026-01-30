// Re-export only the router type for the desktop client
// This file should NOT import any modules that use bun:sqlite
export type { AppRouter } from "./index";
