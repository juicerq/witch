import type { Selectable } from "kysely";
import { db } from "../db";
import type { TokenTable } from "../db/types";
import { twitchService } from "../services/twitch";

/** Token row as returned from a SELECT query */
type Token = Selectable<TokenTable>;

/**
 * Gets a valid access token, refreshing if expired.
 * Returns null if no token exists.
 */
export async function getValidToken(): Promise<Token | null> {
	const token = await db
		.selectFrom("tokens")
		.selectAll()
		.limit(1)
		.executeTakeFirst();

	if (!token) {
		return null;
	}

	const isExpired = new Date(token.expires_at) < new Date();

	if (isExpired) {
		const newTokens = await twitchService.refreshToken(token.refresh_token);

		const expiresAt = new Date(
			Date.now() + newTokens.expires_in * 1000
		).toISOString();

		await db
			.updateTable("tokens")
			.set({
				access_token: newTokens.access_token,
				refresh_token: newTokens.refresh_token,
				expires_at: expiresAt,
			})
			.where("id", "=", token.id)
			.execute();

		return {
			...token,
			access_token: newTokens.access_token,
			refresh_token: newTokens.refresh_token,
			expires_at: expiresAt,
		};
	}

	return token;
}
