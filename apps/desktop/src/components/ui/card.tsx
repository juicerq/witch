import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	glow?: boolean;
	corners?: boolean;
}

export function Card({
	children,
	glow = false,
	corners = false,
	className = "",
	...props
}: CardProps) {
	const classes = [
		"card",
		glow && "card-glow",
		corners && "card-corners",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={classes} {...props}>
			{children}
		</div>
	);
}
