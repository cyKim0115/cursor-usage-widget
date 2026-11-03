import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { applyAlwaysOnTop, loadAlwaysOnTop, loadGlass, loadGlassBlur } from "./preferences";
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

/** 카드 투명도는 배경 흐림이 실제로 켜졌을 때만 낮춥니다. 블러 없이 낮추면 뒤 글자가 선명하게 비칩니다. */
function setGlassClass(applied: boolean) {
  document.documentElement.classList.toggle("glass", applied);
  if (!applied) {
    const canvas = $("glass-backdrop") as HTMLCanvasElement;
    canvas.width = 0;
    canvas.height = 0;
  }
}

function setGlassBlur(px: number) {
  document.documentElement.style.setProperty("--glass-blur", `${px}px`);
}

/** glass.rs가 보내는 캡처 정보. 크기와 여백은 물리 픽셀입니다. */
interface GlassFrame {
  seq: number;
  width: number;
  height: number;
  margin: number;
}

let glassBusy = false;
let glassPending: GlassFrame | null = null;

/**
 * 위젯 뒤를 캡처한 화면을 카드 아래 캔버스에 그립니다. 블러는 CSS(--glass-blur)가 겁니다.
 * 받아 오는 중에 새 프레임이 오면 마지막 것만 남겨 두었다가 이어서 그립니다.
 */
async function drawGlassFrame(frame: GlassFrame) {
  glassBusy = true;
  try {
    const response = await fetch(`http://glassbg.localhost/frame?${frame.seq}`);
    const bytes = new Uint8ClampedArray(await response.arrayBuffer());
    if (bytes.length !== frame.width * frame.height * 4) return;
    const canvas = $("glass-backdrop") as HTMLCanvasElement;
    if (canvas.width !== frame.width || canvas.height !== frame.height) {
      canvas.width = frame.width;
      canvas.height = frame.height;
    }
    // 캔버스 왼쪽 위가 창 왼쪽 위에서 여백만큼 밖에 오도록 둡니다. 카드 테두리 두께도 뺍니다.
    const scale = window.devicePixelRatio || 1;
    const border = (document.querySelector(".widget") as HTMLElement).clientLeft;
    canvas.style.width = `${frame.width / scale}px`;
    canvas.style.height = `${frame.height / scale}px`;
    canvas.style.left = `${-frame.margin / scale - border}px`;
    canvas.style.top = `${-frame.margin / scale - border}px`;
    canvas.getContext("2d")?.putImageData(new ImageData(bytes, frame.width, frame.height), 0, 0);
  } catch {
    /* 다음 프레임에서 다시 그립니다 */
  } finally {
    glassBusy = false;
    const next = glassPending;
    glassPending = null;
    if (next && document.documentElement.classList.contains("glass")) void drawGlassFrame(next);
  }
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

  // 설정 창에서 배경 흐림을 바꾸면 Rust가 캡처를 켜고 끈 뒤 결과를 보내 온다.
  await listen<boolean>("glass-applied", (event) => {
    setGlassClass(event.payload);
  });
  await listen<number>("glass-blur", (event) => {
    setGlassBlur(event.payload);
  });
  await listen<GlassFrame>("glass-frame", (event) => {
    if (!document.documentElement.classList.contains("glass")) return;
    if (glassBusy) {
      glassPending = event.payload;
      return;
    }
    void drawGlassFrame(event.payload);
  });

  await refresh();

  try {
    // 반경을 먼저 넘겨야 첫 캡처부터 그 반경에 맞는 여백으로 찍는다.
    await invoke("set_glass_blur", { px: loadGlassBlur() });
    setGlassClass(await invoke<boolean>("set_glass", { enabled: loadGlass() }));
  } catch {
    /* browser preview */
  }
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
