pub mod tray;
pub mod window;

use serde::Deserialize;
#[cfg(not(debug_assertions))]
use std::net::TcpStream;
use std::path::PathBuf;
#[cfg(not(debug_assertions))]
use std::time::{Duration, Instant};
use tauri::Manager;
// (removed global shortcut; handled by WM bindings)
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Deserialize, Clone)]
struct EnvFile {
    #[serde(rename = "TWITCH_CLIENT_ID")]
    twitch_client_id: Option<String>,
    #[serde(rename = "TWITCH_CLIENT_SECRET")]
    twitch_client_secret: Option<String>,
    #[serde(rename = "TWITCH_USE_PKCE")]
    twitch_use_pkce: Option<String>,
    #[serde(rename = "WITCH_DB_PATH")]
    witch_db_path: Option<String>,
}

fn resolve_db_path(app_data_dir: &PathBuf, env: Option<&EnvFile>) -> PathBuf {
    if let Some(path) = env.and_then(|env| env.witch_db_path.as_ref()) {
        let candidate = PathBuf::from(path);
        if candidate.is_relative() {
            return app_data_dir.join(candidate);
        }
        return candidate;
    }

    app_data_dir.join("witch.db")
}

fn load_env_file(app: &tauri::AppHandle) -> (Option<EnvFile>, PathBuf, PathBuf) {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let _ = std::fs::create_dir_all(&app_data_dir);

    let env_path = app_data_dir.join("env.json");
    let env_data = std::fs::read_to_string(&env_path)
        .ok()
        .and_then(|contents| serde_json::from_str::<EnvFile>(&contents).ok());

    (env_data, env_path, app_data_dir)
}

fn env_uses_pkce(env: &EnvFile) -> bool {
    env.twitch_use_pkce
        .as_deref()
        .map(|value| value.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // (global shortcut removed; handled by WM bindings)

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, show the existing window
            window::show(app);
        }))
        // (global shortcut plugin removed; handled by WM bindings)
        .setup(move |app| {
            // Set window icon
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(icon) =
                    tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                {
                    let _ = window.set_icon(icon);
                }
                // Hide window on startup (starts hidden, toggle with Super+R)
                let _ = window.hide();
            }

            // Setup system tray
            tray::setup_tray(app)?;

            // (global shortcut handled by WM bindings)

            #[cfg(not(debug_assertions))]
            {
                let (env_data, _env_path, app_data_dir) = load_env_file(app);
                let db_path = resolve_db_path(&app_data_dir, env_data.as_ref());

                let mut sidecar = app.shell().sidecar("witch-server").unwrap();
                sidecar = sidecar.env("WITCH_DB_PATH", db_path.to_string_lossy().to_string());
                sidecar = sidecar.env(
                    "WITCH_APP_DATA_DIR",
                    app_data_dir.to_string_lossy().to_string(),
                );
                sidecar = sidecar.env(
                    "WITCH_ENV_PATH",
                    app_data_dir.join("env.json").to_string_lossy().to_string(),
                );

                if let Some(env_data) = env_data.as_ref() {
                    if let Some(client_id) = env_data.twitch_client_id.as_ref() {
                        sidecar = sidecar.env("TWITCH_CLIENT_ID", client_id);
                    }
                    if let Some(client_secret) = env_data.twitch_client_secret.as_ref() {
                        sidecar = sidecar.env("TWITCH_CLIENT_SECRET", client_secret);
                    }
                    if env_uses_pkce(env_data) {
                        sidecar = sidecar.env("TWITCH_USE_PKCE", "true");
                    }
                }

                let (mut _rx, mut _child) = sidecar.spawn().expect("Failed to spawn sidecar");

                let deadline = Instant::now() + Duration::from_secs(10);
                while Instant::now() < deadline {
                    if TcpStream::connect("127.0.0.1:3001").is_ok() {
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(100));
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            tray::handle_run_event(app, event);
        });
}
