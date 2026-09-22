import { invoke } from "@tauri-apps/api/core";

export type Preferences = {
  /** Off means the widget behaves like a normal window and can go behind others. */
  alwaysOnTop: boolean;
};

export const ALWAYS_ON_TOP_KEY = "cursor-usage-always-on-top";

/** The widget shipped always-on-top, so an unset key must stay on. */
export function loadAlwaysOnTop(): boolean {
  return localStorage.getItem(ALWAYS_ON_TOP_KEY) !== "false";
}

export function saveAlwaysOnTop(enabled: boolean) {
  localStorage.setItem(ALWAYS_ON_TOP_KEY, enabled ? "true" : "false");
}

export function loadPreferences(): Preferences {
  return { alwaysOnTop: loadAlwaysOnTop() };
}

/**
 * The flag is stored in the webview but only the Rust side can push it onto the
 * live window, so every caller goes through the command instead of each window
 * flipping its own flag.
 */
export async function applyAlwaysOnTop(enabled: boolean) {
  await invoke("set_always_on_top", { enabled });
}
