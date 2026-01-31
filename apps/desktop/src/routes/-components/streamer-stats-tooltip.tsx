import { Calendar, Clock, Hash, Hourglass, History } from "lucide-react";
import type { ReactNode } from "react";
import { trpc } from "../../trpc";
import { Tooltip } from "../../components/ui/tooltip";

interface StreamerStatsTooltipProps {
	streamerId: string;
	children: ReactNode;
}

function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hours > 0) {
		return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
	}
	return `~${mins}m`;
}

function formatHour(hour: number): string {
	return `~${hour.toString().padStart(2, "0")}h`;
}

const dayNamesShort: Record<string, string> = {
	Sunday: "Dom",
	Monday: "Seg",
	Tuesday: "Ter",
	Wednesday: "Qua",
	Thursday: "Qui",
	Friday: "Sex",
	Saturday: "Sáb",
};

function formatDate(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function StreamerStatsTooltip({
	streamerId,
	children,
}: StreamerStatsTooltipProps) {
	const { data: stats } = trpc.streams.getStreamerStats.useQuery(
		{ streamerId },
		{ staleTime: 1000 * 60 * 5 } // Cache for 5 minutes
	);

	if (!stats || stats.totalSessions === 0) {
		return (
			<Tooltip content="Sem histórico de lives" side="bottom">
				{children}
			</Tooltip>
		);
	}

	const content = (
		<div className="flex flex-col gap-1.5 text-[var(--text-secondary)]">
			{stats.lastOnline && (
				<div className="flex items-center gap-2">
					<History size={12} className="text-[var(--text-muted)]" />
					<span>Última live: {formatDate(stats.lastOnline)}</span>
				</div>
			)}
			<div className="flex items-center gap-2">
				<Hash size={12} className="text-[var(--text-muted)]" />
				<span>Total de lives: {stats.totalSessions}</span>
			</div>
			{stats.averageStartHour !== null && (
				<div className="flex items-center gap-2">
					<Clock size={12} className="text-[var(--text-muted)]" />
					<span>Horário usual: {formatHour(stats.averageStartHour)}</span>
				</div>
			)}
			{stats.commonDays.length > 0 && (
				<div className="flex items-center gap-2">
					<Calendar size={12} className="text-[var(--text-muted)]" />
					<span>
						Dias comuns:{" "}
						{stats.commonDays.map((d) => dayNamesShort[d] || d).join(", ")}
					</span>
				</div>
			)}
			{stats.averageDuration !== null && (
				<div className="flex items-center gap-2">
					<Hourglass size={12} className="text-[var(--text-muted)]" />
					<span>Duração média: {formatDuration(stats.averageDuration)}</span>
				</div>
			)}
		</div>
	);

	return (
		<Tooltip content={content} side="bottom">
			{children}
		</Tooltip>
	);
}
