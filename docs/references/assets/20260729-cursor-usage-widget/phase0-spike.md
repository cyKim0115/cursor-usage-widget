# Phase 0 Spike Notes

- Date: 2026-07-29
- Spec: `system-spec.md` v0.2.0-approved
- Script: `scripts/spike_usage.py`

## Result: PASS

로컬 토큰 → `GetCurrentPeriodUsage` → Cursor/Other 듀얼 트랙 파싱까지 확인.

## Auth

| Item | Value |
|------|-------|
| DB | `%APPDATA%\Cursor\User\globalStorage\state.vscdb` |
| Key | `ItemTable.cursorAuth/accessToken` |
| Header | `Authorization: Bearer <token>` |
| Cookie `WorkosCursorSessionToken` | **실패** (401) — 사용하지 않음 |

토큰·리프레시는 로그/커밋 금지. 스크립트는 마스킹만 출력.

## Endpoints (working)

| Method | URL | Use |
|--------|-----|-----|
| POST | `https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage` | 듀얼 % + 문구 |
| POST | `https://api2.cursor.sh/aiserver.v1.DashboardService/GetPlanInfo` | 플랜명·included USD |

공통 헤더: `Content-Type: application/json`, `Connect-Protocol-Version: 1`, Bearer.

## Field map (Cursor / Other)

| UI track | API field | Caption |
|----------|-----------|---------|
| **Cursor** | `planUsage.autoPercentUsed` | `autoModelSelectedDisplayMessage` |
| **Other** | `planUsage.apiPercentUsed` | `namedModelSelectedDisplayMessage` |

대시보드 용어: Auto/Composer ≈ Cursor, named/API ≈ Other.

프로그레스바 fill = `percent_used / 100`.  
문구 예: `You've used 20% of your included total usage` / API 동등 문구.  
또는 짧게 `20% used` / `79% left`.

## Observed sample (this machine, Pro+)

- Plan: Pro+, included **$70**
- Cursor ~20.8% used
- Other ~16.8% used
- `includedSpend` == `limit` ($70) — 표시 메시지에 usage limit 문구 가능 (on-demand UI는 여전히 비범위; `noUsageBasedAllowed: true` on GetHardLimit)

## Non-goals confirmed

- `/auth/usage`는 레거시 모델 카운트 — 듀얼 included %에 부적합
- `www.cursor.com/api/usage`는 Bearer만으로 401

## How to run

```powershell
python scripts/spike_usage.py
```

## Next

Phase 1–2: Tauri 플로팅 창 + 위 파서 이식 + 듀얼 프로그레스바.
