// Centralized configuration for ports and URLs

export const config = {
	// Server ports
	port: 3001,
	wsPort: 3002,

	// URLs
	get serverUrl() {
		return `http://localhost:${this.port}`;
	},
	get wsUrl() {
		return `ws://localhost:${this.wsPort}`;
	},
	get redirectUri() {
		return `${this.serverUrl}/auth/callback`;
	},

	// CORS
	allowedOrigins: ["http://localhost:1420", "tauri://localhost"],

	// Twitch API
	twitch: {
		authUrl: "https://id.twitch.tv/oauth2/authorize",
		tokenUrl: "https://id.twitch.tv/oauth2/token",
		helixUrl: "https://api.twitch.tv/helix",
		scopes: "user:read:follows",
	},
} as const;
