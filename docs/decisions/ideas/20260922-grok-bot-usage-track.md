# Idea Evaluation

- Date: 2026-09-22
- Idea id: `20260922-grok-bot-usage-track`
- Status: `decided`
- Verdict: `ADOPT_WITH_CHANGES`
- Related: `docs/references/assets/20260729-cursor-usage-widget/system-spec.md`

## Proposal (user)

그록 봇도 사용 중이니 **Grok Bot 사용량을 표시하는 영역**이 필요하다.

## Context

- Goal: 월간 Cursor/Other included와 별도인 **주간 Grok Bot** 잔여를 위젯에서 바로 보기
- Constraints: included only; on-demand UI 비범위; 기존 듀얼 트랙 패턴 유지
- Spike (이 머신): `POST …/GetSandUsageStatus` + Bearer → `usagePercent`, `nextResetTimestampUtc`, `hasNonZeroIncludedLimit`

## Scores

| Axis | Result | Evidence |
|------|--------|----------|
| Feasibility | Pass | 기존 토큰으로 `GetSandUsageStatus` 200; 필드 맵핑 확인 |
| Direction fit | Pass | 대시보드·CodexBar와 같이 Cursor/Other와 **별 줄**; 룸 UI 아님 |
| Efficiency | Pass | API 1회 + 트랙 1줄; 모델별 목록·on-demand는 과함 |

## Alternatives considered

| Alternative | Pros | Cons | Better when |
|-------------|------|------|-------------|
| Cursor %에 Grok 합산 표시 | 줄 수 유지 | Bot 주간 풀과 월간 Auto 풀이 다름 | 거부 |
| Grok Bot 전용 세 번째 줄 | 요구 충족 | 창 세로 +α | **채택** |
| 브라우저 쿠키 전용 엔드포인트만 | CodexBar와 동일 경로 | 우리 앱은 Bearer로 api2 이미 성공 | 불필요 |

## Decision

- Verdict: `ADOPT_WITH_CHANGES`
- What we will do now:
  - `GetSandUsageStatus`로 `usagePercent` / 주간 리셋 시각 파싱
  - UI에 **Grok Bot** 트랙 추가 (프로그레스바 + `% used`)
  - `hasNonZeroIncludedLimit == false`면 트랙 숨김
  - 캡션에 주간 리셋까지 남은 시간(짧게) 병기 가능
- What we will not do: on-demand 설정 UI, Ultra 업셀 CTA, 모델별 Bot 상세

## Follow-up

- phase0 / system-spec 필드 맵에 sand 엔드포인트 반영
- Logged in INDEX: yes
