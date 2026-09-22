import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { applyAlwaysOnTop, loadAlwaysOnTop } from "./preferences";
import {
  EMPTY_GROK,
  fetchErrorSnapshot,
  formatRenewalRemaining,
  grokCaption,
  planLine,
  shortCaption,
  type GrokBotUsage,
  type UsageSnapshot,
} from "./usage-types";

type ContextMenuState = {
  x: number;
  y: number;
};

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

function hideContextMenu() {
  $("context-menu").classList.add("hidden");
  $("context-backdrop").classList.add("hidden");
}

function showContextMenu(state: ContextMenuState) {
  const backdrop = $("context-backdrop");
  const menu = $("context-menu");

  backdrop.classList.remove("hidden");
  menu.classList.remove("hidden");

  const menuRect = menu.getBoundingClientRect();
  const maxX = Math.max(8, window.innerWidth - menuRect.width - 8);
  const maxY = Math.max(8, window.innerHeight - menuRect.height - 8);

  menu.style.left = `${Math.min(state.x, maxX)}px`;
  menu.style.top = `${Math.min(state.y, maxY)}px`;
}

function setFill(el: HTMLElement, percent: number | null) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  el.style.width = `${p}%`;
  el.classList.remove("warn", "hot");
  if (p >= 90) el.classList.add("hot");
  else if (p >= 70) el.classList.add("warn");
}

function render(snap: UsageSnapshot) {
  const widget = document.querySelector(".widget") as HTMLElement;
  widget.classList.toggle("error", snap.state !== "OK");

  $("plan").textContent = planLine(snap);

  $("cursor-caption").textContent = shortCaption(snap.cursor);
  $("other-caption").textContent = shortCaption(snap.other);
  setFill($("cursor-fill"), snap.cursor.percentUsed);
  setFill($("other-fill"), snap.other.percentUsed);

  const grokTrack = $("track-grok");
  const grok: GrokBotUsage = snap.grok ?? EMPTY_GROK;
  grokTrack.classList.toggle("hidden", !grok.visible);
  if (grok.visible) {
    $("grok-label").textContent = grok.track.label || "Grok Bot";
    $("grok-caption").textContent = grokCaption(grok);
    setFill($("grok-fill"), grok.track.percentUsed);
  }

  const status = $("status");
  const renewal = $("renewal");
  const now = new Date();
  const hhmm = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (snap.state === "OK") {
    status.textContent = `updated ${hhmm}`;
  } else if (snap.state === "NeedLogin") {
    status.textContent = "Cursor 로그인 필요";
  } else {
    status.textContent = `갱신 실패 · ${hhmm}`;
  }
  renewal.textContent = formatRenewalRemaining(snap.billingCycleEndMs);
}

async function refresh() {
  try {
    const snap = await invoke<UsageSnapshot>("get_usage");
    render(snap);
  } catch (e) {
    render(fetchErrorSnapshot(String(e)));
  }
}

async function openSettings() {
  hideContextMenu();
  try {
    await invoke("open_settings_window");
  } catch (e) {
    window.alert(String(e));
  }
}

async function boot() {
  const backdrop = $("context-backdrop");
  const menuSettings = $("menu-settings") as HTMLButtonElement;
  const menuQuit = $("menu-quit") as HTMLButtonElement;

  // tauri.conf.json pins the window to always-on-top, so a user who turned it
  // off gets it restored as soon as the webview boots.
  try {
    await applyAlwaysOnTop(loadAlwaysOnTop());
  } catch {
    /* browser preview */
  }

  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showContextMenu({ x: event.clientX, y: event.clientY });
  });

  backdrop.addEventListener("pointerdown", (event) => {
    if (event.target === backdrop) hideContextMenu();
  });

  $("context-menu").addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  window.addEventListener("blur", () => {
    hideContextMenu();
  });

  window.addEventListener("resize", () => {
    hideContextMenu();
  });

  window.addEventListener("click", () => {
    hideContextMenu();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideContextMenu();
  });

  menuSettings.addEventListener("click", (event) => {
    event.stopPropagation();
    void openSettings();
  });

  menuQuit.addEventListener("click", async (event) => {
    event.stopPropagation();
    hideContextMenu();
    await invoke("quit_app");
  });

  // 설정 창이 방금 받아온 스냅샷을 넘겨주면 API를 다시 치지 않고 그대로 그린다.
  await listen<UsageSnapshot>("usage-updated", (event) => {
    render(event.payload);
  });

  await refresh();
  let interval = 300_000;
  try {
    interval = await invoke<number>("get_poll_interval_ms");
  } catch {
    /* keep default */
  }
  window.setInterval(() => {
    void refresh();
  }, interval);
}

void boot();
