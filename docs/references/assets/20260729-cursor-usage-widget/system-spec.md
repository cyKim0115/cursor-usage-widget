# System Spec

- Title: Cursor Included Usage Desktop Widget (MVP)
- Spec version: 0.2.0-approved
- Based on brief: `reference-brief.md` / `HANDOFF.md`
- Similarity: inspired
- Status: **approved**

## Player-facing summary

Windows 바탕화면 위에 작은 플로팅 창이 떠 있고, Cursor **included** 사용량이 **Cursor 모델**과 **Other 모델** 두 줄로 각각 프로그레스바 + 짧은 문구로 표시된다. On-demand·룸형 UI는 없다.

## Success criteria

1. 트레이-only가 아닌 **독립 플로팅 창**이 바탕화면에서 보인다.
2. Cursor 로그인 시 included 사용량이 **Cursor 모델 / Other 모델** 둘 다 보인다.
3. 각 줄은 **프로그레스바 + 간단한 문구**(라벨·사용/한도 또는 잔여·%)로 구성된다.
4. On-demand UI/카피가 없다.
5. 기본 폴링 간격(5분, 설정 가능하면 가산)으로 값이 갱신된다.
6. 토큰·시크릿이 레포/로그에 남지 않는다.

## Scope

- In:
  - Windows 데스크톱 플로팅 위젯
  - 로컬 Cursor 세션 → 내부 usage API 폴링
  - included 메트릭을 **Cursor / Other** 두 트랙으로 표시
  - UI: 트랙당 프로그레스바 + 간단 문구 (룸형·장식형 아님)
  - 드래그 이동, always-on-top
  - NeedLogin / FetchError 구분 실패 UX
- Out:
  - On-demand, 팀 Admin API, 상세 분석, 알림, 멀티계정
  - macOS/Linux, 스토어 배포
  - Mini Cozy Room식 룸/장식 UI
  - 공식 public Usage API 대기

## Mechanics

### Inputs

- 시스템: 폴링 타이머, 앱 시작 시 1회 즉시 조회
- 사용자: 창 드래그; (가산) 설정 — 폴링 간격, always-on-top
- 데이터: `%APPDATA%\Cursor\User\globalStorage\state.vscdb` 세션 토큰 (읽기 전용)

### State machine / flow

```
AppStart
  → ResolveToken
      ├─ ok → FetchUsage → RenderOk → Wait(interval) → FetchUsage …
      └─ fail → RenderNeedLogin
FetchUsage
  ├─ ok → RenderOk (cache last good)
  └─ fail → RenderFetchError (keep last good if any)
```

### Data (tunables)

| Name | Default | Notes |
|------|---------|-------|
| `poll_interval_sec` | `300` | 확정 |
| `always_on_top` | `true` | 확정 |
| `display_mode` | `bar_with_used_limit` | 프로그레스바 + `used / limit` (또는 잔여·%) 문구 |
| `window_opacity` | `0.92` | 가설, 구현 시 조정 |
| `click_through` | `false` | MVP out |

### Events / messages

- `usage.updated` — Cursor·Other included 메트릭
- `auth.missing` — no usable token
- `usage.fetch_failed` — network/HTTP/parse
- `ui.drag_moved` — persist position (권고)

### Display fields (included only, dual track)

파서는 응답에서 **두 트랙**의 included 필드만 최소 추출한다.

| Logical field | Meaning |
|---------------|---------|
| `cursor.used` | Cursor 모델 included 사용량 |
| `cursor.limit` | Cursor 모델 included 한도 |
| `cursor.remaining` | 있으면 사용; 없으면 `limit - used` |
| `other.used` | Other 모델 included 사용량 |
| `other.limit` | Other 모델 included 한도 |
| `other.remaining` | 있으면 사용; 없으면 `limit - used` |
| `period_end` | 있으면 last-updated와 함께 표시 가능 |

**UI 한 줄(트랙) 구성**

```
[라벨]  ████████░░░░  used / limit   (또는 remaining · %)
```

예:
- `Cursor  ████░░░░  $12.40 / $20.00`
- `Other   ██░░░░░░  $3.10 / $20.00`

실제 API 단위(달러·요청 수 등)는 Phase 0에서 필드 맵핑 후 확정. 라벨 문구는 `Cursor` / `Other`(또는 대시보드와 동일한 표기).

