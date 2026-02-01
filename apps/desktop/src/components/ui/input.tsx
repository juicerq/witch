import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className = "", ...props }, ref) => {
		return <input ref={ref} className={`input ${className}`} {...props} />;
	},
);

Input.displayName = "Input";
