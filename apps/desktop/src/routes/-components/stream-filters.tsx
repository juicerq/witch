import {
	ArrowDownAZ,
	ArrowUpAZ,
	ChevronDown,
	ChevronUp,
	Clock,
	Filter,
	Search,
	SortAsc,
	SortDesc,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { Chip } from "../../components/ui/chip";
import { Input } from "../../components/ui/input";
import type {
	ActiveFilter,
	StreamFilters as Filters,
	UseStreamFiltersReturn,
} from "../../hooks/use-stream-filters";

interface StreamFiltersProps {
	filters: Filters;
	setSearch: UseStreamFiltersReturn["setSearch"];
	toggleGame: UseStreamFiltersReturn["toggleGame"];
	setSortBy: UseStreamFiltersReturn["setSortBy"];
	toggleSortOrder: UseStreamFiltersReturn["toggleSortOrder"];
	clearFilters: UseStreamFiltersReturn["clearFilters"];
	clearSearch: UseStreamFiltersReturn["clearSearch"];
	removeGame: UseStreamFiltersReturn["removeGame"];
	resetSort: UseStreamFiltersReturn["resetSort"];
	availableGames: string[];
	activeFilters: ActiveFilter[];
	activeFilterCount: number;
}

export function StreamFilters({
	filters,
	setSearch,
	toggleGame,
	setSortBy,
	toggleSortOrder,
	clearFilters,
	clearSearch,
	removeGame,
	resetSort,
	availableGames,
	activeFilters,
	activeFilterCount,
}: StreamFiltersProps) {
	const [isPanelOpen, setIsPanelOpen] = useState(false);

	const SortOrderIcon = filters.sortOrder === "desc" ? SortDesc : SortAsc;
	const PanelToggleIcon = isPanelOpen ? ChevronUp : ChevronDown;

	const handleRemoveFilter = (filter: ActiveFilter) => {
		switch (filter.type) {
			case "search":
				clearSearch();
				break;
			case "game":
				removeGame(filter.value);
				break;
			case "sort":
				resetSort();
				break;
		}
	};

	return (
		<div className="space-y-2 pb-3 border-b border-[var(--border-default)]">
			{/* Line A: Compact Search Bar + Filters Button */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
					/>
					<Input
						type="text"
						placeholder="Search streamer..."
						value={filters.search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 pr-3 text-[11px] !pl-10"
						style={{ paddingLeft: 40 }}
					/>
				</div>

				<button
					type="button"
					onClick={() => setIsPanelOpen(!isPanelOpen)}
					className={`
						flex items-center gap-1.5 px-3 h-8
						text-[11px] font-medium
						border transition-all
						${
							isPanelOpen
								? "bg-[var(--green-20)] border-[var(--green-40)] text-[var(--green-100)]"
								: activeFilterCount > 0
									? "bg-[var(--bg-tertiary)] border-[var(--border-hover)] text-[var(--text-secondary)]"
									: "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
						}
					`}
					title={isPanelOpen ? "Hide filters" : "Show filters"}
				>
					<Filter size={12} />
					<span>Filters</span>
					{activeFilterCount > 0 && (
						<span className="px-1.5 py-0.5 text-[9px] font-bold bg-[var(--green-30)] text-[var(--green-100)] rounded-sm">
							{activeFilterCount}
						</span>
					)}
					<PanelToggleIcon size={12} className="ml-0.5" />
				</button>
			</div>

			{/* Line B: Active Filter Chips */}
			{activeFilters.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5">
					{activeFilters.map((filter) => (
						<button
							key={`${filter.type}-${filter.value}`}
							type="button"
							onClick={() => handleRemoveFilter(filter)}
							className="
								flex items-center gap-1 px-2 py-1
								text-[10px] font-medium
								bg-[var(--green-20)] border border-[var(--green-40)]
								text-[var(--green-100)]
								hover:bg-[var(--green-30)] hover:border-[var(--green-60)]
								transition-all group
							"
							title={`Remove: ${filter.label}`}
						>
							<span>{filter.label}</span>
							<X size={10} className="opacity-60 group-hover:opacity-100" />
						</button>
					))}

					{activeFilters.length > 1 && (
						<button
							type="button"
							onClick={clearFilters}
							className="
								flex items-center gap-1 px-2 py-1
								text-[10px]
								text-[var(--text-muted)] hover:text-[var(--red)]
								transition-colors
							"
							title="Clear all filters"
						>
							Clear all
						</button>
					)}
				</div>
			)}

			{/* Collapsible Panel: Games + Sort */}
			{isPanelOpen && (
				<div className="pt-2 space-y-3 animate-fade-in">
					{/* Game Chips */}
					{availableGames.length > 0 && (
						<div className="space-y-1.5">
							<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
								Games
							</span>
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
						</div>
					)}

					{/* Sort Controls */}
					<div className="flex items-center gap-3">
						{/* Sort By - Segmented Control */}
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
								Sort
							</span>
							<div className="flex border border-[var(--border-default)]">
								<button
									type="button"
									onClick={() => setSortBy("viewers")}
									className={`
										flex items-center gap-1 px-2 py-1
										text-[11px] font-medium transition-all
										${
											filters.sortBy === "viewers"
												? "bg-[var(--green-20)] text-[var(--green-100)]"
												: "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
										}
									`}
									title="Sort by viewers"
								>
									<Users size={11} />
									<span>Viewers</span>
								</button>
								<button
									type="button"
									onClick={() => setSortBy("uptime")}
									className={`
										flex items-center gap-1 px-2 py-1
										text-[11px] font-medium transition-all
										border-l border-[var(--border-default)]
										${
											filters.sortBy === "uptime"
												? "bg-[var(--green-20)] text-[var(--green-100)]"
												: "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
										}
									`}
									title="Sort by uptime"
								>
									<Clock size={11} />
									<span>Uptime</span>
								</button>
								<button
									type="button"
									onClick={() => setSortBy("name")}
									className={`
										flex items-center gap-1 px-2 py-1
										text-[11px] font-medium transition-all
										border-l border-[var(--border-default)]
										${
											filters.sortBy === "name"
												? "bg-[var(--green-20)] text-[var(--green-100)]"
												: "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
										}
									`}
									title="Sort by name"
								>
									{filters.sortOrder === "asc" ? (
										<ArrowUpAZ size={11} />
									) : (
										<ArrowDownAZ size={11} />
									)}
									<span>Name</span>
								</button>
							</div>
						</div>

						{/* Order Toggle */}
						<button
							type="button"
							onClick={toggleSortOrder}
							className={`
								flex items-center justify-center gap-1 px-2
								h-[26px]
								text-[11px] font-medium
								border transition-all
								min-w-[32px]
								${
									filters.sortOrder === "asc"
										? "bg-[var(--green-20)] border-[var(--green-40)] text-[var(--green-100)]"
										: "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
								}
							`}
							title={`Sort ${filters.sortOrder === "desc" ? "descending" : "ascending"}`}
						>
							<SortOrderIcon size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
