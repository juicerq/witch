import { useCallback, useMemo, useState } from "react";

export interface Stream {
	user_id: string;
	user_login: string;
	user_name: string;
	game_name: string;
	viewer_count: number;
	started_at: string;
	thumbnail_url: string;
	is_favorite: boolean;
	is_live: boolean;
}

export interface StreamFilters {
	search: string;
	games: string[];
	sortBy: "viewers" | "uptime" | "name";
	sortOrder: "asc" | "desc";
}

export interface ActiveFilter {
	type: "search" | "game" | "sort";
	label: string;
	value: string;
}

export interface UseStreamFiltersReturn {
	filters: StreamFilters;
	setSearch: (search: string) => void;
	toggleGame: (game: string) => void;
	setSortBy: (sortBy: StreamFilters["sortBy"]) => void;
	toggleSortOrder: () => void;
	clearFilters: () => void;
	clearSearch: () => void;
	removeGame: (game: string) => void;
	resetSort: () => void;
	filterStreams: (streams: Stream[]) => Stream[];
	availableGames: string[];
	activeFilters: ActiveFilter[];
	activeFilterCount: number;
	hasActiveFilters: boolean;
}

const DEFAULT_FILTERS: StreamFilters = {
	search: "",
	games: [],
	sortBy: "viewers",
	sortOrder: "desc",
};

export function useStreamFilters(
	streams: Stream[] = [],
): UseStreamFiltersReturn {
	const [filters, setFilters] = useState<StreamFilters>(DEFAULT_FILTERS);

	const setSearch = useCallback((search: string) => {
		setFilters((prev) => ({ ...prev, search }));
	}, []);

	const toggleGame = useCallback((game: string) => {
		setFilters((prev) => ({
			...prev,
			games: prev.games.includes(game)
				? prev.games.filter((g) => g !== game)
				: [...prev.games, game],
		}));
	}, []);

	const setSortBy = useCallback((sortBy: StreamFilters["sortBy"]) => {
		setFilters((prev) => ({
			...prev,
			sortBy,
			// keep UX consistent: default to desc when switching sort type
			sortOrder: prev.sortBy === sortBy ? prev.sortOrder : "desc",
		}));
	}, []);

	const toggleSortOrder = useCallback(() => {
		setFilters((prev) => ({
			...prev,
			sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
		}));
	}, []);

	const clearFilters = useCallback(() => {
		setFilters(DEFAULT_FILTERS);
	}, []);

	const clearSearch = useCallback(() => {
		setFilters((prev) => ({ ...prev, search: "" }));
	}, []);

	const removeGame = useCallback((game: string) => {
		setFilters((prev) => ({
			...prev,
			games: prev.games.filter((g) => g !== game),
		}));
	}, []);

	const resetSort = useCallback(() => {
		setFilters((prev) => ({
			...prev,
			sortBy: DEFAULT_FILTERS.sortBy,
			sortOrder: DEFAULT_FILTERS.sortOrder,
		}));
	}, []);

	const availableGames = useMemo(() => {
		const games = new Set<string>();
		for (const stream of streams) {
			if (stream.game_name) {
				games.add(stream.game_name);
			}
		}
		return Array.from(games).sort();
	}, [streams]);

	const activeFilters = useMemo((): ActiveFilter[] => {
		const result: ActiveFilter[] = [];

		if (filters.search.trim()) {
			result.push({
				type: "search",
				label: `"${filters.search.trim()}"`,
				value: filters.search.trim(),
			});
		}

		for (const game of filters.games) {
			result.push({
				type: "game",
				label: game.length > 20 ? `${game.slice(0, 20)}...` : game,
				value: game,
			});
		}

		const isDefaultSort =
			filters.sortBy === "viewers" && filters.sortOrder === "desc";
		if (!isDefaultSort) {
			const sortLabel = {
				viewers: "Viewers",
				uptime: "Uptime",
				name: "Name",
			}[filters.sortBy];
			const orderLabel = filters.sortOrder === "asc" ? "↑" : "↓";
			result.push({
				type: "sort",
				label: `${sortLabel} ${orderLabel}`,
				value: `${filters.sortBy}-${filters.sortOrder}`,
			});
		}

		return result;
	}, [filters]);

	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (filters.search.trim()) count++;
		count += filters.games.length;
		const isDefaultSort =
			filters.sortBy === "viewers" && filters.sortOrder === "desc";
		if (!isDefaultSort) count++;
		return count;
	}, [filters]);

	const hasActiveFilters = activeFilterCount > 0;

	const filterStreams = useCallback(
		(streamsToFilter: Stream[]): Stream[] => {
			let result = [...streamsToFilter];

			// Filter by search (streamer name)
			if (filters.search.trim()) {
				const searchLower = filters.search.toLowerCase().trim();
				result = result.filter(
					(stream) =>
						stream.user_name.toLowerCase().includes(searchLower) ||
						stream.user_login.toLowerCase().includes(searchLower),
				);
			}

			// Filter by selected games
			if (filters.games.length > 0) {
				result = result.filter((stream) =>
					filters.games.includes(stream.game_name),
				);
			}

			// Sort streams
			result.sort((a, b) => {
				let comparison = 0;

				switch (filters.sortBy) {
					case "viewers":
						comparison = a.viewer_count - b.viewer_count;
						break;
					case "uptime": {
						const uptimeA = new Date(a.started_at).getTime();
						const uptimeB = new Date(b.started_at).getTime();
						// Earlier start time = longer uptime
						comparison = uptimeB - uptimeA;
						break;
					}
					case "name":
						comparison = a.user_name
							.toLowerCase()
							.localeCompare(b.user_name.toLowerCase());
						break;
				}

				return filters.sortOrder === "asc" ? comparison : -comparison;
			});

			return result;
		},
		[filters],
	);

	return {
		filters,
		setSearch,
		toggleGame,
		setSortBy,
		toggleSortOrder,
		clearFilters,
		clearSearch,
		removeGame,
		resetSort,
		filterStreams,
		availableGames,
		activeFilters,
		activeFilterCount,
		hasActiveFilters,
	};
}
