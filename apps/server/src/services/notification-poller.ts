import { EventEmitter } from "node:events";
import { db } from "../db";
import { getValidToken } from "../lib/auth";
import { getSettings } from "./settings";
import { twitchService } from "./twitch";

export interface LiveNotificationPayload {
	user_id: string;
	user_login: string;
	user_name: string;
	game_name: string | null;
	started_at: string;
}

export const notificationEvents = new EventEmitter();

let previousLiveIds = new Set<string>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let isPolling = false;
let forceLiveServedOnce = false;

async function pollOnce(): Promise<void> {
	if (isPolling) return;
	isPolling = true;

	try {
		const settings = await getSettings();
		const intervalMs = Math.max(
			5000,
			Number(settings.polling_interval) || 60000,
		);
		const notificationsEnabled = settings.notifications_enabled === "true";

		const token = await getValidToken();
		if (!token) {
			previousLiveIds = new Set();
			scheduleNext(intervalMs);
			return;
		}

		const favorites = await db
			.selectFrom("favorites")
			.select(["streamer_id", "notify"])
			.execute();
		const notifyFavorites = favorites.filter((f) => f.notify === 1);
		const favoriteIds = notifyFavorites.map((f) => f.streamer_id);

		if (favoriteIds.length === 0) {
			previousLiveIds = new Set();
			scheduleNext(intervalMs);
			return;
		}

		let liveStreams = await twitchService.getStreams(
			token.access_token,
			favoriteIds,
		);

		if (process.env.WITCH_FORCE_LIVE === "true") {
			if (forceLiveServedOnce) {
				liveStreams = [
					{
						user_id: "999999999",
						user_login: "fake_live",
						user_name: "Fake Live",
						game_name: "Just Testing",
						viewer_count: 1,
						started_at: new Date().toISOString(),
						thumbnail_url: "",
					},
					...liveStreams,
				];
			} else {
				forceLiveServedOnce = true;
			}
		}

		const currentLiveIds = new Set(liveStreams.map((stream) => stream.user_id));

		if (notificationsEnabled) {
			for (const stream of liveStreams) {
				if (!previousLiveIds.has(stream.user_id)) {
					notificationEvents.emit("favorite-live", {
						user_id: stream.user_id,
						user_login: stream.user_login,
						user_name: stream.user_name,
						game_name: stream.game_name ?? null,
						started_at: stream.started_at,
					} satisfies LiveNotificationPayload);
				}
			}
		}

		previousLiveIds = currentLiveIds;
		scheduleNext(intervalMs);
	} catch (error) {
		console.error("Notification poller failed:", error);
		scheduleNext(60000);
	} finally {
		isPolling = false;
	}
}

function scheduleNext(intervalMs: number): void {
	if (pollTimer) {
		clearTimeout(pollTimer);
	}
	pollTimer = setTimeout(() => {
		pollOnce().catch((error) =>
			console.error("Notification poller failed:", error),
		);
	}, intervalMs);
}

export function startNotificationPoller(): void {
	if (pollTimer) return;
	pollOnce().catch((error) =>
		console.error("Notification poller failed:", error),
	);
}
