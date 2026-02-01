import "./db";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { appRouter } from "./router";
import { config } from "./config";
import { startNotificationPoller } from "./services/notification-poller";

function getCorsHeaders(origin: string | null) {
	const allowedOrigin =
		origin && config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0];
	return {
		"Access-Control-Allow-Origin": allowedOrigin,
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

function getCallbackHTML(success: boolean, error?: string): string {
	const title = success ? "Login Successful!" : "Login Failed";
	const message = success
		? "You can close this tab and return to Witch."
		: `Error: ${error || "Unknown error"}`;
	const color = success ? "#00ff00" : "#ff0040";

	return `<!DOCTYPE html>
<html>
<head>
	<title>Witch - ${title}</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			background: #050505;
			color: ${color};
			font-family: "JetBrains Mono", monospace;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			text-align: center;
		}
		.container { padding: 2rem; }
		h1 {
			font-family: "Press Start 2P", monospace;
			font-size: 14px;
			margin-bottom: 1rem;
			text-shadow: 0 0 10px ${color};
		}
		p { font-size: 14px; opacity: 0.8; }
		.ascii {
			font-size: 10px;
			margin-bottom: 1rem;
			white-space: pre;
			color: #00aa00;
		}
	</style>
	<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono&display=swap" rel="stylesheet">
</head>
<body>
	<div class="container">
		<pre class="ascii">${success ? `
   _____ _    _  _____ _____ ______  _____ _____
  / ____| |  | |/ ____/ ____|  ____|/ ____/ ____|
 | (___ | |  | | |   | |    | |__  | (___| (___
  \\___ \\| |  | | |   | |    |  __|  \\___ \\\\___ \\
  ____) | |__| | |___| |____| |____ ____) |___) |
 |_____/ \\____/ \\_____\\_____|______|_____/_____/
` : `
  ______ _____  _____   ____  _____
 |  ____|  __ \\|  __ \\ / __ \\|  __ \\
 | |__  | |__) | |__) | |  | | |__) |
 |  __| |  _  /|  _  /| |  | |  _  /
 | |____| | \\ \\| | \\ \\| |__| | | \\ \\
 |______|_|  \\_\\_|  \\_\\\\____/|_|  \\_\\
`}</pre>
		<h1>> ${title}</h1>
		<p>${message}</p>
	</div>
</body>
</html>`;
}

Bun.serve({
	port: config.port,
	async fetch(request) {
		const url = new URL(request.url);
		const origin = request.headers.get("Origin");
		const corsHeaders = getCorsHeaders(origin);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		// OAuth callback - process and show success page
		if (url.pathname === "/auth/callback") {
			const code = url.searchParams.get("code");
			const state = url.searchParams.get("state");
			const error = url.searchParams.get("error");

			if (error) {
				return new Response(getCallbackHTML(false, error), {
					status: 200,
					headers: { "Content-Type": "text/html", ...corsHeaders },
				});
			}

			if (code && state) {
				try {
					const { twitchService } = await import("./services/twitch");
					const { db } = await import("./db");
					const crypto = await import("crypto");

					const tokens = await twitchService.exchangeCode(code, state);
					const user = await twitchService.getCurrentUser(tokens.access_token);

					await db.deleteFrom("tokens").where("user_id", "=", user.id).execute();

					const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

					await db.insertInto("tokens").values({
						id: crypto.randomUUID(),
						user_id: user.id,
						access_token: tokens.access_token,
						refresh_token: tokens.refresh_token,
						expires_at: expiresAt,
					}).execute();

					return new Response(getCallbackHTML(true), {
						status: 200,
						headers: { "Content-Type": "text/html", ...corsHeaders },
					});
				} catch (err) {
					const message = err instanceof Error ? err.message : "Unknown error";
					return new Response(getCallbackHTML(false, message), {
						status: 200,
						headers: { "Content-Type": "text/html", ...corsHeaders },
					});
				}
			}

			return new Response(getCallbackHTML(false, "Missing code or state"), {
				status: 200,
				headers: { "Content-Type": "text/html", ...corsHeaders },
			});
		}

		if (url.pathname.startsWith("/trpc")) {
			const response = await fetchRequestHandler({
				endpoint: "/trpc",
				req: request,
				router: appRouter,
				createContext: () => ({}),
			});
			const newHeaders = new Headers(response.headers);
			for (const [k, v] of Object.entries(corsHeaders)) {
				newHeaders.set(k, v);
			}
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});
		}

		return new Response("witch-server running", {
			status: 200,
			headers: corsHeaders,
		});
	},
});

const wss = new WebSocketServer({ port: config.wsPort });

applyWSSHandler({
	wss,
	router: appRouter,
	createContext: () => ({}),
});

startNotificationPoller();

console.log(`witch-server listening on ${config.serverUrl}`);
console.log(`WebSocket server listening on ${config.wsUrl}`);
