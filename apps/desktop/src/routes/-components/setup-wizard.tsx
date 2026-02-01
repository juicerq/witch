import { openUrl } from "@tauri-apps/plugin-opener";
import type { RouterOutputs } from "@witch/shared/trpc-types";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";
import { Text } from "../../components/ui/text";
import { Title } from "../../components/ui/title";
import { trpc } from "../../trpc";

export type SetupStatus = RouterOutputs["setup"]["status"];

type SetupWizardProps = {
	status: SetupStatus;
	onComplete: () => void;
};

const DEV_CONSOLE_URL = "https://dev.twitch.tv/console/apps";

export function SetupWizard({ status, onComplete }: SetupWizardProps) {
	const validateCredentials = trpc.setup.validate.useMutation();
	const saveConfig = trpc.setup.save.useMutation();
	const [mode, setMode] = useState<"secret" | "pkce">(
		status.use_pkce ? "pkce" : "secret",
	);
	const [clientId, setClientId] = useState(status.client_id ?? "");
	const [clientSecret, setClientSecret] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const helperText = useMemo(() => {
		if (mode === "pkce") {
			return "PKCE mode uses only the Client ID. No secret is stored on disk.";
		}
		return "Client Secret is stored locally in env.json and used by the embedded server.";
	}, [mode]);

	const handleValidateAndSave = () => {
		setIsSaving(true);
		setError(null);
		setSuccess(null);

		const payload = {
			clientId,
			clientSecret: mode === "secret" ? clientSecret : null,
			usePkce: mode === "pkce",
		};

		validateCredentials.mutate(payload, {
			onSuccess: (validation) => {
				if (!validation.ok) {
					setError(validation.message);
					setIsSaving(false);
					return;
				}

				saveConfig.mutate(payload, {
					onSuccess: (envPath) => {
						setSuccess(
							`Saved to ${envPath}. Restart Witch to apply the credentials.`,
						);
						onComplete();
					},
					onError: (err) => {
						setError(err.message || "Something went wrong.");
					},
					onSettled: () => {
						setIsSaving(false);
					},
				});
			},
			onError: (err) => {
				setError(err.message || "Something went wrong.");
				setIsSaving(false);
			},
		});
	};

	return (
		<div className="flex flex-col items-center justify-center h-full px-8 animate-fade-in">
			<div className="max-w-lg w-full border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 rounded-lg shadow-lg">
				<div className="flex flex-col gap-2">
					<Text
						variant="primary"
						className="font-pixel text-[10px] text-[var(--green-40)]"
					>
						SETUP REQUIRED
					</Text>
					<Title as="h1" size="lg" className="text-[var(--text-primary)]">
						Connect your Twitch App
					</Title>
					<Text size="sm" variant="muted">
						Witch needs a Twitch Client ID (and optionally a Client Secret) to
						authenticate.
					</Text>
				</div>

				<div className="mt-6 flex flex-col gap-4">
					<div className="flex gap-2">
						<Button
							size="sm"
							variant={mode === "secret" ? "primary" : "ghost"}
							onClick={() => setMode("secret")}
						>
							Client Secret
						</Button>
						<Button
							size="sm"
							variant={mode === "pkce" ? "primary" : "ghost"}
							onClick={() => setMode("pkce")}
						>
							PKCE only
						</Button>
					</div>

					<div className="flex flex-col gap-2">
						<Text
							as="label"
							variant="muted"
							size="xs"
							htmlFor="setup-client-id"
						>
							Client ID
						</Text>
						<Input
							id="setup-client-id"
							value={clientId}
							onChange={(event) => setClientId(event.target.value)}
							placeholder="e.g. abcd1234..."
							spellCheck={false}
						/>
					</div>

					{mode === "secret" && (
						<div className="flex flex-col gap-2">
							<Text
								as="label"
								variant="muted"
								size="xs"
								htmlFor="setup-client-secret"
							>
								Client Secret
							</Text>
							<Input
								id="setup-client-secret"
								type="password"
								value={clientSecret}
								onChange={(event) => setClientSecret(event.target.value)}
								placeholder="••••••••"
								spellCheck={false}
							/>
						</div>
					)}

					<Text size="xs" variant="muted">
						{helperText}
					</Text>

					<div className="flex items-center justify-between">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => openUrl(DEV_CONSOLE_URL)}
						>
							Open Twitch Dev Console
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={handleValidateAndSave}
							disabled={isSaving}
						>
							{isSaving ? (
								<span className="flex items-center gap-2">
									<Spinner size={14} />
									Validating…
								</span>
							) : (
								"Save & Continue"
							)}
						</Button>
					</div>

					{error && (
						<Text
							as="div"
							size="xs"
							className="text-[var(--red)] animate-fade-in"
						>
							{error}
						</Text>
					)}
					{success && (
						<Text
							as="div"
							size="xs"
							className="text-[var(--green-60)] animate-fade-in"
						>
							{success}
						</Text>
					)}
				</div>
			</div>
		</div>
	);
}
