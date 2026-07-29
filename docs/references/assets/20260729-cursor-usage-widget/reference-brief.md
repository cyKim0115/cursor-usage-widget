# Reference Brief

- Date: 2026-07-29
- Similarity target: inspired
- Asset id: `20260729-cursor-usage-widget`
- Sources: `HANDOFF.md`; Mini Cozy Room (배치만); cursor.com/dashboard; 사용자 승인 콜아웃

## User callouts

| # | Callout | Where | Intent |
|---|---------|-------|--------|
| 1 | On-demand 안 씀, included만 | HANDOFF §11 | 표시/로직 범위 |
| 2 | Mini Cozy Room식 바탕화면 위젯 | HANDOFF §3·§11 | 상시 배치 |
| 3 | 룸형 아님 — 프로그레스바 + 간단 문구 | 사용자 2026-07-29 | MVP 비주얼 |
| 4 | Cursor 모델·Other 모델 둘 다 표시 | 사용자 2026-07-29 | 듀얼 트랙 |

## Observed player verbs

- 상시 확인, 드래그, (가산) 설정

## Core loop

1. 토큰 획득 → 2. Cursor·Other included 조회 → 3. 바+문구 표시 → 4. 주기 재조회

## Rules & numbers

| Item | Value / range | Confidence |
|------|---------------|------------|
| Tracks | Cursor, Other | seen |
| UI per track | progress bar + short caption | seen |
| Poll | 300s | approved |
| Secrets | never log/commit | seen |

## Timing & feel

- 상시 오브젝트; 장식 룸 없음; 바 fill로 사용 비율 즉시 인지

## UI / feedback

- 두 줄: `Cursor` / `Other`
- 각 줄: 라벨 + 프로그레스바 + `used / limit`(또는 잔여·%)
- 실패: NeedLogin / FetchError; 한 트랙만 실패 시 해당 줄만 오류

## States & edge cases

| State | Behavior |
|-------|----------|
| OK | 두 트랙 바+문구 |
| Partial parse | 성공 트랙 표시, 실패 트랙 “—” |
| NeedLogin | 로그인 안내 |
| FetchError | 갱신 실패 + last good 유지 |

## Explicit non-goals (this pass)

- 룸형 UI, on-demand, 개별 모델명 브레이크다운, 팀 Admin, non-Windows

## Adaptation notes

- Mini Cozy Room → 배치·가시성만
- 대시보드 Usage의 Cursor / Other 구분을 위젯에 그대로 반영

## Open questions

- Phase 0 필드 맵핑·단위만 남음 (착수 blocker 아님)
