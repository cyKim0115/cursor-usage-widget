#!/usr/bin/env python3
"""
Phase 0 spike: Cursor local token → GetCurrentPeriodUsage → Cursor/Other tracks.

Never prints access/refresh tokens. Safe to run locally for pipeline validation.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

API_BASE = "https://api2.cursor.sh"
USAGE_PATH = "/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
PLAN_PATH = "/aiserver.v1.DashboardService/GetPlanInfo"


def default_db_path() -> Path:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise RuntimeError("APPDATA is not set (Windows required for this spike).")
    return Path(appdata) / "Cursor" / "User" / "globalStorage" / "state.vscdb"


def read_access_token(db_path: Path) -> str:
    if not db_path.is_file():
        raise FileNotFoundError(f"Cursor DB not found: {db_path}")
    con = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    try:
        row = con.execute(
            "SELECT value FROM ItemTable WHERE key = ?",
            ("cursorAuth/accessToken",),
        ).fetchone()
    finally:
        con.close()
    if not row or not row[0]:
        raise RuntimeError("NeedLogin: cursorAuth/accessToken missing")
    return str(row[0])


def post_json(path: str, token: str) -> dict[str, Any]:
    url = API_BASE + path
    req = urllib.request.Request(
        url,
        data=b"{}",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Connect-Protocol-Version": "1",
            "Authorization": f"Bearer {token}",
            "User-Agent": "cursor-usage-widget-spike/0.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"FetchError HTTP {e.code} {path}: {body[:300]}") from e
    return json.loads(raw)


@dataclass
class Track:
    label: str
    source_field: str
    percent_used: float | None
    display_message: str | None

    @property
    def remaining_percent(self) -> float | None:
        if self.percent_used is None:
            return None
        return max(0.0, 100.0 - self.percent_used)


def parse_tracks(usage: dict[str, Any]) -> tuple[Track, Track]:
    plan = usage.get("planUsage") or {}
    cursor = Track(
        label="Cursor",
        source_field="planUsage.autoPercentUsed",
        percent_used=_as_float(plan.get("autoPercentUsed")),
        display_message=usage.get("autoModelSelectedDisplayMessage"),
    )
    other = Track(
        label="Other",
        source_field="planUsage.apiPercentUsed",
        percent_used=_as_float(plan.get("apiPercentUsed")),
        display_message=usage.get("namedModelSelectedDisplayMessage"),
    )
    return cursor, other


def _as_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def cents_to_usd(cents: Any) -> float | None:
    f = _as_float(cents)
    return None if f is None else f / 100.0


def mask_token(token: str) -> str:
    if len(token) < 16:
        return "***"
    return f"{token[:8]}…{token[-4:]} (len={len(token)})"


def main() -> int:
    db_path = Path(os.environ.get("CURSOR_STATE_VSCDB", default_db_path()))
    try:
        token = read_access_token(db_path)
    except Exception as e:
        print(json.dumps({"ok": False, "state": "NeedLogin", "error": str(e)}, ensure_ascii=False, indent=2))
        return 2

    try:
        usage = post_json(USAGE_PATH, token)
        plan = post_json(PLAN_PATH, token)
    except Exception as e:
        print(
            json.dumps(
                {
                    "ok": False,
                    "state": "FetchError",
                    "error": str(e),
                    "token": mask_token(token),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 3

    cursor, other = parse_tracks(usage)
    plan_usage = usage.get("planUsage") or {}
    plan_info = (plan.get("planInfo") or {}) if isinstance(plan, dict) else {}

    out = {
        "ok": True,
        "state": "OK",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "auth": {"token": mask_token(token), "db": str(db_path)},
        "plan": {
            "name": plan_info.get("planName"),
            "included_usd": cents_to_usd(plan_info.get("includedAmountCents")),
            "price": plan_info.get("price"),
        },
        "billing_cycle": {
            "start_ms": usage.get("billingCycleStart"),
            "end_ms": usage.get("billingCycleEnd"),
        },
        "plan_usage_raw_safe": {
            "included_spend_usd": cents_to_usd(plan_usage.get("includedSpend")),
            "limit_usd": cents_to_usd(plan_usage.get("limit")),
            "total_spend_usd": cents_to_usd(plan_usage.get("totalSpend")),
            "bonus_spend_usd": cents_to_usd(plan_usage.get("bonusSpend")),
            "total_percent_used": _as_float(plan_usage.get("totalPercentUsed")),
        },
        "tracks": {
            "cursor": asdict(cursor)
            | {"remaining_percent": cursor.remaining_percent},
            "other": asdict(other) | {"remaining_percent": other.remaining_percent},
        },
        "field_map": {
            "Cursor": "autoPercentUsed (+ autoModelSelectedDisplayMessage)",
            "Other": "apiPercentUsed (+ namedModelSelectedDisplayMessage)",
            "note": "Dashboard Auto/Composer ~= Cursor; named/API ~= Other",
        },
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
