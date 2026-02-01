import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";

export type SetupStatus = {
	has_client_id: boolean;
	has_client_secret: boolean;
	use_pkce: boolean;
	client_id: string | null;
	env_path: string;
};

type ValidationResult = {
	ok: boolean;
	message: string;
};

type SetupWizardProps = {
	status: SetupStatus;
	onComplete: () => void;
};

const DEV_CONSOLE_URL = "https://dev.twitch.tv/console/apps";

export function SetupWizard({ status, onComplete }: SetupWizardProps) {
	const [mode, setMode] = useState<"secret" | "pkce">(
		status.use_pkce ? "pkce" : "secret"
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

	const handleValidateAndSave = async () => {
		setIsSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const validation = await invoke<ValidationResult>(
				"validate_twitch_credentials",
				{
					clientId,
					clientSecret: mode === "secret" ? clientSecret : null,
					usePkce: mode === "pkce",
				}
			);

			if (!validation.ok) {
				setError(validation.message);
				setIsSaving(false);
				return;
			}

			const envPath = await invoke<string>("save_env_config", {
				clientId,
				clientSecret: mode === "secret" ? clientSecret : null,
				usePkce: mode === "pkce",
			});

			setSuccess(
				`Saved to ${envPath}. Restart Witch to apply the credentials.`
			);
			onComplete();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Something went wrong."
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-full px-8 animate-fade-in">
			<div className="max-w-lg w-full border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 rounded-lg shadow-lg">
				<div className="flex flex-col gap-2">
					<span className="font-pixel text-[10px] text-[var(--green-40)]">
						SETUP REQUIRED
					</span>
					<h1 className="text-lg font-semibold text-[var(--text-primary)]">
						Connect your Twitch App
					</h1>
					<p className="text-sm text-[var(--text-muted)]">
						Witch needs a Twitch Client ID (and optionally a Client Secret) to
						authenticate.
					</p>
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
						<label className="text-xs text-[var(--text-muted)]">
							Client ID
						</label>
						<Input
							value={clientId}
							onChange={(event) => setClientId(event.target.value)}
							placeholder="e.g. abcd1234..."
							spellCheck={false}
						/>
					</div>

					{mode === "secret" && (
						<div className="flex flex-col gap-2">
							<label className="text-xs text-[var(--text-muted)]">
								Client Secret
							</label>
							<Input
								type="password"
								value={clientSecret}
								onChange={(event) => setClientSecret(event.target.value)}
								placeholder="••••••••"
								spellCheck={false}
							/>
						</div>
					)}

					<p className="text-xs text-[var(--text-muted)]">{helperText}</p>

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
						<p className="text-[var(--red)] text-xs animate-fade-in">{error}</p>
					)}
					{success && (
						<p className="text-[var(--green-60)] text-xs animate-fade-in">
							{success}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
