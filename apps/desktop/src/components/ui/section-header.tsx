import type { ReactNode } from "react";

interface SectionHeaderProps {
	children: ReactNode;
	count?: number;
	className?: string;
}

export function SectionHeader({
	children,
	count,
	className = "",
}: SectionHeaderProps) {
	return (
		<div className={`section-header ${className}`}>
			<span>{children}</span>
			{count !== undefined && (
				<span className="text-[var(--text-muted)]">({count})</span>
			)}
		</div>
	);
}
