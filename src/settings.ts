import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { applyAlwaysOnTop, loadPreferences, saveAlwaysOnTop, type Preferences } from "./preferences";
import {
  fetchErrorSnapshot,
  formatRenewalRemaining,
  grokCaption,
  planLine,
  shortCaption,
  stateLabel,
  type UsageSnapshot,
} from "./usage-types";

let prefs: Preferences = loadPreferences();
let autostartEnabled = false;
let isDevBuild = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

/** 오류 문구는 Cursor API 응답에서 올 수 있으므로 textContent 로만 넣는다. */
function showBootError(message: string) {
  const wrap = document.createElement("div");
  wrap.className = "settings-window";
  wrap.style.padding = "24px";

  const title = document.createElement("h1");
  title.textContent = "설정 로드 실패";

  const detail = document.createElement("p");
  detail.className = "settings-hint settings-hint--error";
  detail.textContent = message;

  const close = document.createElement("button");
  close.className = "btn secondary wide";
  close.type = "button";
  close.textContent = "닫기";
  close.addEventListener("click", () => {
    void closeWindow();
  });

  wrap.append(title, detail, close);
  document.body.replaceChildren(wrap);
}

function setActionStatus(message: string, tone: "info" | "ok" | "error" = "info") {
  const el = $("action-status");
  el.textContent = message;
  el.classList.remove("hidden", "settings-status--ok", "settings-status--error");
  if (tone === "ok") el.classList.add("settings-status--ok");
  else if (tone === "error") el.classList.add("settings-status--error");
}

function clearActionStatus() {
  $("action-status").classList.add("hidden");
  $("action-status").textContent = "";
}

function badgeClass(state: string): string {
  switch (state) {
    case "OK":
      return "settings-badge--ok";
    case "NeedLogin":
      return "settings-badge--muted";
    default:
      return "settings-badge--error";
  }
}

function usageRow(label: string, caption: string): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "settings-usage-row";

  const name = document.createElement("span");
  name.className = "settings-usage-label";
  name.textContent = label;

  const value = document.createElement("span");
  value.className = "settings-usage-value";
  value.textContent = caption;

  li.append(name, value);
  return li;
}

function renderUsage(snap: UsageSnapshot) {
  const badge = $("usage-badge");
  badge.textContent = stateLabel(snap.state);
  badge.className = `settings-badge ${badgeClass(snap.state)}`;

  const detail = $("plan-detail");
  if (snap.state === "NeedLogin") {
    detail.textContent = snap.error || "Cursor 로그인이 필요합니다.";
  } else if (snap.state !== "OK") {
    detail.textContent = snap.error || "사용량을 갱신하지 못했습니다.";
  } else {
    const renewal = formatRenewalRemaining(snap.billingCycleEndMs);
    const plan = planLine(snap);
    detail.textContent = [plan, renewal].filter(Boolean).join(" · ") || "연결됨";
  }

  const list = $("usage-summary");
  list.replaceChildren();
  list.append(usageRow("Cursor", shortCaption(snap.cursor)));
  list.append(usageRow("Other", shortCaption(snap.other)));
  if (snap.grok?.visible) {
    list.append(usageRow(snap.grok.track.label || "Grok Bot", grokCaption(snap.grok)));
  }
}

/**
 * 설정 창이 이미 가져온 스냅샷을 위젯에 넘긴다. 위젯이 따로 다시 부르면 같은
 * 새로고침 한 번에 Cursor API를 두 번 치게 된다.
 */
async function pushUsageToMain(snap: UsageSnapshot) {
  await emit("usage-updated", snap);
}

async function refreshUsage(): Promise<UsageSnapshot> {
  try {
    const snap = await invoke<UsageSnapshot>("get_usage");
    renderUsage(snap);
    await pushUsageToMain(snap);
    return snap;
  } catch (e) {
    const snap = fetchErrorSnapshot(String(e));
    renderUsage(snap);
    return snap;
  }
}

