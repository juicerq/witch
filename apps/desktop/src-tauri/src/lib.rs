pub mod tray;
pub mod window;

#[cfg(not(debug_assertions))]
use std::net::TcpStream;
#[cfg(not(debug_assertions))]
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Define the global shortcut: Alt+Q
    let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyQ);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, show the existing window
            window::show(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, key, event| {
                    if key == &shortcut && event.state == ShortcutState::Pressed {
                        window::toggle(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            // Set window icon
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(icon) =
                    tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                {
                    let _ = window.set_icon(icon);
                }
                // Hide window on startup (starts hidden, toggle with Alt+Q)
                let _ = window.hide();
            }

            // Setup system tray
            tray::setup_tray(app)?;

            // Register global shortcut
            app.global_shortcut().register(shortcut)?;

            #[cfg(not(debug_assertions))]
            {
                let sidecar = app.shell().sidecar("witch-server").unwrap();
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
