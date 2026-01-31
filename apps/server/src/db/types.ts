import type { Generated } from "kysely";

export interface TokenTable {
	id: string;
	user_id: string;
	access_token: string;
	refresh_token: string;
	expires_at: string;
	created_at: Generated<string>;
}

export interface FavoriteTable {
	id: string;
	streamer_id: string;
	streamer_login: string;
	streamer_name: string;
	notify: Generated<number>;
	created_at: Generated<string>;
}

export interface SettingTable {
	key: string;
	value: string;
}

export interface StreamSessionTable {
	id: string;
	streamer_id: string;
	streamer_login: string;
	started_at: string;
	ended_at: string | null;
	game_name: string | null;
	created_at: Generated<string>;
}

/** Typed settings object */
export interface Settings {
	polling_interval: string;
	notifications_enabled: string;
}

export interface Database {
	tokens: TokenTable;
	favorites: FavoriteTable;
	settings: SettingTable;
	stream_sessions: StreamSessionTable;
}
