import crypto from "node:crypto";
import { config } from "../config";
import type {
	TwitchAuthState,
	TwitchFollowedChannel,
	TwitchStream,
	TwitchTokenResponse,
	TwitchUser,
} from "./twitch.types";

class TwitchService {
	private authStates: Map<string, TwitchAuthState> = new Map();

	private get clientId(): string {
		const clientId = process.env.TWITCH_CLIENT_ID;
		if (!clientId) {
			throw new Error("TWITCH_CLIENT_ID environment variable is not set");
		}
		return clientId;
	}

	private get usePkce(): boolean {
		return process.env.TWITCH_USE_PKCE === "true";
	}

	private get clientSecret(): string | undefined {
		const clientSecret = process.env.TWITCH_CLIENT_SECRET;
		if (!clientSecret) {
			if (this.usePkce) {
				return undefined;
			}
			throw new Error("TWITCH_CLIENT_SECRET environment variable is not set");
		}
		return clientSecret;
	}

	private generateCodeVerifier(): string {
		return crypto.randomBytes(32).toString("base64url");
	}

	private generateCodeChallenge(verifier: string): string {
		return crypto.createHash("sha256").update(verifier).digest("base64url");
	}

	private generateState(): string {
		return crypto.randomBytes(16).toString("base64url");
	}

	getAuthUrl(): { url: string; state: string } {
		const state = this.generateState();
		const codeVerifier = this.generateCodeVerifier();
		const codeChallenge = this.generateCodeChallenge(codeVerifier);

		this.authStates.set(state, {
			code_verifier: codeVerifier,
			created_at: Date.now(),
		});

		// Clean up old states (older than 10 minutes)
		this.cleanupOldStates();

		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: config.redirectUri,
			response_type: "code",
			scope: config.twitch.scopes,
			state: state,
			code_challenge: codeChallenge,
			code_challenge_method: "S256",
		});

		return {
			url: `${config.twitch.authUrl}?${params.toString()}`,
			state,
		};
	}

	private cleanupOldStates(): void {
		const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
		for (const [state, data] of this.authStates) {
			if (data.created_at < tenMinutesAgo) {
				this.authStates.delete(state);
			}
		}
	}

	async exchangeCode(
		code: string,
		state: string,
	): Promise<TwitchTokenResponse> {
		const authState = this.authStates.get(state);
		if (!authState) {
			throw new Error("Invalid or expired state parameter");
		}

		const { code_verifier } = authState;
		this.authStates.delete(state);

		const params = new URLSearchParams({
			client_id: this.clientId,
			code,
			code_verifier,
			grant_type: "authorization_code",
			redirect_uri: config.redirectUri,
		});

		const clientSecret = this.clientSecret;
		if (clientSecret) {
			params.set("client_secret", clientSecret);
		}

		const response = await fetch(config.twitch.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to exchange code: ${error}`);
		}

		const data = await response.json();
		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: data.expires_in,
		};
	}

	async refreshToken(refresh_token: string): Promise<TwitchTokenResponse> {
		const params = new URLSearchParams({
			client_id: this.clientId,
			grant_type: "refresh_token",
			refresh_token,
		});

		const clientSecret = this.clientSecret;
		if (clientSecret) {
			params.set("client_secret", clientSecret);
		}

		const response = await fetch(config.twitch.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to refresh token: ${error}`);
		}

		const data = await response.json();
		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: data.expires_in,
		};
	}

	private async makeHelixRequest<T>(
		endpoint: string,
		accessToken: string,
		params?: URLSearchParams,
	): Promise<T> {
		const url = params
			? `${config.twitch.helixUrl}${endpoint}?${params.toString()}`
			: `${config.twitch.helixUrl}${endpoint}`;

		const response = await fetch(url, {
			headers: {
				"Client-ID": this.clientId,
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Helix API error: ${response.status} - ${error}`);
		}

		return await response.json();
	}

	async getCurrentUser(accessToken: string): Promise<TwitchUser> {
		const response = await this.makeHelixRequest<{ data: TwitchUser[] }>(
			"/users",
			accessToken,
		);

		const user = response.data?.[0];
		if (!user) {
			throw new Error("No user data returned");
		}

		return user;
	}

	async getUsers(
		accessToken: string,
		userIds: string[],
	): Promise<TwitchUser[]> {
		if (userIds.length === 0) {
			return [];
		}

		const users: TwitchUser[] = [];
		const batchSize = 100;

		for (let i = 0; i < userIds.length; i += batchSize) {
			const batch = userIds.slice(i, i + batchSize);
			const params = new URLSearchParams();

			for (const userId of batch) {
				params.append("id", userId);
			}

			const response = await this.makeHelixRequest<{ data: TwitchUser[] }>(
				"/users",
				accessToken,
				params,
			);

			users.push(...response.data);
		}

		return users;
	}

	async getFollowedChannels(
		accessToken: string,
		userId: string,
	): Promise<TwitchFollowedChannel[]> {
		const allChannels: TwitchFollowedChannel[] = [];
		let cursor: string | undefined;

		do {
			const params = new URLSearchParams({
				user_id: userId,
				first: "100",
			});

			if (cursor) {
				params.set("after", cursor);
			}

			const response = await this.makeHelixRequest<{
				data: TwitchFollowedChannel[];
				pagination?: { cursor?: string };
			}>("/channels/followed", accessToken, params);

			allChannels.push(...response.data);

			cursor = response.pagination?.cursor;
		} while (cursor);

		return allChannels;
	}

	async getStreams(
		accessToken: string,
		userIds: string[],
	): Promise<TwitchStream[]> {
		if (userIds.length === 0) {
			return [];
		}

		const allStreams: TwitchStream[] = [];
		const batchSize = 100;

		for (let i = 0; i < userIds.length; i += batchSize) {
			const batch = userIds.slice(i, i + batchSize);
			const params = new URLSearchParams();

			for (const userId of batch) {
				params.append("user_id", userId);
			}

			const response = await this.makeHelixRequest<{ data: TwitchStream[] }>(
				"/streams",
				accessToken,
				params,
			);

			allStreams.push(...response.data);
		}

		return allStreams;
	}
}

export const twitchService = new TwitchService();
export { TwitchService };
