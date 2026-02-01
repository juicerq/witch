import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "default" | "primary" | "danger" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "pixel";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
	default: "btn",
	primary: "btn btn-primary",
	danger: "btn btn-danger",
	ghost: "btn border-transparent hover:border-[var(--border-default)]",
};

const sizeClasses: Record<ButtonSize, string> = {
	default: "",
	sm: "text-[11px] py-1 px-2",
	lg: "text-[14px] py-3 px-6",
	pixel: "btn-pixel",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ variant = "default", size = "default", className = "", ...props },
		ref,
	) => {
		return (
			<button
				ref={ref}
				className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
				{...props}
			/>
		);
	},
);

Button.displayName = "Button";
