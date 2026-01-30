use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, WebviewWindow};

static WINDOW_VISIBLE: AtomicBool = AtomicBool::new(false);

fn get_main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn focus_window(window: &WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn toggle(app: &AppHandle) {
    let is_visible = WINDOW_VISIBLE.load(Ordering::SeqCst);

    if let Some(window) = get_main_window(app) {
        if is_visible {
            WINDOW_VISIBLE.store(false, Ordering::SeqCst);
            let _ = window.hide();
        } else {
            WINDOW_VISIBLE.store(true, Ordering::SeqCst);
            focus_window(&window);
        }
    }
}

pub fn show(app: &AppHandle) {
    WINDOW_VISIBLE.store(true, Ordering::SeqCst);
    if let Some(window) = get_main_window(app) {
        focus_window(&window);
    }
}

pub fn hide(app: &AppHandle) {
    WINDOW_VISIBLE.store(false, Ordering::SeqCst);
    if let Some(window) = get_main_window(app) {
        let _ = window.hide();
    }
}
