# Reference Asset

- Asset id: `20260729-cursor-usage-widget`
- Title: Cursor included-usage desktop floating widget
- Date: 2026-07-29
- Status: `implemented`
- Similarity: `inspired`
- Tags: `desktop-widget`, `usage-quota`, `floating-ui`, `cursor-api`, `windows`, `progress-bar`
- Related systems / features: dual-track included usage (Cursor vs Other), local session token, floating panel
- Project notes path: `HANDOFF.md`, `docs/references/assets/20260729-cursor-usage-widget/system-spec.md`, `scripts/spike_usage.py`, `src-tauri/`

## Sources

| # | Type | Title / URL | Timestamp / section | Notes |
|---|------|-------------|---------------------|-------|
| 1 | other | `HANDOFF.md` | 전체 | 제품 범위·기술 판단 |
| 2 | game/UX ref | Steam Mini Cozy Room | UX 형태 | 상시 바탕화면 배치만 inspired |
| 3 | article/dashboard | https://cursor.com/dashboard | Usage | SoT; Cursor/Other 트랙 |
| 4 | other | Cursor `state.vscdb` + 내부 usage API | §5.1 | 비공식·변경 가능 |

## User callouts

| # | Callout | Where | Why it mattered |
|---|---------|-------|-----------------|
| 1 | On-demand 안 씀, included만 | HANDOFF §11 | 표시 범위 |
| 2 | 트레이보다 Mini Cozy Room식 바탕화면 위젯 | HANDOFF §3·§11 | 배치 UX |
| 3 | 룸형 UI 아님 — 프로그레스바 + 간단 문구 | 사용자 승인 (2026-07-29) | 비주얼 확정 |
| 4 | 사용량은 Cursor 모델 / Other 모델 **둘 다** | 사용자 승인 (2026-07-29) | 듀얼 트랙 필수 |

## Distilled analysis

### Player verbs

- 위젯을 상시 확인
- 창 드래그
- (가산) 폴링·always-on-top 설정

### Core loop

1. 로컬 Cursor 세션 토큰 획득
2. usage 폴링 → Cursor·Other included 파싱
3. 각 트랙 프로그레스바 + 문구 표시 → N분 후 재폴링

### Timing / feel / feedback highlights

- 상시 가시성; 룸 장식 없음
- 갱신: 숫자·바 갱신 정도

### Rules & numbers (high signal)

| Item | Value / range | Confidence |
|------|---------------|------------|
| Tracks | Cursor + Other (both required) | seen (user) |
| UI | progress bar + short text per track | seen (user) |
| Poll | 5 min default | approved |
| Auth | state.vscdb token | hypothesis until Phase 0 |

## Decisions

| Decision | Adopt | Defer | Reject | Rationale |
|----------|-------|-------|--------|-----------|
| Included-only | ✓ | | | 사용자 의도 |
| 플로팅 창 | ✓ | | | Mini Cozy Room inspired (배치) |
| 프로그레스바+문구 UI | ✓ | | | 사용자 확정 |
| Cursor + Other 듀얼 표시 | ✓ | | | 사용자 확정 |
| 룸형 UI | | | ✓ | 사용자 거부 |
| On-demand UI | | | ✓ | 명시적 비범위 |
| Tauri 스택 | ✓ | | | 승인 |
| autostart / click-through | | ✓ | | MVP 후 |

## Open questions

- Phase 0: JSON 필드명·표시 단위(USD 등)
- 대시보드 라벨 문자열 정합

## Artifact links

- `reference-brief.md`: 동 폴더
- `system-spec.md`: 동 폴더 (approved)
- `phase0-spike.md`: 동 폴더 (PASS)
- `fidelity-report.md`: (없음)
- Implementation: `scripts/spike_usage.py`, `src-tauri/`, `src/`

## Reuse hints

- Tags: `desktop-widget`, `usage-quota`, `progress-bar`, `cursor-api`
- Dual-track quota UIs; re-verify API schema per Cursor version
