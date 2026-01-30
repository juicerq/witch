import { router } from "../lib/trpc";
import { authRouter } from "./auth";
import { favoritesRouter } from "./favorites";
import { settingsRouter } from "./settings";
import { streamsRouter } from "./streams";

export const appRouter = router({
	auth: authRouter,
	streams: streamsRouter,
	favorites: favoritesRouter,
	settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
