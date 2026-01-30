import { Bell, BellOff, Clock, X } from "lucide-react";
import { trpc } from "../trpc";
import { Button } from "./ui/button";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const POLLING_OPTIONS = [
	{ label: "30 seconds", value: "30000" },
	{ label: "1 minute", value: "60000" },
	{ label: "2 minutes", value: "120000" },
	{ label: "5 minutes", value: "300000" },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const utils = trpc.useUtils();
	const { data: settings, isLoading } = trpc.settings.get.useQuery();

	const updateSettings = trpc.settings.update.useMutation({
		onSuccess: () => {
			utils.settings.get.invalidate();
		},
	});

	if (!isOpen) return null;

	const notificationsEnabled = settings?.notifications_enabled === "true";
	const pollingInterval = settings?.polling_interval || "60000";

	const handleNotificationsToggle = () => {
		updateSettings.mutate({
			notifications_enabled: notificationsEnabled ? "false" : "true",
		});
	};

	const handlePollingChange = (value: string) => {
		updateSettings.mutate({ polling_interval: value });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/80"
				onClick={onClose}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			/>

			{/* Modal */}
			<div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] w-full max-w-md animate-slide-up">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
					<h2 className="font-pixel text-[10px] text-[var(--text-primary)]">
						{">"} SETTINGS
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 space-y-6">
					{isLoading ? (
						<div className="text-[var(--text-muted)] text-sm">Loading...</div>
					) : (
						<>
							{/* Notifications Toggle */}
							<div className="space-y-2">
								<label className="text-[var(--text-secondary)] text-xs font-medium flex items-center gap-2">
									<Bell size={14} />
									NOTIFICATIONS
								</label>
								<button
									type="button"
									onClick={handleNotificationsToggle}
									className={`
										w-full flex items-center justify-between p-3 border transition-all
										${notificationsEnabled
											? "border-[var(--green-40)] bg-[var(--green-20)]/20"
											: "border-[var(--border-default)] bg-[var(--bg-tertiary)]"
										}
									`}
								>
									<span className="text-sm">
										{notificationsEnabled ? "Enabled" : "Disabled"}
									</span>
									{notificationsEnabled ? (
										<Bell size={16} className="text-[var(--green-100)]" />
									) : (
										<BellOff size={16} className="text-[var(--text-muted)]" />
									)}
								</button>
								<p className="text-[var(--text-muted)] text-[10px]">
									Get notified when favorite streamers go live.
								</p>
							</div>

							{/* Polling Interval */}
							<div className="space-y-2">
								<label className="text-[var(--text-secondary)] text-xs font-medium flex items-center gap-2">
									<Clock size={14} />
									REFRESH INTERVAL
								</label>
								<div className="grid grid-cols-2 gap-2">
									{POLLING_OPTIONS.map((option) => (
										<button
											type="button"
											key={option.value}
											onClick={() => handlePollingChange(option.value)}
											className={`
												p-2 text-xs border transition-all
												${pollingInterval === option.value
													? "border-[var(--green-40)] bg-[var(--green-20)]/20 text-[var(--text-primary)]"
													: "border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
												}
											`}
										>
											{option.label}
										</button>
									))}
								</div>
								<p className="text-[var(--text-muted)] text-[10px]">
									How often to check for new streams.
								</p>
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end px-4 py-3 border-t border-[var(--border-default)]">
					<Button variant="primary" size="sm" onClick={onClose}>
						Done
					</Button>
				</div>
			</div>
		</div>
	);
}
