import { observable } from "@trpc/server/observable";
import { publicProcedure, router } from "../lib/trpc";
import {
	type LiveNotificationPayload,
	notificationEvents,
} from "../services/notification-poller";

export const notificationsRouter = router({
	onFavoriteLive: publicProcedure.subscription(() => {
		return observable<LiveNotificationPayload>((emit) => {
			const handler = (payload: LiveNotificationPayload) => {
				emit.next(payload);
			};
			notificationEvents.on("favorite-live", handler);
			return () => notificationEvents.off("favorite-live", handler);
		});
	}),
});
