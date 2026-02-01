import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../trpc";
import { LoginScreen } from "./-components/login-screen";
import { StreamsView } from "./-components/streams-view";
import { Spinner } from "../components/ui/spinner";
import { SetupWizard, type SetupStatus } from "./-components/setup-wizard";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const { data: authStatus, isLoading } = trpc.auth.status.useQuery();
	const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
	const [setupLoading, setSetupLoading] = useState(true);

	useEffect(() => {
		let active = true;
		invoke<SetupStatus>("get_setup_status")
			.then((status) => {
				if (active) {
					setSetupStatus(status);
				}
			})
			.catch(() => {
				if (active) {
					setSetupStatus(null);
				}
			})
			.finally(() => {
				if (active) {
					setSetupLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, []);

	if (isLoading || setupLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="flex flex-col items-center gap-4">
					<Spinner size={32} />
					<span className="font-pixel text-[10px] text-[var(--text-muted)] cursor-blink">
						CONNECTING
					</span>
				</div>
			</div>
		);
	}

	const needsSetup =
		!setupStatus ||
		!setupStatus.has_client_id ||
		(!setupStatus.use_pkce && !setupStatus.has_client_secret);

	if (needsSetup && setupStatus) {
		return (
			<SetupWizard
				status={setupStatus}
				onComplete={() => {
					invoke<SetupStatus>("get_setup_status")
						.then((status) => setSetupStatus(status))
						.catch(() => setSetupStatus(setupStatus));
				}}
			/>
		);
	}

	if (!authStatus?.authenticated || !("user" in authStatus)) {
		return <LoginScreen />;
	}

	return <StreamsView user={authStatus.user} />;
}
