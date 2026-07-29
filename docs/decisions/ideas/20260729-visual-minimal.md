# Idea Evaluation

- Date: 2026-07-29
- Idea id: `20260729-visual-minimal`
- Status: `decided`
- Verdict: `ADOPT_WITH_CHANGES`
- Related: `docs/references/assets/20260729-cursor-usage-widget/`

## Proposal (user)

초기: A 미니멀 vs B 룸형.  
확정: **룸형 아님. 프로그레스바 + 간단한 문구.** Cursor / Other 두 줄.

## Context

- Goal: MVP에서 included 잔여를 즉시 인지
- Constraints: 장식 아트 범위 팽창 금지

## Scores

| Axis | Result | Evidence |
|------|--------|----------|
| Feasibility | Pass | 바+텍스트는 Phase 1–2에 충분 |
| Direction fit | Pass | 상시 가시성 유지, 룸 아트 배제 |
| Efficiency | Pass | 듀얼 트랙도 두 줄로 단순 |

## Alternatives considered

| Alternative | Pros | Cons | Better when |
|-------------|------|------|-------------|
| 숫자만 | 최소 | 비율 인지 약함 | 초소형 |
| 바+문구 | 비율+수치 | 약간 세로 공간 | **채택** |
| 룸형 | 분위기 | 범위·비용 | 거부 |

## Decision

- Verdict: `ADOPT_WITH_CHANGES` (미니멀 → **바+문구**, 룸 거부)
- What we will do now: 듀얼 프로그레스바 UI를 스펙에 고정
- What we will not do: 룸형 UI

## Follow-up

- Spec owner: Implementer Phase 1–2
- Logged in INDEX: yes
