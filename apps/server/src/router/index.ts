import { router } from "../lib/trpc";
import { authRouter } from "./auth";
import { favoritesRouter } from "./favorites";
import { notificationsRouter } from "./notifications";
import { settingsRouter } from "./settings";
import { setupRouter } from "./setup";
import { streamsRouter } from "./streams";

export const appRouter = router({
	auth: authRouter,
	streams: streamsRouter,
	favorites: favoritesRouter,
	settings: settingsRouter,
	notifications: notificationsRouter,
	setup: setupRouter,
});

export type AppRouter = typeof appRouter;
