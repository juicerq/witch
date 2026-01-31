import { openUrl } from "@tauri-apps/plugin-opener";
import { Clock, Eye, Gamepad2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { BellToggle } from "../../components/ui/bell-toggle";
import { Card } from "../../components/ui/card";

interface StreamCardProps {
	stream: {
		user_id: string;
		user_login: string;
		user_name: string;
		game_name?: string;
		viewer_count?: number;
		started_at?: string;
		thumbnail_url?: string;
		profile_image_url?: string;
		is_favorite: boolean;
		is_live: boolean;
	};
	onToggleFavorite: (streamerId: string) => void;
}

function formatViewers(count: number): string {
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toString();
}

function formatUptime(startedAt?: string): string {
	if (!startedAt) return "";
	const start = new Date(startedAt);
	const now = new Date();
	const diffMs = now.getTime() - start.getTime();
	const hours = Math.floor(diffMs / (1000 * 60 * 60));
	const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

function getThumbnailUrl(template: string, width = 80, height = 45): string {
	return template
		.replace("{width}", width.toString())
		.replace("{height}", height.toString());
}

export function StreamCard({ stream, onToggleFavorite }: StreamCardProps) {
	const handleClick = () => {
		openUrl(`https://twitch.tv/${stream.user_login}`);
	};

	return (
		<Card
			glow={stream.is_favorite}
			className={`
				cursor-pointer transition-all duration-200
				hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)]
				${stream.is_favorite ? "border-[var(--green-40)]" : ""}
			`}
			onClick={handleClick}
		>
			<div className="flex gap-3">
				{/* Thumbnail */}
				<div className="relative flex-shrink-0">
					{(stream.is_live
						? stream.thumbnail_url
						? getThumbnailUrl(stream.thumbnail_url)
						: ""
						: stream.profile_image_url) ? (
						<img
							src={
								stream.is_live
									? stream.thumbnail_url
										? getThumbnailUrl(stream.thumbnail_url)
										: ""
									: stream.profile_image_url
							}
							alt={`${stream.user_name} stream`}
							className="w-20 h-[45px] object-cover border border-[var(--border-default)]"
						/>
					) : (
						<div className="w-20 h-[45px] border border-[var(--border-default)] bg-[var(--bg-tertiary)]" />
					)}
					<Badge
						variant={stream.is_live ? "live" : "offline"}
						className="absolute -top-1 -left-1 text-[8px]"
					>
						{stream.is_live ? "LIVE" : "OFFLINE"}
					</Badge>
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					{/* Header row */}
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<span className="font-semibold text-[var(--text-primary)] truncate">
								{stream.user_name}
							</span>
							{stream.is_favorite && (
								<Badge variant="favorite" className="text-[8px] flex-shrink-0">
									FAV
								</Badge>
							)}
						</div>
						<BellToggle
							active={stream.is_favorite}
							onToggle={() => onToggleFavorite(stream.user_id)}
							size={14}
						/>
					</div>

					{stream.is_live && (
						<>
							{/* Game */}
							<div className="flex items-center gap-1 text-[var(--text-secondary)] text-xs mt-0.5 truncate">
								<Gamepad2
									size={12}
									className="flex-shrink-0 text-[var(--text-muted)]"
								/>
								<span className="truncate">
									{stream.game_name || "Just Chatting"}
								</span>
							</div>

							{/* Stats row */}
							<div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-muted)]">
								<div className="flex items-center gap-1">
									<Eye size={10} />
									<span className="text-[var(--text-secondary)]">
										{formatViewers(stream.viewer_count || 0)}
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Clock size={10} />
									<span>{formatUptime(stream.started_at)}</span>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</Card>
	);
}
