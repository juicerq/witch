pub mod tray;
pub mod window;

#[cfg(not(debug_assertions))]
use std::net::TcpStream;
#[cfg(not(debug_assertions))]
use std::time::{Duration, Instant};
use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
// (removed global shortcut; handled by WM bindings)
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Deserialize, Serialize, Clone)]
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

#[derive(Debug, Serialize)]
struct SetupStatus {
    has_client_id: bool,
    has_client_secret: bool,
    use_pkce: bool,
    client_id: Option<String>,
    env_path: String,
}

#[derive(Debug, Serialize)]
struct ValidationResult {
    ok: bool,
    message: String,
}

#[tauri::command]
fn get_setup_status(app: tauri::AppHandle) -> Result<SetupStatus, String> {
    let (env_data, env_path, _) = load_env_file(&app);
    let (has_client_id, has_client_secret, use_pkce, client_id) = if let Some(env) = env_data {
        (
            env.twitch_client_id.as_ref().is_some_and(|value| !value.trim().is_empty()),
            env.twitch_client_secret.as_ref().is_some_and(|value| !value.trim().is_empty()),
            env_uses_pkce(&env),
            env.twitch_client_id,
        )
    } else {
        (false, false, false, None)
    };

    Ok(SetupStatus {
        has_client_id,
        has_client_secret,
        use_pkce,
        client_id,
        env_path: env_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn validate_twitch_credentials(
    client_id: String,
    client_secret: Option<String>,
    use_pkce: bool,
) -> Result<ValidationResult, String> {
    let trimmed_id = client_id.trim();
    if trimmed_id.is_empty() {
        return Ok(ValidationResult {
            ok: false,
            message: "Client ID is required.".to_string(),
        });
    }

    if use_pkce {
        return Ok(ValidationResult {
            ok: true,
            message: "PKCE mode selected. We'll validate during login.".to_string(),
        });
    }

    let secret = client_secret.unwrap_or_default();
    if secret.trim().is_empty() {
        return Ok(ValidationResult {
            ok: false,
            message: "Client Secret is required unless PKCE is enabled.".to_string(),
        });
    }

    let client = reqwest::blocking::Client::new();
    let response = client
        .post("https://id.twitch.tv/oauth2/token")
        .form(&[
            ("client_id", trimmed_id),
            ("client_secret", secret.trim()),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .map_err(|err| format!("Failed to reach Twitch: {err}"))?;

    if response.status().is_success() {
        Ok(ValidationResult {
            ok: true,
            message: "Credentials validated successfully.".to_string(),
        })
    } else {
        let status = response.status();
        let body = response
            .text()
            .unwrap_or_else(|_| "Unable to read error response".to_string());
        Ok(ValidationResult {
            ok: false,
            message: format!("Validation failed ({status}): {body}"),
        })
    }
}

#[tauri::command]
fn save_env_config(
    app: tauri::AppHandle,
    client_id: String,
    client_secret: Option<String>,
    use_pkce: bool,
) -> Result<String, String> {
    let (env_data, env_path, _) = load_env_file(&app);

    let mut env_file = env_data.unwrap_or(EnvFile {
        twitch_client_id: None,
        twitch_client_secret: None,
        twitch_use_pkce: None,
        witch_db_path: None,
    });

    env_file.twitch_client_id = Some(client_id.trim().to_string());
    env_file.twitch_client_secret = client_secret
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    env_file.twitch_use_pkce = if use_pkce {
        Some("true".to_string())
    } else {
        None
    };

    let json = serde_json::to_string_pretty(&env_file)
        .map_err(|err| format!("Failed to serialize env.json: {err}"))?;
    std::fs::write(&env_path, json)
        .map_err(|err| format!("Failed to write env.json: {err}"))?;

    Ok(env_path.to_string_lossy().to_string())
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
        .invoke_handler(tauri::generate_handler![
            get_setup_status,
            validate_twitch_credentials,
            save_env_config
        ])
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
