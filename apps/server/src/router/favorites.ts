import { z } from "zod";
import { publicProcedure, router } from "../lib/trpc";
import {
	listFavorites,
	setFavoriteNotify,
	toggleFavorite,
} from "../services/favorites";

const schemas = {
	toggleInput: z.object({
		streamer_id: z.string(),
		streamer_login: z.string(),
		streamer_name: z.string(),
	}),
	setNotifyInput: z.object({
		streamer_id: z.string(),
		notify: z.boolean(),
	}),
} as const;

export const favoritesRouter = router({
	list: publicProcedure.query(() => {
		return listFavorites();
	}),

	toggle: publicProcedure.input(schemas.toggleInput).mutation(({ input }) => {
		return toggleFavorite(input);
	}),

	setNotify: publicProcedure
		.input(schemas.setNotifyInput)
		.mutation(({ input }) => {
			return setFavoriteNotify(input);
		}),
});
