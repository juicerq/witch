import type { AppRouter } from "@witch/server/src/router";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export type { AppRouter };
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/** Shared API URLs for client configuration */
export const apiConfig = {
	port: 3001,
	wsPort: 3002,
	get httpUrl() {
		return `http://localhost:${this.port}/trpc`;
	},
	get wsUrl() {
		return `ws://localhost:${this.wsPort}`;
	},
} as const;
