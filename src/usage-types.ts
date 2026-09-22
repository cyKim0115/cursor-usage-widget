export type TrackUsage = {
  label: string;
  percentUsed: number | null;
  remainingPercent: number | null;
  displayMessage: string | null;
  sourceField: string;
};

export type GrokBotUsage = {
  visible: boolean;
  track: TrackUsage;
  nextResetAt: string | null;
};

export type UsageSnapshot = {
  state: string;
  planName: string | null;
  includedUsd: number | null;
  billingCycleEndMs: number | null;
  cursor: TrackUsage;
  other: TrackUsage;
  grok: GrokBotUsage;
  error: string | null;
};

export const EMPTY_TRACK = (label: string): TrackUsage => ({
  label,
  percentUsed: null,
  remainingPercent: null,
  displayMessage: null,
  sourceField: "",
});

export const EMPTY_GROK: GrokBotUsage = {
  visible: false,
  track: EMPTY_TRACK("Grok Bot"),
  nextResetAt: null,
};

export function fetchErrorSnapshot(error: string): UsageSnapshot {
  return {
    state: "FetchError",
    planName: null,
    includedUsd: null,
    billingCycleEndMs: null,
    cursor: EMPTY_TRACK("Cursor"),
    other: EMPTY_TRACK("Other"),
    grok: EMPTY_GROK,
    error,
  };
}

export function shortCaption(track: TrackUsage): string {
  if (track.percentUsed == null) return "—";
  const used = Math.round(track.percentUsed);
  return `${used}% used`;
}

export function formatRemaining(endMs: number): string {
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

export function formatRenewalRemaining(endMs: number | null): string {
  if (endMs == null) return "";
  return formatRemaining(endMs);
}

export function grokCaption(grok: GrokBotUsage): string {
  const used = shortCaption(grok.track);
  if (!grok.nextResetAt) return used;
  const endMs = Date.parse(grok.nextResetAt);
  if (Number.isNaN(endMs)) return used;
  return `${used} · reset ${formatRemaining(endMs)}`;
}

export function stateLabel(state: string): string {
  switch (state) {
    case "OK":
      return "정상";
    case "NeedLogin":
      return "로그인 필요";
    default:
      return "갱신 실패";
  }
}

export function planLine(snap: UsageSnapshot): string {
  if (snap.planName && snap.includedUsd != null) {
    return `${snap.planName} · $${snap.includedUsd.toFixed(0)} incl.`;
  }
  return snap.planName ?? "";
}
