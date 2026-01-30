import { Bell, BellOff } from "lucide-react";

interface BellToggleProps {
	active: boolean;
	onToggle: () => void;
	size?: number;
	className?: string;
}

export function BellToggle({
	active,
	onToggle,
	size = 16,
	className = "",
}: BellToggleProps) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onToggle();
			}}
			className={`bell-icon ${active ? "bell-icon-active" : ""} ${className}`}
			aria-label={active ? "Disable notifications" : "Enable notifications"}
			title={active ? "Notifications enabled" : "Click to enable notifications"}
		>
			{active ? <Bell size={size} /> : <BellOff size={size} />}
		</button>
	);
}
