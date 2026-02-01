import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { Text } from "../../components/ui/text";
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

	const {
		data: loginData,
		isLoading: isLoginLoading,
		error: loginError,
	} = trpc.auth.getLoginUrl.useQuery(undefined, {
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

	const hasLoginUrl = Boolean(loginData?.url);
	const showLoginUnavailable = !isLoginLoading && !hasLoginUrl;

	const handleLogin = async () => {
		if (!loginData?.url) return;

		setIsLoading(true);
		setError(null);

		try {
			await openUrl(loginData.url);
		} catch {
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
			<Text variant="secondary" size="sm" className="mb-8 text-center max-w-md">
				Monitor your favorite Twitch streamers.
				<br />
				<Text as="span" variant="muted">
					Get notified when they go live.
				</Text>
			</Text>

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
						disabled={!hasLoginUrl}
					>
						LOGIN WITH TWITCH
					</Button>
				)}

				{error && (
					<Text
						as="div"
						size="xs"
						className="text-[var(--red)] animate-fade-in"
					>
						{error}
					</Text>
				)}
				{loginError && (
					<Text
						as="div"
						size="xs"
						className="text-[var(--red)] animate-fade-in"
					>
						Failed to load login data. Check your Twitch credentials.
					</Text>
				)}
				{showLoginUnavailable && !loginError && (
					<Text
						as="div"
						size="xs"
						className="text-[var(--yellow)] animate-fade-in"
					>
						Login unavailable. Add TWITCH_CLIENT_ID/SECRET to env.json.
					</Text>
				)}
			</div>

			{/* Instructions */}
			{isLoading && (
				<div className="mt-8 p-4 border border-[var(--border-default)] bg-[var(--bg-secondary)] max-w-sm animate-slide-up">
					<Text variant="muted" size="xs" className="leading-relaxed">
						<span className="text-[var(--green-60)]">&gt;</span> A browser
						window has opened.
						<br />
						<span className="text-[var(--green-60)]">&gt;</span> Log in with
						your Twitch account.
						<br />
						<span className="text-[var(--green-60)]">&gt;</span> This window
						will update automatically.
					</Text>
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
