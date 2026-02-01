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
