import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type EnvFile = {
	TWITCH_CLIENT_ID?: string;
	TWITCH_CLIENT_SECRET?: string;
	TWITCH_USE_PKCE?: string;
	WITCH_DB_PATH?: string;
};

export type SetupStatus = {
	has_client_id: boolean;
	has_client_secret: boolean;
	use_pkce: boolean;
	client_id: string | null;
	env_path: string;
};

export type ValidationResult = {
	ok: boolean;
	message: string;
};

type SaveEnvInput = {
	clientId: string;
	clientSecret: string | null;
	usePkce: boolean;
};

const ENV_FILE_NAME = "env.json";

function resolveEnvPath(): string {
	if (process.env.WITCH_ENV_PATH) {
		return process.env.WITCH_ENV_PATH;
	}

	if (process.env.WITCH_APP_DATA_DIR) {
		return path.join(process.env.WITCH_APP_DATA_DIR, ENV_FILE_NAME);
	}

	return path.join(process.cwd(), ENV_FILE_NAME);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

async function loadEnvFile(envPath: string): Promise<EnvFile | null> {
	const contents = await readFile(envPath, "utf-8").catch(() => null);
	if (!contents) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(contents);
	} catch {
		return null;
	}

	if (!isRecord(parsed)) {
		return null;
	}

	return {
		TWITCH_CLIENT_ID: readString(parsed.TWITCH_CLIENT_ID),
		TWITCH_CLIENT_SECRET: readString(parsed.TWITCH_CLIENT_SECRET),
		TWITCH_USE_PKCE: readString(parsed.TWITCH_USE_PKCE),
		WITCH_DB_PATH: readString(parsed.WITCH_DB_PATH),
	};
}

function envUsesPkce(envFile: EnvFile): boolean {
	return envFile.TWITCH_USE_PKCE?.toLowerCase() === "true";
}

export async function getSetupStatus(): Promise<SetupStatus> {
	const envPath = resolveEnvPath();
	const envFile = await loadEnvFile(envPath);

	const has_client_id =
		!!envFile?.TWITCH_CLIENT_ID?.trim() &&
		envFile.TWITCH_CLIENT_ID.trim().length > 0;
	const has_client_secret =
		!!envFile?.TWITCH_CLIENT_SECRET?.trim() &&
		envFile.TWITCH_CLIENT_SECRET.trim().length > 0;
	const use_pkce = envFile ? envUsesPkce(envFile) : false;
	const client_id = envFile?.TWITCH_CLIENT_ID ?? null;

	return {
		has_client_id,
		has_client_secret,
		use_pkce,
		client_id,
		env_path: envPath,
	};
}

export async function validateTwitchCredentials(
	input: SaveEnvInput,
): Promise<ValidationResult> {
	const trimmedId = input.clientId.trim();
	if (!trimmedId) {
		return {
			ok: false,
			message: "Client ID is required.",
		};
	}

	if (input.usePkce) {
		return {
			ok: true,
			message: "PKCE mode selected. We'll validate during login.",
		};
	}

	const secret = input.clientSecret?.trim() ?? "";
	if (!secret) {
		return {
			ok: false,
			message: "Client Secret is required unless PKCE is enabled.",
		};
	}

	try {
		const params = new URLSearchParams({
			client_id: trimmedId,
			client_secret: secret,
			grant_type: "client_credentials",
		});

		const response = await fetch("https://id.twitch.tv/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (response.ok) {
			return {
				ok: true,
				message: "Credentials validated successfully.",
			};
		}

		const status = response.status;
		const body = await response
			.text()
			.catch(() => "Unable to read error response");
		return {
			ok: false,
			message: `Validation failed (${status}): ${body}`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return {
			ok: false,
			message: `Failed to reach Twitch: ${message}`,
		};
	}
}

export async function saveEnvConfig(input: SaveEnvInput): Promise<string> {
	const envPath = resolveEnvPath();
	const envFile = (await loadEnvFile(envPath)) ?? {};

	envFile.TWITCH_CLIENT_ID = input.clientId.trim();
	envFile.TWITCH_CLIENT_SECRET = input.clientSecret?.trim() || undefined;
	envFile.TWITCH_USE_PKCE = input.usePkce ? "true" : undefined;

	await mkdir(path.dirname(envPath), { recursive: true });
	await writeFile(envPath, JSON.stringify(envFile, null, 2));

	return envPath;
}
