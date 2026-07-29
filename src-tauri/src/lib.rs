mod auth;
mod usage;

use auth::{default_db_path, read_access_token};
#[cfg(desktop)]
use tauri_plugin_autostart::MacosLauncher;
use usage::{fetch_error, fetch_usage, need_login, UsageSnapshot};

const POLL_INTERVAL_MS: u64 = 300_000;

#[tauri::command]
fn get_usage() -> UsageSnapshot {
    let db = default_db_path();
    match read_access_token(&db) {
        Ok(token) => match fetch_usage(&token) {
            Ok(snap) => snap,
            Err(e) => fetch_error(e.to_string()),
        },
        Err(e) => need_login(e.to_string()),
    }
}

#[tauri::command]
fn get_poll_interval_ms() -> u64 {
    POLL_INTERVAL_MS
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None::<Vec<&'static str>>,
        ))
        .invoke_handler(tauri::generate_handler![
            get_usage,
            get_poll_interval_ms,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
