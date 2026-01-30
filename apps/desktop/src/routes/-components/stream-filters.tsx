import {
	ArrowDownAZ,
	ArrowUpAZ,
	Clock,
	Search,
	SortAsc,
	SortDesc,
	Users,
	X,
} from "lucide-react";
import { Chip } from "../../components/ui/chip";
import { Input } from "../../components/ui/input";
import type { StreamFilters as Filters, UseStreamFiltersReturn } from "../../hooks/use-stream-filters";

interface StreamFiltersProps {
	filters: Filters;
	setSearch: UseStreamFiltersReturn["setSearch"];
	toggleGame: UseStreamFiltersReturn["toggleGame"];
	setSortBy: UseStreamFiltersReturn["setSortBy"];
	toggleSortOrder: UseStreamFiltersReturn["toggleSortOrder"];
	clearFilters: UseStreamFiltersReturn["clearFilters"];
	availableGames: string[];
}

export function StreamFilters({
	filters,
	setSearch,
	toggleGame,
	setSortBy,
	toggleSortOrder,
	clearFilters,
	availableGames,
}: StreamFiltersProps) {
	const hasActiveFilters =
		filters.search.trim() !== "" ||
		filters.games.length > 0 ||
		filters.sortBy !== "viewers" ||
		filters.sortOrder !== "desc";

	const SortOrderIcon = filters.sortOrder === "desc" ? SortDesc : SortAsc;

	return (
		<div className="space-y-3 pb-3 border-b border-[var(--border-default)]">
			{/* Search Input */}
			<div className="relative">
				<Search
					size={14}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
				/>
				<Input
					type="text"
					placeholder="Search streamer..."
					value={filters.search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9 pr-3"
				/>
			</div>

			{/* Game Chips */}
			{availableGames.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{availableGames.map((game) => (
						<Chip
							key={game}
							active={filters.games.includes(game)}
							onClick={() => toggleGame(game)}
							title={game}
						>
							{game.length > 20 ? `${game.slice(0, 20)}...` : game}
						</Chip>
					))}
				</div>
			)}

			{/* Sort Controls */}
			<div className="flex items-center gap-2">
				<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
					Sort:
				</span>
				<div className="flex gap-1">
					<Chip
						active={filters.sortBy === "viewers"}
						onClick={() => setSortBy("viewers")}
						title="Sort by viewers"
					>
						<Users size={12} />
						Viewers
					</Chip>
					<Chip
						active={filters.sortBy === "uptime"}
						onClick={() => setSortBy("uptime")}
						title="Sort by uptime"
					>
						<Clock size={12} />
						Uptime
					</Chip>
					<Chip
						active={filters.sortBy === "name"}
						onClick={() => setSortBy("name")}
						title="Sort by name"
					>
						{filters.sortOrder === "asc" ? (
							<ArrowUpAZ size={12} />
						) : (
							<ArrowDownAZ size={12} />
						)}
						Name
					</Chip>
				</div>

				{/* Sort Order Toggle */}
				<button
					type="button"
					onClick={toggleSortOrder}
					className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
					title={`Sort ${filters.sortOrder === "desc" ? "descending" : "ascending"}`}
				>
					<SortOrderIcon size={14} />
				</button>

				{/* Clear Filters */}
				{hasActiveFilters && (
					<button
						type="button"
						onClick={clearFilters}
						className="ml-auto flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
						title="Clear all filters"
					>
						<X size={12} />
						Clear
					</button>
				)}
			</div>
		</div>
	);
}
