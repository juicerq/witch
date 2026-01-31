import { sql } from "kysely";
import { z } from "zod";
import { db } from "../db";
import { getValidToken } from "../lib/auth";
import { publicProcedure, router } from "../lib/trpc";
import { twitchService } from "../services/twitch";

function generateId(): string {
	return crypto.randomUUID();
}

async function trackStreamSessions(
	liveStreams: Array<{
		user_id: string;
		user_login: string;
		started_at: string;
		game_name?: string;
	}>
) {
	// 1. Get all open sessions (ended_at IS NULL)
	const openSessions = await db
		.selectFrom("stream_sessions")
		.selectAll()
		.where("ended_at", "is", null)
		.execute();

	const openSessionsByStreamerId = new Map(
		openSessions.map((s) => [s.streamer_id, s])
	);

	const liveStreamersById = new Map(
		liveStreams.map((s) => [s.user_id, s])
	);

	const now = new Date().toISOString();

	// 2. For each live stream, check if we need to create a session
	for (const stream of liveStreams) {
		const existingSession = openSessionsByStreamerId.get(stream.user_id);
		
		if (!existingSession) {
			// No open session - create one
			await db
				.insertInto("stream_sessions")
				.values({
					id: generateId(),
					streamer_id: stream.user_id,
					streamer_login: stream.user_login,
					started_at: stream.started_at,
					game_name: stream.game_name ?? null,
				})
				.execute();
		} else if (existingSession.started_at !== stream.started_at) {
			// Different stream (restarted) - close old, open new
			await db
				.updateTable("stream_sessions")
				.set({ ended_at: now })
				.where("id", "=", existingSession.id)
				.execute();

			await db
				.insertInto("stream_sessions")
				.values({
					id: generateId(),
					streamer_id: stream.user_id,
					streamer_login: stream.user_login,
					started_at: stream.started_at,
					game_name: stream.game_name ?? null,
				})
				.execute();
		}
	}

	// 3. For each open session, close if streamer is no longer live
	for (const session of openSessions) {
		if (!liveStreamersById.has(session.streamer_id)) {
			await db
				.updateTable("stream_sessions")
				.set({ ended_at: now })
				.where("id", "=", session.id)
				.execute();
		}
	}
}

async function getStreamerHistoryStats(
	streamerIds: string[]
): Promise<
	Map<string, { last_online: string | null; stream_count: number }>
> {
	if (streamerIds.length === 0) {
		return new Map();
	}

	// Get last session and count for each streamer
	const stats = await db
		.selectFrom("stream_sessions")
		.select([
			"streamer_id",
			sql<string>`MAX(started_at)`.as("last_online"),
			sql<number>`COUNT(*)`.as("stream_count"),
		])
		.where("streamer_id", "in", streamerIds)
		.groupBy("streamer_id")
		.execute();

	const result = new Map<
		string,
		{ last_online: string | null; stream_count: number }
	>();

	// Initialize all with defaults
	for (const id of streamerIds) {
		result.set(id, { last_online: null, stream_count: 0 });
	}

	// Fill in actual data
	for (const stat of stats) {
		result.set(stat.streamer_id, {
			last_online: stat.last_online,
			stream_count: Number(stat.stream_count),
		});
	}

	return result;
}

