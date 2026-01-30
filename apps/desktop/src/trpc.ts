import type { AppRouter } from "@witch/server/src/router";
import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();

const wsClient = createWSClient({ url: "ws://localhost:3002" });

async function fetchWithRetry(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const maxRetries = 5;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fetch(input, init);
		} catch (err) {
			if (attempt === maxRetries) throw err;
			await new Promise((r) => setTimeout(r, 500));
		}
	}
	throw new Error("Unreachable");
}

export const trpcClient = trpc.createClient({
	links: [
		splitLink({
			condition(op) {
				return op.type === "subscription";
			},
			true: wsLink({ client: wsClient }),
			false: httpBatchLink({
				url: "http://localhost:3001/trpc",
				fetch: fetchWithRetry,
			}),
		}),
	],
});
