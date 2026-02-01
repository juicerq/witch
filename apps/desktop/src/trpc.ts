import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { apiConfig } from "@witch/shared/api-config";
import type { AppRouter } from "@witch/shared/trpc-types";

export const trpc = createTRPCReact<AppRouter>();

const wsClient = createWSClient({ url: apiConfig.wsUrl });

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
				url: apiConfig.httpUrl,
				fetch: fetchWithRetry,
			}),
		}),
	],
});
