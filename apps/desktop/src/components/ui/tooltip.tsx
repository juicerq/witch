import { type ReactNode, useState } from "react";

interface TooltipProps {
	content: ReactNode;
	children: ReactNode;
	side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
	const [isOpen, setIsOpen] = useState(false);

	const positionClasses = {
		top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
		bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
		left: "right-full top-1/2 -translate-y-1/2 mr-2",
		right: "left-full top-1/2 -translate-y-1/2 ml-2",
	};

	return (
		<div
			className="relative inline-block"
			onMouseEnter={() => setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
		>
			{children}
			{isOpen && (
				<div
					className={`
						absolute z-50 ${positionClasses[side]}
						px-3 py-2 text-xs
						bg-[var(--bg-tertiary)] border border-[var(--border-default)]
						shadow-lg whitespace-nowrap
					`}
				>
					{content}
				</div>
			)}
		</div>
	);
}
