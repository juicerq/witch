import crypto from "crypto";
import type {
	TwitchAuthState,
	TwitchFollowedChannel,
	TwitchStream,
	TwitchTokenResponse,
	TwitchUser,
} from "./twitch.types";

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/authorize";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_HELIX_URL = "https://api.twitch.tv/helix";
const REDIRECT_URI = "http://localhost:3001/auth/callback";
const SCOPES = "user:read:follows";

class TwitchService {
	private authStates: Map<string, TwitchAuthState> = new Map();

	private get clientId(): string {
		const clientId = process.env.TWITCH_CLIENT_ID;
		if (!clientId) {
			throw new Error("TWITCH_CLIENT_ID environment variable is not set");
		}
		return clientId;
	}

	private get clientSecret(): string {
		const clientSecret = process.env.TWITCH_CLIENT_SECRET;
		if (!clientSecret) {
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
			redirect_uri: REDIRECT_URI,
			response_type: "code",
			scope: SCOPES,
			state: state,
			code_challenge: codeChallenge,
			code_challenge_method: "S256",
		});

		return {
			url: `${TWITCH_AUTH_URL}?${params.toString()}`,
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
		state: string
	): Promise<TwitchTokenResponse> {
		const authState = this.authStates.get(state);
		if (!authState) {
			throw new Error("Invalid or expired state parameter");
		}

		const { code_verifier } = authState;
		this.authStates.delete(state);

		const params = new URLSearchParams({
			client_id: this.clientId,
			client_secret: this.clientSecret,
			code: code,
			code_verifier: code_verifier,
			grant_type: "authorization_code",
			redirect_uri: REDIRECT_URI,
		});

		const response = await fetch(TWITCH_TOKEN_URL, {
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
			client_secret: this.clientSecret,
			grant_type: "refresh_token",
			refresh_token: refresh_token,
		});

		const response = await fetch(TWITCH_TOKEN_URL, {
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
		params?: URLSearchParams
	): Promise<T> {
		const url = params
			? `${TWITCH_HELIX_URL}${endpoint}?${params.toString()}`
			: `${TWITCH_HELIX_URL}${endpoint}`;

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

		return response.json();
	}

	async getCurrentUser(accessToken: string): Promise<TwitchUser> {
		const response = await this.makeHelixRequest<{ data: TwitchUser[] }>(
			"/users",
			accessToken
		);

		if (!response.data || response.data.length === 0) {
			throw new Error("No user data returned");
		}

		const user = response.data[0];
		return {
			id: user.id,
			login: user.login,
			display_name: user.display_name,
			profile_image_url: user.profile_image_url,
		};
	}

	async getFollowedChannels(
		accessToken: string,
		userId: string
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

			for (const channel of response.data) {
				allChannels.push({
					broadcaster_id: channel.broadcaster_id,
					broadcaster_login: channel.broadcaster_login,
					broadcaster_name: channel.broadcaster_name,
				});
			}

			cursor = response.pagination?.cursor;
		} while (cursor);

		return allChannels;
	}

	async getStreams(
		accessToken: string,
		userIds: string[]
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
				params
			);

			for (const stream of response.data) {
				allStreams.push({
					user_id: stream.user_id,
					user_login: stream.user_login,
					user_name: stream.user_name,
					game_name: stream.game_name,
					viewer_count: stream.viewer_count,
					started_at: stream.started_at,
					thumbnail_url: stream.thumbnail_url,
				});
			}
		}

		return allStreams;
	}
}

export const twitchService = new TwitchService();
export { TwitchService };
