interface StatusDotProps {
	online: boolean;
	className?: string;
}

export function StatusDot({ online, className = "" }: StatusDotProps) {
	return (
		<span
			className={`status-dot ${online ? "status-dot-online" : "status-dot-offline"} ${className}`}
		/>
	);
}
