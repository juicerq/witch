import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant =
	| "default"
	| "sky"
	| "violet"
	| "indigo"
	| "rose"
	| "emerald"
	| "amber";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	children: ReactNode;
	variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
	default: "badge badge-default",
	sky: "badge badge-sky",
	violet: "badge badge-violet",
	indigo: "badge badge-indigo",
	rose: "badge badge-rose",
	emerald: "badge badge-emerald",
	amber: "badge badge-amber",
};

export function Badge({
	children,
	variant = "default",
	className = "",
	...props
}: BadgeProps) {
	return (
		<span className={`${variantClasses[variant]} ${className}`} {...props}>
			{children}
		</span>
	);
}
