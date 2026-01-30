import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { Header } from "../components/header";
import { Spinner } from "../components/ui/spinner";
import { useNotifications } from "../hooks/use-notifications";
import { trpc, trpcClient } from "../trpc";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<NotificationHandler />
				<main className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] scanlines">
					<Header />
					<div className="flex-1 overflow-y-auto min-h-0">
						<Suspense fallback={<LoadingFallback />}>
							<Outlet />
						</Suspense>
					</div>
				</main>
			</QueryClientProvider>
		</trpc.Provider>
	);
}

function NotificationHandler() {
	useNotifications();
	return null;
}

function LoadingFallback() {
	return (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center gap-4">
				<Spinner size={32} />
				<span className="font-pixel text-[10px] text-[var(--text-muted)]">
					LOADING...
				</span>
			</div>
		</div>
	);
}