function renderAlwaysOnTop() {
  ($("always-on-top-toggle") as HTMLInputElement).checked = prefs.alwaysOnTop;
}

async function setAlwaysOnTop(enabled: boolean) {
  prefs = { ...prefs, alwaysOnTop: enabled };
  saveAlwaysOnTop(enabled);
  await applyAlwaysOnTop(enabled);
  await emit("settings-changed", prefs);
}

function syncAutostartUi() {
  const toggle = $("autostart-toggle") as HTMLInputElement;
  const hint = $("autostart-hint");

  if (isDevBuild) {
    toggle.checked = false;
    toggle.disabled = true;
    hint.textContent =
      "개발 모드에서는 시작프로그램을 바꿀 수 없습니다. 「시작.bat」으로 설치·실행한 뒤 다시 시도하세요.";
    hint.classList.remove("hidden");
    return;
  }

  toggle.disabled = false;
  toggle.checked = autostartEnabled;
  hint.classList.add("hidden");
}

async function refreshAutostart() {
  try {
    isDevBuild = await invoke<boolean>("is_dev_build");
    autostartEnabled = await invoke<boolean>("is_autostart_enabled");
  } catch {
    autostartEnabled = false;
  }
  syncAutostartUi();
}

async function refreshView() {
  clearActionStatus();
  prefs = loadPreferences();
  renderAlwaysOnTop();
  await refreshAutostart();
  await refreshUsage();
}

async function closeWindow() {
  try {
    await invoke("close_settings_window");
  } catch {
    /* browser preview */
  }
}

async function onRefresh() {
  clearActionStatus();
  const btn = $("btn-refresh") as HTMLButtonElement;
  btn.disabled = true;
  try {
    const snap = await refreshUsage();
    if (snap.state === "OK") {
      setActionStatus("사용량을 갱신했습니다.", "ok");
    } else {
      setActionStatus(snap.error || "사용량을 갱신하지 못했습니다.", "error");
    }
  } finally {
    btn.disabled = false;
  }
}

function bindUi() {
  $("btn-close").addEventListener("click", () => {
    void closeWindow();
  });
  $("btn-refresh").addEventListener("click", () => {
    void onRefresh();
  });

  const alwaysOnTopToggle = $("always-on-top-toggle") as HTMLInputElement;
  alwaysOnTopToggle.addEventListener("change", async () => {
    const enabled = alwaysOnTopToggle.checked;
    try {
      await setAlwaysOnTop(enabled);
      setActionStatus(
        enabled ? "위젯을 항상 위에 표시합니다." : "위젯을 일반 창처럼 표시합니다.",
        "ok",
      );
    } catch (e) {
      alwaysOnTopToggle.checked = prefs.alwaysOnTop;
      setActionStatus(String(e), "error");
    }
  });

  const autostartToggle = $("autostart-toggle") as HTMLInputElement;
  autostartToggle.addEventListener("change", async () => {
    if (isDevBuild) {
      syncAutostartUi();
      return;
    }
    autostartToggle.disabled = true;
    try {
      if (autostartToggle.checked) {
        await invoke("enable_autostart");
      } else {
        await invoke("disable_autostart");
      }
      autostartEnabled = await invoke<boolean>("is_autostart_enabled");
      syncAutostartUi();
      setActionStatus(
        autostartEnabled ? "시작프로그램을 켰습니다." : "시작프로그램을 껐습니다.",
        "ok",
      );
    } catch (e) {
      autostartToggle.checked = autostartEnabled;
      setActionStatus(String(e), "error");
    } finally {
      autostartToggle.disabled = isDevBuild;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") void closeWindow();
  });
}

async function boot() {
  try {
    renderAlwaysOnTop();
    bindUi();
    await refreshAutostart();
    await refreshUsage();

    // 창은 숨겨졌다 다시 보일 뿐 리로드되지 않으므로, 열릴 때마다 최신 상태로 맞춘다.
    await listen("settings-open", () => {
      void refreshView();
    });
  } catch (e) {
    showBootError(String(e));
  }
}

void boot();
