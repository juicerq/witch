import { LogOut, RefreshCw, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SettingsModal } from "../../components/settings-modal";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { EmptyState, ASCII_ART } from "../../components/ui/empty-state";
import { SectionHeader } from "../../components/ui/section-header";
import { Spinner } from "../../components/ui/spinner";
import { useStreamFilters } from "../../hooks/use-stream-filters";
import { trpc } from "../../trpc";
import { StreamCard } from "./stream-card";
import { StreamFilters } from "./stream-filters";

interface User {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
}

interface StreamsViewProps {
	user: User;
}

export function StreamsView({ user }: StreamsViewProps) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	const utils = trpc.useUtils();

	const { data: settings } = trpc.settings.get.useQuery();

	const pollingInterval = Number(settings?.polling_interval || 60000);

	const { data: streams, isLoading, error } = trpc.streams.getFollowed.useQuery(
		undefined,
		{
			refetchInterval: pollingInterval,
			refetchIntervalInBackground: false,
		}
	);

	// Refetch immediately when app becomes visible again
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				utils.streams.getFollowed.invalidate();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [utils]);

	const toggleFavorite = trpc.favorites.toggle.useMutation({
		onSuccess: () => {
			utils.streams.getFollowed.invalidate();
		},
	});

	const logout = trpc.auth.logout.useMutation({
		onSuccess: () => {
			utils.auth.status.invalidate();
		},
	});

	const {
		filters,
		setSearch,
		toggleGame,
		setSortBy,
		toggleSortOrder,
		clearFilters,
		filterStreams,
		availableGames,
	} = useStreamFilters(streams);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await utils.streams.getFollowed.invalidate();
		setIsRefreshing(false);
	};

	const handleToggleFavorite = (streamerId: string) => {
		const stream = streams?.find((s) => s.user_id === streamerId);
		if (!stream) return;

		toggleFavorite.mutate({
			streamer_id: stream.user_id,
			streamer_login: stream.user_login,
			streamer_name: stream.user_name,
		});
	};

	const filteredStreams = filterStreams(streams || []);
	const favoriteStreams = useMemo(
		() => filteredStreams.filter((s) => s.is_favorite),
		[filteredStreams]
	);
	const otherStreams = useMemo(
		() => filteredStreams.filter((s) => !s.is_favorite),
		[filteredStreams]
	);
	const totalStreams = streams?.length || 0;
	const filteredCount = filteredStreams.length;
	const hasActiveFilters =
		filters.search.trim() !== "" ||
		filters.games.length > 0 ||
		filters.sortBy !== "viewers" ||
		filters.sortOrder !== "desc";

	return (
		<>
		<SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
		<div className="flex flex-col h-full animate-fade-in">
			{/* User Bar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
				<div className="flex items-center gap-3">
					<Avatar
						src={user.profile_image_url}
						alt={user.display_name}
						size="sm"
					/>
					<div className="flex flex-col">
						<span className="text-[var(--text-primary)] text-sm font-medium">
							{user.display_name}
						</span>
						<span className="text-[var(--text-muted)] text-[10px]">
							@{user.login}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleRefresh}
						disabled={isRefreshing || isLoading}
						title="Refresh streams"
					>
						<RefreshCw
							size={14}
							className={isRefreshing ? "animate-spin" : ""}
						/>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowSettings(true)}
						title="Settings"
					>
						<Settings size={14} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => logout.mutate()}
						title="Logout"
					>
						<LogOut size={14} />
					</Button>
				</div>
			</div>

			{/* Filters */}
			{!isLoading && !error && streams && streams.length > 0 && (
				<div className="px-4 pt-3">
					<StreamFilters
						filters={filters}
						setSearch={setSearch}
						toggleGame={toggleGame}
						setSortBy={setSortBy}
						toggleSortOrder={toggleSortOrder}
						clearFilters={clearFilters}
						availableGames={availableGames}
					/>
				</div>
			)}

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4">
				{isLoading && (
					<div className="flex flex-col items-center justify-center h-64 gap-4">
						<Spinner size={24} />
						<span className="text-[var(--text-muted)] text-xs">
							Fetching streams...
						</span>
					</div>
				)}

				{error && (
					<EmptyState
						title="CONNECTION ERROR"
						description={error.message}
						ascii={ASCII_ART.error}
					/>
				)}

				{!isLoading && !error && streams && streams.length === 0 && (
					<EmptyState
						title="NO STREAMS ONLINE"
						description="None of your followed channels are currently live."
						ascii={ASCII_ART.noStreams}
					/>
				)}

				{!isLoading && !error && streams && streams.length > 0 && filteredCount === 0 && (
					<EmptyState
						title="NO MATCHES"
						description="No streams match your current filters. Try adjusting your search or clearing filters."
						ascii={ASCII_ART.noStreams}
					/>
				)}

				{!isLoading && !error && streams && streams.length > 0 && filteredCount > 0 && (
					<div className="space-y-6">
						{/* Favorites Section */}
						{favoriteStreams.length > 0 && (
							<section>
								<SectionHeader count={favoriteStreams.length}>
									FAVORITES ONLINE
								</SectionHeader>
								<div className="space-y-2">
									{favoriteStreams.map((stream) => (
										<StreamCard
											key={stream.user_id}
											stream={stream}
											onToggleFavorite={handleToggleFavorite}
										/>
									))}
								</div>
							</section>
						)}

						{/* Other Streams Section */}
						{otherStreams.length > 0 && (
							<section>
								<SectionHeader count={otherStreams.length}>
									{favoriteStreams.length > 0 ? "OTHERS ONLINE" : "STREAMS ONLINE"}
								</SectionHeader>
								<div className="space-y-2">
									{otherStreams.map((stream) => (
										<StreamCard
											key={stream.user_id}
											stream={stream}
											onToggleFavorite={handleToggleFavorite}
										/>
									))}
								</div>
							</section>
						)}
					</div>
				)}
			</div>

			{/* Status Bar */}
			<div className="px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
				<span>
					{hasActiveFilters
						? `${filteredCount} of ${totalStreams} streams`
						: `${totalStreams} streams online`}
				</span>
				<span className="flex items-center gap-1">
					<span className="status-dot status-dot-online" style={{ width: 6, height: 6 }} />
					Connected
				</span>
			</div>
		</div>
		</>
	);
}
