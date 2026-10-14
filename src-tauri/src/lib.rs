mod auth;
mod install;
mod tray;
mod usage;

use auth::{default_db_path, read_access_token};
use install::{
    autostart_disable, autostart_enable, autostart_is_enabled, cleanup_stale_debug_autostart,
    ensure_installed_release, guard_debug_requires_vite,
};
use std::sync::mpsc;
use std::time::Duration;
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use usage::{fetch_error, fetch_usage, need_login, UsageSnapshot};

const POLL_INTERVAL_MS: u64 = 300_000;
/// 드래그가 멎은 뒤 위치를 디스크에 쓰기까지 기다리는 시간.
const POSITION_FLUSH_DEBOUNCE_MS: u64 = 400;
/// 작업 표시줄 숨김을 다시 거는 시점. 부팅 직후처럼 셸이 느릴 때까지 덮는다.
const SKIP_TASKBAR_RETRY_MS: [u64; 3] = [300, 1_000, 3_000];
const MAIN_LABEL: &str = "main";
const SETTINGS_LABEL: &str = "settings";

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

/// 설정 창은 tauri.conf.json 이 숨긴 채로 미리 만들어 두므로, 여는 쪽은 보여
/// 주기만 하면 된다. 창은 리로드되지 않으니 열릴 때마다 최신화 신호를 보낸다.
#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(SETTINGS_LABEL)
        .ok_or_else(|| "settings window not found".to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    window.emit("settings-open", ()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(SETTINGS_LABEL) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// The preference lives in the webview, so the menu and startup both push it
/// onto the main window through here.
#[tauri::command]
fn set_always_on_top(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not found".to_string())?;
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
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

/// window-state 플러그인은 `Moved` 를 메모리 캐시에만 담고 종료할 때만 파일로
/// 씁니다. 재빌드 스크립트나 작업 관리자가 프로세스를 강제 종료하면 그 캐시가
/// 통째로 날아가므로, 드래그가 멎으면 종료를 기다리지 않고 바로 저장합니다.
fn persist_position_on_move(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_LABEL) else {
        return;
    };

    let (tx, rx) = mpsc::channel::<()>();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Moved(_)) {
            let _ = tx.send(());
        }
    });

    let handle = app.clone();
    std::thread::spawn(move || {
        let debounce = Duration::from_millis(POSITION_FLUSH_DEBOUNCE_MS);
        while rx.recv().is_ok() {
            // 드래그 중에는 Moved 가 연달아 오므로, 조용해질 때 한 번만 쓴다.
            while rx.recv_timeout(debounce).is_ok() {}
            let _ = handle.save_window_state(StateFlags::POSITION);
        }
    });
}

/// tao 는 창을 만들 때 `ITaskbarList::DeleteTab` 을 한 번만 부릅니다. 셸이
/// 단추를 비동기로 붙이므로 그보다 먼저 처리되면 지울 단추가 없어 그대로 남습니다.
/// 창이 뜬 뒤 몇 번 더 걸어 순서가 꼬여도 단추가 빠지게 합니다.
fn reapply_skip_taskbar(app: &tauri::AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || {
        let mut elapsed = 0;
        for at in SKIP_TASKBAR_RETRY_MS {
            std::thread::sleep(Duration::from_millis(at - elapsed));
            elapsed = at;
            let Some(window) = handle.get_webview_window(MAIN_LABEL) else {
                return;
            };
            let _ = window.set_skip_taskbar(true);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    guard_debug_requires_vite();

    tauri::Builder::default()
        // 다른 플러그인보다 먼저 등록해야 두 번째 실행이 초기화 전에 끝납니다.
        // 트레이 아이콘 말고 재실행으로도 가려진 위젯을 꺼낼 수 있게,
        // 새로 띄우지 않고 기존 창을 앞으로 가져옵니다.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window(MAIN_LABEL) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            reapply_skip_taskbar(app);
        }))
        // 위치만 복원합니다. 창 크기는 tauri.conf.json 이 정하므로, 크기까지
        // 저장하면 지난 실행의 크기가 갱신된 레이아웃 높이를 덮어씁니다.
        // 설정 창은 tauri.conf.json 의 center 동작을 그대로 두려고 제외합니다.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .with_denylist(&[SETTINGS_LABEL])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_usage,
            get_poll_interval_ms,
            quit_app,
            open_settings_window,
            close_settings_window,
            is_dev_build,
            enable_autostart,
            disable_autostart,
            is_autostart_enabled,
            install_release_copy,
            set_always_on_top
        ])
        .setup(|app| {
            tray::install(app)?;
            persist_position_on_move(app.handle());
            reapply_skip_taskbar(app.handle());
            cleanup_stale_debug_autostart();
            // Release builds keep a stable copy under LOCALAPPDATA for shortcuts/autostart.
            let _ = ensure_installed_release();
            Ok(())
        })
        .on_window_event(|window, event| {
            // 위젯 창이 닫혀도 숨긴 설정 창이 남아 프로세스가 살아 있게 된다.
            // 단일 인스턴스라 재실행으로도 창을 되살릴 수 없으니 앱째 끝낸다.
            // `quit_app` 의 종료는 CloseRequested 를 거치지 않아 두 번 끝내지 않는다.
            if window.label() == MAIN_LABEL {
                if let WindowEvent::CloseRequested { .. } = event {
                    window.app_handle().exit(0);
                }
                return;
            }
            // 설정 창의 X 는 닫기가 아니라 숨기기다. 실제로 닫아 버리면 다음에 열
            // 때 창을 찾지 못한다.
            if window.label() != SETTINGS_LABEL {
                return;
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
