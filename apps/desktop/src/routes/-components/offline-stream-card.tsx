import { openUrl } from "@tauri-apps/plugin-opener";
import { History } from "lucide-react";
import { Avatar } from "../../components/ui/avatar";
import { BellToggle } from "../../components/ui/bell-toggle";
import { Card } from "../../components/ui/card";
import { StatusDot } from "../../components/ui/status-dot";
import { StreamerStatsTooltip } from "./streamer-stats-tooltip";

interface OfflineStreamCardProps {
	stream: {
		user_id: string;
		user_login: string;
		user_name: string;
		profile_image_url?: string;
		is_favorite: boolean;
		last_online?: string | null;
		stream_count?: number;
	};
	onToggleFavorite: (streamerId: string) => void;
}

function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);

	const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

	if (diffMonths > 0) {
		return rtf.format(-diffMonths, "month");
	}
	if (diffWeeks > 0) {
		return rtf.format(-diffWeeks, "week");
	}
	if (diffDays > 0) {
		return rtf.format(-diffDays, "day");
	}
	if (diffHours > 0) {
		return rtf.format(-diffHours, "hour");
	}
	if (diffMinutes > 0) {
		return rtf.format(-diffMinutes, "minute");
	}
	return "agora";
}

export function OfflineStreamCard({
	stream,
	onToggleFavorite,
}: OfflineStreamCardProps) {
	const handleClick = () => {
		openUrl(`https://twitch.tv/${stream.user_login}`);
	};

	const lastOnlineText = stream.last_online
		? formatRelativeTime(stream.last_online)
		: "Sem histórico";

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
			<div className="flex items-center gap-3">
				{stream.profile_image_url ? (
					<div className="relative flex-shrink-0">
						<Avatar
							src={stream.profile_image_url}
							alt={stream.user_name}
							size="sm"
						/>
						<StatusDot
							online={false}
							className="absolute -bottom-0.5 -right-0.5"
						/>
					</div>
				) : (
					<StatusDot online={false} className="flex-shrink-0" />
				)}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<div className="flex flex-col min-w-0">
							<span className="font-semibold text-[var(--text-primary)] truncate">
								{stream.user_name}
							</span>
							<StreamerStatsTooltip streamerId={stream.user_id}>
								<div
									className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] cursor-help"
									onClick={(e) => e.stopPropagation()}
								>
									<History size={10} className="flex-shrink-0" />
									<span className="truncate">{lastOnlineText}</span>
									{stream.stream_count !== undefined && stream.stream_count > 0 && (
										<span className="text-[var(--text-muted)]">
											· {stream.stream_count} live{stream.stream_count !== 1 ? "s" : ""}
										</span>
									)}
								</div>
							</StreamerStatsTooltip>
						</div>
						<BellToggle
							active={stream.is_favorite}
							onToggle={() => onToggleFavorite(stream.user_id)}
							size={14}
						/>
					</div>
				</div>
			</div>
		</Card>
	);
}
