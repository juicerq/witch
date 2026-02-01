import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import { useEffect, useState } from "react";
import { trpc } from "../trpc";

export function useNotifications() {
	const [enabled, setEnabled] = useState(false);

	const { data: settings } = trpc.settings.get.useQuery();

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

	trpc.notifications.onFavoriteLive.useSubscription(undefined, {
		onData: (payload) => {
			if (!enabled) return;
			sendNotification({
				title: `${payload.user_name} is live!`,
				body: `Your favorite streamer just started streaming on Twitch.`,
			});
		},
	});

	return { enabled };
}
