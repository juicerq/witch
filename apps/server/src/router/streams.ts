import { db } from "../db";
import { publicProcedure, router } from "../lib/trpc";
import { twitchService } from "../services/twitch";

export const streamsRouter = router({
	getFollowed: publicProcedure.query(async () => {
		const token = await db
			.selectFrom("tokens")
			.selectAll()
			.limit(1)
			.executeTakeFirst();

		if (!token) {
			return [];
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

			token.access_token = newTokens.access_token;
		}

		const followedChannels = await twitchService.getFollowedChannels(
			token.access_token,
			token.user_id
		);

		const broadcasterIds = followedChannels.map(
			(channel) => channel.broadcaster_id
		);

		if (broadcasterIds.length === 0) {
			return [];
		}

		const liveStreams = await twitchService.getStreams(
			token.access_token,
			broadcasterIds
		);

		const favorites = await db.selectFrom("favorites").selectAll().execute();

		const favoriteIds = new Set(favorites.map((f) => f.streamer_id));

		return liveStreams.map((stream) => ({
			user_id: stream.user_id,
			user_login: stream.user_login,
			user_name: stream.user_name,
			game_name: stream.game_name,
			viewer_count: stream.viewer_count,
			started_at: stream.started_at,
			thumbnail_url: stream.thumbnail_url,
			is_favorite: favoriteIds.has(stream.user_id),
		}));
	}),
});
