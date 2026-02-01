import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	active?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
	({ active = false, className = "", children, ...props }, ref) => {
		return (
			<button
				ref={ref}
				type="button"
				className={`chip ${active ? "chip-active" : ""} ${className}`}
				{...props}
			>
				{children}
			</button>
		);
	},
);

Chip.displayName = "Chip";
