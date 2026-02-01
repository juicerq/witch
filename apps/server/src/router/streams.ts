import { z } from "zod";
import { publicProcedure, router } from "../lib/trpc";
import {
	getFollowedStreams,
	getStreamerStats,
	getStreamHistory,
} from "../services/streams";

const schemas = {
	getHistoryInput: z.object({
		streamerId: z.string(),
		limit: z.number().default(10),
	}),
	getStreamerStatsInput: z.object({ streamerId: z.string() }),
} as const;

export const streamsRouter = router({
	getFollowed: publicProcedure.query(() => {
		return getFollowedStreams();
	}),

	getHistory: publicProcedure
		.input(schemas.getHistoryInput)
		.query(({ input }) => {
			return getStreamHistory(input.streamerId, input.limit);
		}),

	getStreamerStats: publicProcedure
		.input(schemas.getStreamerStatsInput)
		.query(({ input }) => {
			return getStreamerStats(input.streamerId);
		}),
});
