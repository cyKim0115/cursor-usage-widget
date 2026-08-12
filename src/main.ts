import { invoke } from "@tauri-apps/api/core";

type TrackUsage = {
  label: string;
  percentUsed: number | null;
  remainingPercent: number | null;
  displayMessage: string | null;
  sourceField: string;
};

type UsageSnapshot = {
  state: string;
  planName: string | null;
  includedUsd: number | null;
  billingCycleEndMs: number | null;
  cursor: TrackUsage;
  other: TrackUsage;
  error: string | null;
};

type ContextMenuState = {
  x: number;
  y: number;
  autostartEnabled: boolean;
  isDevBuild: boolean;
};

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

async function getAutostartEnabled(): Promise<boolean> {
  try {
    return await invoke<boolean>("is_autostart_enabled");
  } catch {
    return false;
  }
}

async function getIsDevBuild(): Promise<boolean> {
  try {
    return await invoke<boolean>("is_dev_build");
  } catch {
    return false;
  }
}

function hideContextMenu() {
  $("context-menu").classList.add("hidden");
  $("context-backdrop").classList.add("hidden");
}

function showContextMenu(state: ContextMenuState) {
  const backdrop = $("context-backdrop");
  const menu = $("context-menu");
  const menuAutostart = $("menu-autostart");

  backdrop.classList.remove("hidden");
  menu.classList.remove("hidden");

  if (state.isDevBuild) {
    menuAutostart.textContent = "시작프로그램 (시작.bat 사용)";
  } else {
    menuAutostart.textContent = `${state.autostartEnabled ? "✓ " : ""}시작프로그램`;
  }

  const menuRect = menu.getBoundingClientRect();
  const maxX = Math.max(8, window.innerWidth - menuRect.width - 8);
  const maxY = Math.max(8, window.innerHeight - menuRect.height - 8);

  menu.style.left = `${Math.min(state.x, maxX)}px`;
  menu.style.top = `${Math.min(state.y, maxY)}px`;
}

function shortCaption(track: TrackUsage): string {
  if (track.percentUsed == null) return "—";
  const used = Math.round(track.percentUsed);
  if (track.displayMessage) {
    return `${used}% used`;
  }
  return `${used}% used`;
}

function formatRenewalRemaining(endMs: number | null): string {
  if (endMs == null) return "";
  const diff = endMs - Date.now();
  if (diff <= 0) return "0 days left";

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  const days = Math.floor(diff / dayMs);
  if (days >= 1) return days === 1 ? "1 day left" : `${days} days left`;

  const hours = Math.floor(diff / hourMs);
  if (hours >= 1) return hours === 1 ? "1 hour left" : `${hours} hours left`;

  const minutes = Math.max(1, Math.floor(diff / minuteMs));
  return minutes === 1 ? "1 minute left" : `${minutes} minutes left`;
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

  const plan = $("plan");
  if (snap.planName && snap.includedUsd != null) {
    plan.textContent = `${snap.planName} · $${snap.includedUsd.toFixed(0)} incl.`;
  } else if (snap.planName) {
    plan.textContent = snap.planName;
  } else {
    plan.textContent = "";
  }

  $("cursor-caption").textContent = shortCaption(snap.cursor);
  $("other-caption").textContent = shortCaption(snap.other);
  setFill($("cursor-fill"), snap.cursor.percentUsed);
  setFill($("other-fill"), snap.other.percentUsed);

  const status = $("status");
  const renewal = $("renewal");
  const now = new Date();
  const hhmm = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (snap.state === "OK") {
    status.textContent = `updated ${hhmm}`;
  } else if (snap.state === "NeedLogin") {
    status.textContent = "Cursor 로그인 필요";
  } else {
    status.textContent = snap.error ? `갱신 실패 · ${hhmm}` : `갱신 실패 · ${hhmm}`;
  }
  renewal.textContent = formatRenewalRemaining(snap.billingCycleEndMs);
}

async function refresh() {
  try {
    const snap = await invoke<UsageSnapshot>("get_usage");
    render(snap);
  } catch (e) {
    render({
      state: "FetchError",
      planName: null,
      includedUsd: null,
      billingCycleEndMs: null,
      cursor: {
        label: "Cursor",
        percentUsed: null,
        remainingPercent: null,
        displayMessage: null,
        sourceField: "",
      },
      other: {
        label: "Other",
        percentUsed: null,
        remainingPercent: null,
        displayMessage: null,
        sourceField: "",
      },
      error: String(e),
    });
  }
}

async function boot() {
  const backdrop = $("context-backdrop");
  const menuAutostart = $("menu-autostart") as HTMLButtonElement;
  const menuRefresh = $("menu-refresh") as HTMLButtonElement;
  const menuQuit = $("menu-quit") as HTMLButtonElement;

  window.addEventListener("contextmenu", async (event) => {
    event.preventDefault();
    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      autostartEnabled: await getAutostartEnabled(),
      isDevBuild: await getIsDevBuild(),
    });
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

  menuAutostart.addEventListener("click", async (event) => {
    event.stopPropagation();
    menuAutostart.disabled = true;
    try {
      const isDev = await getIsDevBuild();
      if (isDev) {
        window.alert(
          "개발 모드에서는 시작프로그램을 바꿀 수 없습니다.\n\n「시작.bat」으로 설치·실행한 뒤, 위젯에서 다시 우클릭 → 시작프로그램을 켜 주세요.",
        );
        return;
      }
      const enabled = await getAutostartEnabled();
      if (enabled) {
        await invoke("disable_autostart");
      } else {
        await invoke("enable_autostart");
      }
    } catch (e) {
      window.alert(String(e));
    } finally {
      menuAutostart.disabled = false;
      showContextMenu({
        x: parseFloat($("context-menu").style.left || "0"),
        y: parseFloat($("context-menu").style.top || "0"),
        autostartEnabled: await getAutostartEnabled(),
        isDevBuild: await getIsDevBuild(),
      });
    }
  });

  menuRefresh.addEventListener("click", async (event) => {
    event.stopPropagation();
    hideContextMenu();
    await refresh();
  });

  menuQuit.addEventListener("click", async (event) => {
    event.stopPropagation();
    hideContextMenu();
    await invoke("quit_app");
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
