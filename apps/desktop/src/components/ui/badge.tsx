import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "live" | "favorite";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	children: ReactNode;
	variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
	default: "badge",
	live: "badge badge-live",
	favorite: "badge badge-favorite",
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
