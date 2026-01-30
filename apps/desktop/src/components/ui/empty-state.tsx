interface EmptyStateProps {
	title: string;
	description?: string;
	ascii?: string;
	className?: string;
}

const defaultAscii = `
    .-.
   (o o)
   | O |
   |   |
   '~~~'
`;

const noStreamsAscii = `
  ___________
 |  _______  |
 | |       | |
 | |  zzZ  | |
 | |_______| |
 |___________|
    |     |
`;

const errorAscii = `
   _____
  /     \\
 | () () |
  \\  ^  /
   |||||
   |||||
`;

export const ASCII_ART = {
	default: defaultAscii,
	noStreams: noStreamsAscii,
	error: errorAscii,
};

export function EmptyState({
	title,
	description,
	ascii = defaultAscii,
	className = "",
}: EmptyStateProps) {
	return (
		<div className={`empty-state ${className}`}>
			<pre className="empty-state-ascii">{ascii}</pre>
			<div className="font-pixel text-[10px] text-[var(--text-secondary)] mb-2">
				{title}
			</div>
			{description && (
				<div className="text-[12px] text-[var(--text-muted)]">{description}</div>
			)}
		</div>
	);
}
