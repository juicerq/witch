import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { trpc } from "../../trpc";

const WITCH_ASCII = `
    ██╗    ██╗██╗████████╗ ██████╗██╗  ██╗
    ██║    ██║██║╚══██╔══╝██╔════╝██║  ██║
    ██║ █╗ ██║██║   ██║   ██║     ███████║
    ██║███╗██║██║   ██║   ██║     ██╔══██║
    ╚███╔███╔╝██║   ██║   ╚██████╗██║  ██║
     ╚══╝╚══╝ ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
`;

const BROOM_ASCII = `
         |\\
        /| \\
       /_|__\\
         |
         |
    ~~~~~|~~~~~
`;

export function LoginScreen() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const utils = trpc.useUtils();

	const { data: loginData } = trpc.auth.getLoginUrl.useQuery(undefined, {
		enabled: !isLoading,
	});

	// Poll for auth status while waiting
	const { data: authStatus } = trpc.auth.status.useQuery(undefined, {
		enabled: isLoading,
		refetchInterval: 2000, // Poll every 2 seconds
	});

	// When auth succeeds, invalidate to trigger parent re-render
	useEffect(() => {
		if (isLoading && authStatus?.authenticated) {
			utils.auth.status.invalidate();
		}
	}, [isLoading, authStatus, utils]);

	const handleLogin = async () => {
		if (!loginData?.url) return;

		setIsLoading(true);
		setError(null);

		try {
			await openUrl(loginData.url);
		} catch (err) {
			setError("Failed to open browser");
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setIsLoading(false);
		setError(null);
	};

	return (
		<div className="flex flex-col items-center justify-center h-full px-8 animate-fade-in">
			{/* ASCII Art Logo */}
			<pre className="text-[var(--green-40)] text-[8px] leading-tight mb-2 select-none">
				{WITCH_ASCII}
			</pre>

			<pre className="text-[var(--green-20)] text-[6px] leading-tight mb-8 select-none">
				{BROOM_ASCII}
			</pre>

			{/* Tagline */}
			<p className="text-[var(--text-secondary)] text-sm mb-8 text-center max-w-md">
				Monitor your favorite Twitch streamers.
				<br />
				<span className="text-[var(--text-muted)]">
					Get notified when they go live.
				</span>
			</p>

			{/* Login Button */}
			<div className="flex flex-col items-center gap-4">
				{isLoading ? (
					<>
						<div className="flex items-center gap-3">
							<Spinner size={20} />
							<span className="font-pixel text-[10px] text-[var(--text-muted)]">
								WAITING FOR TWITCH...
							</span>
						</div>
						<Button variant="ghost" size="sm" onClick={handleCancel}>
							Cancel
						</Button>
					</>
				) : (
					<Button
						variant="primary"
						size="pixel"
						onClick={handleLogin}
						className="glow"
					>
						LOGIN WITH TWITCH
					</Button>
				)}

				{error && (
					<p className="text-[var(--red)] text-xs animate-fade-in">{error}</p>
				)}
			</div>

			{/* Instructions */}
			{isLoading && (
				<div className="mt-8 p-4 border border-[var(--border-default)] bg-[var(--bg-secondary)] max-w-sm animate-slide-up">
					<p className="text-[var(--text-muted)] text-xs leading-relaxed">
						<span className="text-[var(--green-60)]">&gt;</span> A browser window
						has opened.
						<br />
						<span className="text-[var(--green-60)]">&gt;</span> Log in with your
						Twitch account.
						<br />
						<span className="text-[var(--green-60)]">&gt;</span> This window will
						update automatically.
					</p>
				</div>
			)}

			{/* Footer */}
			<div className="absolute bottom-4 text-[var(--text-faint)] text-[10px]">
				<span className="text-[var(--green-20)]">{">"}</span> Twitch Streams
				Monitor
			</div>
		</div>
	);
}
