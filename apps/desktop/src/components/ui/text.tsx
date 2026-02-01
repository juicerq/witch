import type { HTMLAttributes, ReactNode } from "react";

type TextVariant =
	| "label"
	| "faint"
	| "muted"
	| "secondary"
	| "default"
	| "primary";

type TextSize = "xs" | "sm" | "md" | "lg" | "xl";

type TextProps = HTMLAttributes<HTMLElement> & {
	as?: "p" | "span" | "div" | "label";
	variant?: TextVariant;
	size?: TextSize;
	children: ReactNode;
};

const variantClasses: Record<TextVariant, string> = {
	label: "text-[var(--text-faint)] uppercase tracking-wider",
	faint: "text-[var(--text-faint)]",
	muted: "text-[var(--text-muted)]",
	secondary: "text-[var(--text-secondary)]",
	default: "text-[var(--text-primary)]",
	primary: "text-[var(--text-primary)]",
};

const sizeClasses: Record<TextSize, string> = {
	xs: "text-xs",
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
	xl: "text-xl",
};

export function Text({
	as = "p",
	variant = "default",
	size = "md",
	className = "",
	children,
	...props
}: TextProps) {
	const Component = as;

	return (
		<Component
			className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
			{...props}
		>
			{children}
		</Component>
	);
}