export const streamsRouter = router({
	getFollowed: publicProcedure.query(async () => {
		const token = await getValidToken();

		if (!token) {
			return { online: [], offline: [] };
		}

		const followedChannels = await twitchService.getFollowedChannels(
			token.access_token,
			token.user_id
		);

		const broadcasterIds = followedChannels.map(
			(channel) => channel.broadcaster_id
		);

		if (broadcasterIds.length === 0) {
			return { online: [], offline: [] };
		}

		const liveStreams = await twitchService.getStreams(
			token.access_token,
			broadcasterIds
		);

		// Track sessions (async, non-blocking for the response)
		trackStreamSessions(liveStreams).catch((err) =>
			console.error("Failed to track stream sessions:", err)
		);

		const favorites = await db.selectFrom("favorites").selectAll().execute();
		const favoriteIds = new Set(favorites.map((f) => f.streamer_id));
		const liveIds = new Set(liveStreams.map((stream) => stream.user_id));

		const offlineChannels = followedChannels.filter(
			(channel) => !liveIds.has(channel.broadcaster_id)
		);
		const offlineIds = offlineChannels.map((channel) => channel.broadcaster_id);
		const offlineUsers = await twitchService.getUsers(
			token.access_token,
			offlineIds
		);
		const offlineUsersById = new Map(
			offlineUsers.map((user) => [user.id, user])
		);

		// Get history stats for all streamers
		const historyStats = await getStreamerHistoryStats(broadcasterIds);

		const online = liveStreams.map((stream) => {
			const stats = historyStats.get(stream.user_id) ?? {
				last_online: null,
				stream_count: 0,
			};
			return {
				user_id: stream.user_id,
				user_login: stream.user_login,
				user_name: stream.user_name,
				game_name: stream.game_name,
				viewer_count: stream.viewer_count,
				started_at: stream.started_at,
				thumbnail_url: stream.thumbnail_url,
				is_favorite: favoriteIds.has(stream.user_id),
				is_live: true,
				last_online: stream.started_at, // Currently live, so started_at is "last online"
				stream_count: stats.stream_count,
			};
		});

		const offline = offlineChannels.map((channel) => {
			const user = offlineUsersById.get(channel.broadcaster_id);
			const stats = historyStats.get(channel.broadcaster_id) ?? {
				last_online: null,
				stream_count: 0,
			};
			return {
				user_id: channel.broadcaster_id,
				user_login: channel.broadcaster_login,
				user_name: channel.broadcaster_name,
				profile_image_url: user?.profile_image_url ?? "",
				is_favorite: favoriteIds.has(channel.broadcaster_id),
				is_live: false,
				last_online: stats.last_online,
				stream_count: stats.stream_count,
			};
		});

		return { online, offline };
	}),

	getHistory: publicProcedure
		.input(z.object({ streamerId: z.string(), limit: z.number().default(10) }))
		.query(async ({ input }) => {
			const sessions = await db
				.selectFrom("stream_sessions")
				.selectAll()
				.where("streamer_id", "=", input.streamerId)
				.orderBy("started_at", "desc")
				.limit(input.limit)
				.execute();

			return sessions.map((s) => ({
				id: s.id,
				started_at: s.started_at,
				ended_at: s.ended_at,
				game_name: s.game_name,
				duration_minutes: s.ended_at
					? Math.round(
							(new Date(s.ended_at).getTime() -
								new Date(s.started_at).getTime()) /
								(1000 * 60)
					  )
					: null,
			}));
		}),

	getStreamerStats: publicProcedure
		.input(z.object({ streamerId: z.string() }))
		.query(async ({ input }) => {
			const sessions = await db
				.selectFrom("stream_sessions")
				.selectAll()
				.where("streamer_id", "=", input.streamerId)
				.execute();

			if (sessions.length === 0) {
				return {
					lastOnline: null,
					totalSessions: 0,
					averageStartHour: null,
					commonDays: [],
					averageDuration: null,
				};
			}

			// Last online
			const lastOnline = sessions.reduce((latest, s) => {
				const startedAt = new Date(s.started_at);
				return startedAt > latest ? startedAt : latest;
			}, new Date(0));

			// Average start hour
			const startHours = sessions.map((s) => new Date(s.started_at).getHours());
			const averageStartHour = Math.round(
				startHours.reduce((a, b) => a + b, 0) / startHours.length
			);

			// Common days
			const dayNames = [
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			];
			const dayCounts: Record<string, number> = {};
			for (const session of sessions) {
				const day = dayNames[new Date(session.started_at).getDay()];
				dayCounts[day] = (dayCounts[day] || 0) + 1;
			}
			const sortedDays = Object.entries(dayCounts)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([day]) => day);

			// Average duration (only for completed sessions)
			const completedSessions = sessions.filter((s) => s.ended_at);
			let averageDuration: number | null = null;
			if (completedSessions.length > 0) {
				const totalDuration = completedSessions.reduce((sum, s) => {
					const duration =
						new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime();
					return sum + duration;
				}, 0);
				averageDuration = Math.round(
					totalDuration / completedSessions.length / (1000 * 60)
				);
			}

			return {
				lastOnline: lastOnline.toISOString(),
				totalSessions: sessions.length,
				averageStartHour,
				commonDays: sortedDays,
				averageDuration,
			};
		}),
});
