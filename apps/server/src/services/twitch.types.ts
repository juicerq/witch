export interface TwitchUser {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
}

export interface TwitchFollowedChannel {
	broadcaster_id: string;
	broadcaster_login: string;
	broadcaster_name: string;
}

export interface TwitchStream {
	user_id: string;
	user_login: string;
	user_name: string;
	game_name: string;
	viewer_count: number;
	started_at: string;
	thumbnail_url: string;
}

export interface TwitchTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

export interface TwitchAuthState {
	code_verifier: string;
	created_at: number;
}
