# Idea Evaluation

- Date: 2026-07-29
- Idea id: `20260729-stack-tauri`
- Status: `decided`
- Verdict: `ADOPT`
- Related: `docs/references/assets/20260729-cursor-usage-widget/system-spec.md`

## Proposal (user)

스택: Tauri / Electron / .NET 중 선택. **일괄 승인**으로 Tauri 채택.

## Context

- Goal: 가벼운 Windows 상시 플로팅 위젯 + SQLite + HTTPS
- Constraints: 상주 RAM, always-on-top, 시크릿 비로그

## Scores

| Axis | Result | Evidence |
|------|--------|----------|
| Feasibility | Pass | 창 플래그·FS·HTTP 가능 |
| Direction fit | Pass | 가벼운 상시 위젯 |
| Efficiency | Pass | Electron 대비 상주 비용 유리 |

## Alternatives considered

| Alternative | Pros | Cons | Better when |
|-------------|------|------|-------------|
| Tauri 2 | 가벼움 | Rust 러닝커브 | **채택** |
| Electron | JS 친숙 | 무거움 | JS-only 팀 |
| WPF | 네이티브 | UI 이터레이션 | .NET 전용 |

## Decision

- Verdict: `ADOPT`
- What we will do now: Phase 1 Tauri 스캐폴드 (Phase 0은 스크립트 가능)
- What we will not do: Electron 기본 채택

## Follow-up

- Spec / implementation owner: Implementer
- Logged in INDEX: yes
