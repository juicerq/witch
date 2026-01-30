import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../trpc";
import { LoginScreen } from "./-components/login-screen";
import { StreamsView } from "./-components/streams-view";
import { Spinner } from "../components/ui/spinner";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const { data: authStatus, isLoading } = trpc.auth.status.useQuery();

	if (isLoading) {
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

	if (!authStatus?.authenticated || !("user" in authStatus)) {
		return <LoginScreen />;
	}

	return <StreamsView user={authStatus.user} />;
}
