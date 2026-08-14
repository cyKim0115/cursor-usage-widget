mod auth;
mod install;
mod usage;

use auth::{default_db_path, read_access_token};
use install::{
    autostart_disable, autostart_enable, autostart_is_enabled, cleanup_stale_debug_autostart,
    ensure_installed_release, guard_debug_requires_vite,
};
use tauri_plugin_window_state::StateFlags;
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

#[tauri::command]
fn is_dev_build() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
fn enable_autostart() -> Result<(), String> {
    autostart_enable()
}

#[tauri::command]
fn disable_autostart() -> Result<(), String> {
    autostart_disable()
}

#[tauri::command]
fn is_autostart_enabled() -> Result<bool, String> {
    autostart_is_enabled()
}

#[tauri::command]
fn install_release_copy() -> Result<String, String> {
    ensure_installed_release().map(|p| p.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    guard_debug_requires_vite();

    tauri::Builder::default()
        // 위치만 복원합니다. 창 크기는 tauri.conf.json 이 정하므로, 크기까지
        // 저장하면 지난 실행의 크기가 갱신된 레이아웃 높이를 덮어씁니다.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_usage,
            get_poll_interval_ms,
            quit_app,
            is_dev_build,
            enable_autostart,
            disable_autostart,
            is_autostart_enabled,
            install_release_copy
        ])
        .setup(|_app| {
            cleanup_stale_debug_autostart();
            // Release builds keep a stable copy under LOCALAPPDATA for shortcuts/autostart.
            let _ = ensure_installed_release();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
