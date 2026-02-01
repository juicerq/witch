import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Spinner } from "../components/ui/spinner";
import { trpc } from "../trpc";
import { LoginScreen } from "./-components/login-screen";
import { SetupWizard } from "./-components/setup-wizard";
import { StreamsView } from "./-components/streams-view";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const utils = trpc.useUtils();
	const { data: authStatus, isLoading } = trpc.auth.status.useQuery();
	const { data: setupStatus, isLoading: setupLoading } =
		trpc.setup.status.useQuery();

	const needsSetup = useMemo(() => {
		if (!setupStatus) return true;
		return (
			!setupStatus.has_client_id ||
			(!setupStatus.use_pkce && !setupStatus.has_client_secret)
		);
	}, [setupStatus]);

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

	if (needsSetup && setupStatus) {
		return (
			<SetupWizard
				status={setupStatus}
				onComplete={() => utils.setup.status.invalidate()}
			/>
		);
	}

	if (!authStatus?.authenticated || !("user" in authStatus)) {
		return <LoginScreen />;
	}

	return <StreamsView user={authStatus.user} />;
}
