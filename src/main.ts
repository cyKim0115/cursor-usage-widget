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
  cursor: TrackUsage;
  other: TrackUsage;
  error: string | null;
};

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

function shortCaption(track: TrackUsage): string {
  if (track.percentUsed == null) return "—";
  const used = Math.round(track.percentUsed);
  if (track.displayMessage) {
    // Prefer compact "% used" over long English sentences in the narrow widget.
    return `${used}% used`;
  }
  return `${used}% used`;
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
  const now = new Date();
  const hhmm = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (snap.state === "OK") {
    status.textContent = `updated ${hhmm}`;
  } else if (snap.state === "NeedLogin") {
    status.textContent = "Cursor 로그인 필요";
  } else {
    status.textContent = snap.error ? `갱신 실패 · ${hhmm}` : `갱신 실패 · ${hhmm}`;
  }
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
