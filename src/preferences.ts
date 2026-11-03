import { invoke } from "@tauri-apps/api/core";

export type Preferences = {
  /** Off means the widget behaves like a normal window and can go behind others. */
  alwaysOnTop: boolean;
};

export const ALWAYS_ON_TOP_KEY = "cursor-usage-always-on-top";
export const GLASS_KEY = "cursor-usage-glass";
export const GLASS_BLUR_KEY = "cursor-usage-glass-blur";

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

/** 지원하지 않는 Windows에서는 Rust가 알아서 끄므로, 비어 있으면 켬으로 봅니다. */
export function loadGlass(): boolean {
  return localStorage.getItem(GLASS_KEY) !== "false";
}

export function saveGlass(enabled: boolean) {
  localStorage.setItem(GLASS_KEY, enabled ? "true" : "false");
}

/** 저장하고 위젯 창에 반영합니다. 실제로 켜졌는지 돌려줍니다. */
export async function applyGlass(enabled: boolean): Promise<boolean> {
  saveGlass(enabled);
  return invoke<boolean>("set_glass", { enabled });
}

/** 흐림 반경(CSS px). glass.rs의 MAX_BLUR_PX, 설정 슬라이더 max와 같아야 합니다. */
export const MAX_GLASS_BLUR = 32;
const DEFAULT_GLASS_BLUR = 12;

export function loadGlassBlur(): number {
  const raw = localStorage.getItem(GLASS_BLUR_KEY);
  const value = raw === null ? NaN : Number(raw);
  return Number.isNaN(value) ? DEFAULT_GLASS_BLUR : Math.min(MAX_GLASS_BLUR, Math.max(0, value));
}

/** 저장하고 위젯 창에 반영합니다. Rust가 캡처 여백을 맞추고 위젯에 반경을 알립니다. */
export async function applyGlassBlur(px: number) {
  localStorage.setItem(GLASS_BLUR_KEY, String(px));
  await invoke("set_glass_blur", { px });
}
