import crypto from "node:crypto";
import { db } from "../db";
import { getValidToken } from "../lib/auth";
import { twitchService } from "./twitch";

export function getLoginUrl() {
	return twitchService.getAuthUrl();
}

export async function handleAuthCallback(code: string, state: string) {
	const tokens = await twitchService.exchangeCode(code, state);
	const user = await twitchService.getCurrentUser(tokens.access_token);

	await db.deleteFrom("tokens").where("user_id", "=", user.id).execute();

	const expiresAt = new Date(
		Date.now() + tokens.expires_in * 1000,
	).toISOString();

	await db
		.insertInto("tokens")
		.values({
			id: crypto.randomUUID(),
			user_id: user.id,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_at: expiresAt,
		})
		.execute();

	return {
		success: true,
		user: {
			id: user.id,
			login: user.login,
			display_name: user.display_name,
			profile_image_url: user.profile_image_url,
		},
	};
}

export async function getAuthStatus() {
	const token = await getValidToken();

	if (!token) {
		return { authenticated: false } as const;
	}

	const user = await twitchService.getCurrentUser(token.access_token);

	return {
		authenticated: true,
		user: {
			id: user.id,
			login: user.login,
			display_name: user.display_name,
			profile_image_url: user.profile_image_url,
		},
	} as const;
}

export async function logout() {
	await db.deleteFrom("tokens").execute();
	return { success: true };
}
