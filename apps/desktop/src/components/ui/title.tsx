import type { HTMLAttributes, ReactNode } from "react";

type TitleSize = "xl" | "lg" | "default" | "sm";
type TitleVariant = "default" | "muted";

type TitleProps = HTMLAttributes<HTMLElement> & {
	as?: "h1" | "h2" | "h3" | "div" | "span";
	size?: TitleSize;
	variant?: TitleVariant;
	children: ReactNode;
};

const sizeClasses: Record<TitleSize, string> = {
	xl: "text-xl",
	lg: "text-lg",
	default: "text-base",
	sm: "text-sm",
};

const variantClasses: Record<TitleVariant, string> = {
	default: "text-[var(--text-primary)]",
	muted: "text-[var(--text-muted)]",
};

export function Title({
	as = "h2",
	size = "default",
	variant = "default",
	className = "",
	children,
	...props
}: TitleProps) {
	const Component = as;

	return (
		<Component
			className={`font-semibold ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
			{...props}
		>
			{children}
		</Component>
	);
}
