import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export function Header() {
	const appWindow = getCurrentWindow();

	const handleMinimize = () => appWindow.minimize();
	const handleMaximize = () => appWindow.toggleMaximize();
	const handleClose = () => appWindow.close();

	return (
		<header className="window-header">
			<div className="window-title">
				<span className="text-[var(--green-60)]">&gt;</span>
				<span>WITCH</span>
				<span className="text-[var(--text-muted)]">v0.1.0</span>
			</div>

			<div className="window-controls">
				<button
					type="button"
					className="window-btn"
					onClick={handleMinimize}
					aria-label="Minimize"
				>
					<Minus size={14} />
				</button>
				<button
					type="button"
					className="window-btn"
					onClick={handleMaximize}
					aria-label="Maximize"
				>
					<Square size={12} />
				</button>
				<button
					type="button"
					className="window-btn window-btn-close"
					onClick={handleClose}
					aria-label="Close"
				>
					<X size={14} />
				</button>
			</div>
		</header>
	);
}
