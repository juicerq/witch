import crypto from "node:crypto";
import { sql } from "kysely";
import { db } from "../db";
import { getValidToken } from "../lib/auth";
import { twitchService } from "./twitch";

type LiveStream = {
	user_id: string;
	user_login: string;
	started_at: string;
	game_name?: string;
};

type HistoryStats = {
	last_online: string | null;
	stream_count: number;
};

const dayNames = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

function createEmptyHistoryStats(): HistoryStats {
	return { last_online: null, stream_count: 0 };
}

function generateId(): string {
	return crypto.randomUUID();
}

function buildSessionValues(stream: LiveStream) {
	return {
		id: generateId(),
		streamer_id: stream.user_id,
		streamer_login: stream.user_login,
		started_at: stream.started_at,
		game_name: stream.game_name ?? null,
	};
}

async function insertStreamSession(stream: LiveStream): Promise<void> {
	await db
		.insertInto("stream_sessions")
		.values(buildSessionValues(stream))
		.execute();
}

async function closeStreamSession(
	streamSessionId: string,
	endedAt: string,
): Promise<void> {
	await db
		.updateTable("stream_sessions")
		.set({ ended_at: endedAt })
		.where("id", "=", streamSessionId)
		.execute();
}

async function trackStreamSessions(liveStreams: LiveStream[]) {
	const openSessions = await db
		.selectFrom("stream_sessions")
		.select(["id", "streamer_id", "started_at"])
		.where("ended_at", "is", null)
		.execute();

	const openSessionsByStreamerId = new Map(
		openSessions.map((session) => [session.streamer_id, session]),
	);

	const liveStreamersById = new Map(
		liveStreams.map((stream) => [stream.user_id, stream]),
	);

	const now = new Date().toISOString();

	for (const stream of liveStreams) {
		const existingSession = openSessionsByStreamerId.get(stream.user_id);

		if (!existingSession) {
			await insertStreamSession(stream);
			continue;
		}

		if (existingSession.started_at !== stream.started_at) {
			await closeStreamSession(existingSession.id, now);
			await insertStreamSession(stream);
		}
	}

	for (const session of openSessions) {
		if (!liveStreamersById.has(session.streamer_id)) {
			await closeStreamSession(session.id, now);
		}
	}
}

async function getStreamerHistoryStats(streamerIds: string[]) {
	if (streamerIds.length === 0) {
		return new Map<string, HistoryStats>();
	}

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

	const result = new Map<string, HistoryStats>();

	for (const id of streamerIds) {
		result.set(id, createEmptyHistoryStats());
	}

	for (const stat of stats) {
		result.set(stat.streamer_id, {
			last_online: stat.last_online,
			stream_count: Number(stat.stream_count),
		});
	}

	return result;
}

export async function getFollowedStreams() {
	const token = await getValidToken();

	if (!token) {
		return { online: [], offline: [] };
	}

	const followedChannels = await twitchService.getFollowedChannels(
		token.access_token,
		token.user_id,
	);

	const broadcasterIds = followedChannels.map(
		(channel) => channel.broadcaster_id,
	);

	if (broadcasterIds.length === 0) {
		return { online: [], offline: [] };
	}

	const liveStreams = await twitchService.getStreams(
		token.access_token,
		broadcasterIds,
	);

	trackStreamSessions(liveStreams).catch((error) =>
		console.error("Failed to track stream sessions:", error),
	);

	const favorites = await db
		.selectFrom("favorites")
		.select(["streamer_id"])
		.execute();
	const favoriteIds = new Set(
		favorites.map((favorite) => favorite.streamer_id),
	);
	const liveIds = new Set(liveStreams.map((stream) => stream.user_id));

	const offlineChannels = followedChannels.filter(
		(channel) => !liveIds.has(channel.broadcaster_id),
	);
	const offlineIds = offlineChannels.map((channel) => channel.broadcaster_id);
	const offlineUsers = await twitchService.getUsers(
		token.access_token,
		offlineIds,
	);
	const offlineUsersById = new Map(offlineUsers.map((user) => [user.id, user]));

	const historyStats = await getStreamerHistoryStats(broadcasterIds);

	const online = liveStreams.map((stream) => {
		const stats = historyStats.get(stream.user_id) ?? createEmptyHistoryStats();
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
			last_online: stream.started_at,
			stream_count: stats.stream_count,
		};
	});

	const offline = offlineChannels.map((channel) => {
		const user = offlineUsersById.get(channel.broadcaster_id);
		const stats =
			historyStats.get(channel.broadcaster_id) ?? createEmptyHistoryStats();
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
}

export async function getStreamHistory(streamerId: string, limit: number) {
	const sessions = await db
		.selectFrom("stream_sessions")
		.select(["id", "started_at", "ended_at", "game_name"])
		.where("streamer_id", "=", streamerId)
		.orderBy("started_at", "desc")
		.limit(limit)
		.execute();

	return sessions.map((session) => ({
		id: session.id,
		started_at: session.started_at,
		ended_at: session.ended_at,
		game_name: session.game_name,
		duration_minutes: session.ended_at
			? Math.round(
					(new Date(session.ended_at).getTime() -
						new Date(session.started_at).getTime()) /
						(1000 * 60),
				)
			: null,
	}));
}

export async function getStreamerStats(streamerId: string) {
	const sessions = await db
		.selectFrom("stream_sessions")
		.select(["started_at", "ended_at"])
		.where("streamer_id", "=", streamerId)
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

	const lastOnline = sessions.reduce((latest, session) => {
		const startedAt = new Date(session.started_at);
		return startedAt > latest ? startedAt : latest;
	}, new Date(0));

	const startHours = sessions.map((session) =>
		new Date(session.started_at).getHours(),
	);
	const averageStartHour = Math.round(
		startHours.reduce((a, b) => a + b, 0) / startHours.length,
	);

	const dayCounts: Record<string, number> = {};
	for (const session of sessions) {
		const day = dayNames[new Date(session.started_at).getDay()];
		dayCounts[day] = (dayCounts[day] || 0) + 1;
	}
	const sortedDays = Object.entries(dayCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([day]) => day);

	const completedSessions = sessions.filter((session) => session.ended_at);
	let averageDuration: number | null = null;
	if (completedSessions.length > 0) {
		const totalDuration = completedSessions.reduce((sum, session) => {
			const duration =
				new Date(session.ended_at!).getTime() -
				new Date(session.started_at).getTime();
			return sum + duration;
		}, 0);
		averageDuration = Math.round(
			totalDuration / completedSessions.length / (1000 * 60),
		);
	}

	return {
		lastOnline: lastOnline.toISOString(),
		totalSessions: sessions.length,
		averageStartHour,
		commonDays: sortedDays,
		averageDuration,
	};
}