On-demand / spend limit 필드는 파싱해도 UI에 노출하지 않음.

### UI layout (MVP)

```
┌─────────────────────────────┐
│ Cursor  [========----] 문구 │
│ Other   [===---------] 문구 │
│ updated HH:MM               │  ← 선택·작게
└─────────────────────────────┘
```

- 룸/배경 일러스트/배지 스티커 없음
- 프로그레스바 fill = `used / limit` (limit=0이면 빈 바 + 오류/불명 문구)

## Implementation sketch

### Stack (approved)

**Tauri 2 + Rust backend + 작은 HTML/CSS**

Phase 0 스파이크는 스택 비의존 스크립트로 가능.

### Suggested modules / files

```
src-tauri/
  auth/cursor_token.rs      # state.vscdb → token (절대 로그 금지)
  usage/client.rs           # HTTPS POST internal usage endpoint
  usage/parse.rs            # Cursor + Other included extract
  usage/poller.rs           # interval loop
  window/setup.rs           # size, always-on-top
src/
  ui/                     # dual progress bars + short labels + error states
```

### Dependencies

- Cursor 로컬 설치 + 로그인
- SQLite 읽기 (`state.vscdb`)
- HTTPS to Cursor internal API (비공식)

### Vertical slice definition (minimum shippable)

1. 헤드리스: 토큰 → usage 1회 → Cursor·Other included stdout (시크릿 마스킹)
2. 플로팅 창 + always-on-top + 드래그
3. 두 줄 프로그레스바 + 문구 + 폴링 + OK/에러 상태
4. (가산) 설정·위치 저장

## Implementation plan (phased)

### Phase 0 — Spike (½–1일)

1. `state.vscdb` 세션 토큰 추출
2. usage 엔드포인트 호출
3. 응답에서 **Cursor / Other** included 필드 맵핑 문서화
4. 실패 모드 기록

**Exit:** 두 트랙 숫자가 한 번 이상 출력됨.

### Phase 1 — Floating shell (½일)

1. Tauri 스캐폴드
2. 작은 창, always-on-top, 드래그
3. 플레이스홀더 두 줄 바 + 라벨

**Exit:** 바탕화면에서 창 가시.

### Phase 2 — Poll + render MVP (1일)

1. Phase 0 로직 이식
2. 5분 폴링 + 시작 시 1회
3. Cursor / Other 각각 바 + `used / limit`(또는 잔여·%)
4. NeedLogin / FetchError
5. 토큰 비로그

**Exit:** 성공 기준 1–6.

### Phase 3 — Hardening (½–1일)

1. 창 위치 persist
2. 폴링·always-on-top 설정
3. 마지막 성공 메트릭 캐시(토큰 제외)
4. README: 비공식 API 리스크

### Phase 4 — Optional (defer)

- autostart, click-through, 트레이 보조(메인 UX는 플로팅 유지)

## Edge cases to handle now

- 토큰 없음 / Cursor 미설치
- API 실패 / 스키마 변경
- 한 트랙만 파싱 성공 → 성공 트랙 표시 + 실패 트랙에 “—” / 오류 문구
- limit=0 또는 필드 없음
- DB 잠금 재시도

## Deferred

- 룸형 UI, autostart, click-through, multi-account, non-Windows
- On-demand 일체
- 모델별(개별 모델명) 상세 브레이크다운 (트랙은 Cursor vs Other 집계만)

## Approved Open Decisions

| # | Decision | Approved choice |
|---|----------|-----------------|
| 1 | 비주얼 | 프로그레스바 + 간단 문구 (룸형 아님) |
| 2 | 창 동작 | always-on-top + drag; click-through/autostart defer |
| 3 | 표시 | Cursor·Other 각 바 + used/limit(또는 잔여·%) |
| 4 | 스택 | Tauri 2 |
| 5 | 실패 UX | NeedLogin vs FetchError 구분 |

## Approval

- Approved by user: **yes**
- Date: 2026-07-29
- Ready for implementation: **yes** — Implementer는 Phase 0부터 착수 가능

## Remaining unknowns (non-blocking for start)

1. Phase 0에서 실제 JSON 필드명·단위(USD vs requests) 확정
2. 대시보드 라벨이 `Cursor`/`Other`와 다를 경우 표기 문자열만 맞춤
