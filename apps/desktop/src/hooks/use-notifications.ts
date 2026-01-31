import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import { useEffect, useRef, useState } from "react";
import { trpc } from "../trpc";

interface Stream {
	user_id: string;
	user_login: string;
	user_name: string;
	is_favorite: boolean;
}

export function useNotifications() {
	const [enabled, setEnabled] = useState(false);
	const previousStreamsRef = useRef<Map<string, boolean>>(new Map());
	const hasInitialized = useRef(false);

	const { data: settings } = trpc.settings.get.useQuery();
	const { data: streamsData } = trpc.streams.getFollowed.useQuery(undefined, {
		refetchInterval: 60000,
	});
	const streams = streamsData?.online;

	// Initialize notification permission
	useEffect(() => {
		async function init() {
			let permission = await isPermissionGranted();
			if (!permission) {
				const result = await requestPermission();
				permission = result === "granted";
			}
			setEnabled(permission && settings?.notifications_enabled === "true");
		}
		init();
	}, [settings?.notifications_enabled]);

	// Track streams and send notifications
	useEffect(() => {
		if (!enabled || !streams) return;

		const currentStreams = new Map<string, boolean>();
		const newOnlineStreams: Stream[] = [];

		for (const stream of streams) {
			currentStreams.set(stream.user_id, stream.is_favorite);

			// Check if this is a favorite that just came online
			const wasOnline = previousStreamsRef.current.has(stream.user_id);
			if (stream.is_favorite && !wasOnline && hasInitialized.current) {
				newOnlineStreams.push(stream);
			}
		}

		// Send notifications for new online favorites
		for (const stream of newOnlineStreams) {
			sendNotification({
				title: `${stream.user_name} is live!`,
				body: `Your favorite streamer just started streaming on Twitch.`,
			});
		}

		previousStreamsRef.current = currentStreams;
		hasInitialized.current = true;
	}, [streams, enabled]);

	return { enabled };
}
