import { useCallback, useMemo } from "react";
import { trpc } from "../trpc";

export interface Stream {
	user_id: string;
	user_login: string;
	user_name: string;
	game_name: string;
	viewer_count: number;
	started_at: string;
	thumbnail_url: string;
	is_favorite: boolean;
}

export interface UseOptimizedStreamsResult {
	streams: Stream[] | undefined;
	favoriteStreams: Stream[];
	otherStreams: Stream[];
	toggleFavorite: (streamerId: string) => void;
	refresh: () => Promise<void>;
	isLoading: boolean;
	isRefreshing: boolean;
	error: Error | null;
}

export function useOptimizedStreams(): UseOptimizedStreamsResult {
	const utils = trpc.useUtils();

	const { data: settings } = trpc.settings.get.useQuery();
	const pollingInterval = Number(settings?.polling_interval || 60000);

	const {
		data: streams,
		isLoading,
		isFetching,
		error,
	} = trpc.streams.getFollowed.useQuery(undefined, {
		refetchInterval: pollingInterval,
	});

	const toggleFavoriteMutation = trpc.favorites.toggle.useMutation({
		onSuccess: () => {
			utils.streams.getFollowed.invalidate();
		},
	});

	// Memoize favorite streams separation
	const favoriteStreams = useMemo(() => {
		return streams?.filter((s) => s.is_favorite) ?? [];
	}, [streams]);

	// Memoize other streams separation
	const otherStreams = useMemo(() => {
		return streams?.filter((s) => !s.is_favorite) ?? [];
	}, [streams]);

	// Stable callback for toggling favorites
	const toggleFavorite = useCallback(
		(streamerId: string) => {
			const stream = streams?.find((s) => s.user_id === streamerId);
			if (!stream) return;

			toggleFavoriteMutation.mutate({
				streamer_id: stream.user_id,
				streamer_login: stream.user_login,
				streamer_name: stream.user_name,
			});
		},
		[streams, toggleFavoriteMutation]
	);

	// Stable callback for refreshing streams
	const refresh = useCallback(async () => {
		await utils.streams.getFollowed.invalidate();
	}, [utils.streams.getFollowed]);

	return {
		streams,
		favoriteStreams,
		otherStreams,
		toggleFavorite,
		refresh,
		isLoading,
		isRefreshing: isFetching && !isLoading,
		error: error as Error | null,
	};
}
