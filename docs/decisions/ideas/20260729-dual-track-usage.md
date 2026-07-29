# Idea Evaluation

- Date: 2026-07-29
- Idea id: `20260729-dual-track-usage`
- Status: `decided`
- Verdict: `ADOPT`
- Related: `docs/references/assets/20260729-cursor-usage-widget/system-spec.md`

## Proposal (user)

사용량에 Cursor 모델과 Other 모델이 있으니 **둘 다** 위젯에 나와야 한다.

## Context

- Goal: included 잔여를 대시보드와 같은 축으로 보이게
- Constraints: included only; on-demand 제외; 개별 모델명 상세는 비범위

## Scores

| Axis | Result | Evidence |
|------|--------|----------|
| Feasibility | Pass (Phase 0 검증) | 대시보드가 두 버킷을 노출; API 필드명은 스파이크에서 확정 |
| Direction fit | Pass | 사용자 관심사와 대시보드 Usage 구조에 정합 |
| Efficiency | Pass | 집계 두 줄이면 충분; 모델별 리스트는 과함 |

## Alternatives considered

| Alternative | Pros | Cons | Better when |
|-------------|------|------|-------------|
| 합산 한 줄 | UI 단순 | Cursor/Other 구분 불가 | 거부 (사용자 요구 불충족) |
| Cursor+Other 두 줄 | 요구 충족 | 창 세로 +α | **채택** |
| 모델별 전체 목록 | 상세 | 범위·노이즈 | defer |

## Decision

- Verdict: `ADOPT`
- What we will do now: 파서·UI 계약을 듀얼 트랙으로 고정
- What we will not do: 합산-only MVP, 모델명 전체 리스트

## Follow-up

- Phase 0에서 필드 맵핑 필수
- Logged in INDEX: yes
