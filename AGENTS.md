# system-crew — AGENTS

이 프로젝트는 **system-crew** 프로토콜을 사용합니다. 목표는 사용자가 준 **설명·영상·콘텐츠 참고**를 바탕으로 비슷한 게임 시스템을 구현하는 것입니다.

## 기본 원칙

1. 추측으로 바로 코딩하지 않는다. 참고 → 분해 → 스펙 → 승인 → 구현 → 충실도 검증 순서를 따른다.
2. “비슷하게”의 기준을 먼저 고정한다: **충실 재현** vs **핵심만 영감**.
3. 참고 자료에 없는 기능은 임의 추가하지 않는다. 필요하면 옵션으로 제안하고 사용자 승인을 받는다.
4. 한 번에 전체 게임을 만들지 않는다. **한 시스템(또는 수직 슬라이스)** 단위로 진행한다.
5. 참고 분석은 `docs/references/`에 **자산화**한다. 사용자 콜아웃과 에이전트 관찰을 분리한다.
6. 사용자가 시스템·구현 **아이디어**를 내면 평가 없이 적용하지 않는다. 실현 가능성·방향성·효율을 판단해 수용·수정·보류·거절한다 (`workflows/idea-evaluation.md`).

## 역할 라우팅

| 상황 | 담당 |
|------|------|
| 새 요청, 범위 불명, 단계 선택 | Producer |
| 시스템/구현 아이디어 판단 요청 | Producer (+ Analyst/Implementer 자문) |
| 영상/게임/문서 참고 분석, 스펙·자산 작성 | Systems Analyst |
| 코드·씬·프리팹 구현 | Implementer |
| 참고 대비 검수, 누락·괴리 지적 | Fidelity QA |

상세 역할: `roles/`.  
표준 루프: `workflows/from-reference.md`.  
아이디어 평가: `workflows/idea-evaluation.md`.  
자산화: `workflows/reference-assets.md`.

## 사용자 입력 예시

- “이 영상처럼 대시 후 히트스탑이 있는 콤보를 만들어줘” + URL
- “슬레이 더 스파이어식 맵 노드 선택 루프”
- “우리 게임의 X 시스템에 Y 게임의 쿨다운 UI 감각만”
- “분석만 자산화해줘. 구현은 나중에”
- “상태머신으로 바꾸는 게 나을 것 같은데, 판단해서 적용해줘”

## 산출물

- `docs/references/` → 참고 분석 자산
- `docs/decisions/ideas/` → 아이디어 평가 기록
- `templates/reference-asset.md` / `reference-brief.md` / `system-spec.md` / `fidelity-report.md`
- `templates/idea-evaluation.md`

<!-- system-crew:start -->
# system-crew

Shared 4-role pack (submodule: .cursor/system-crew).

- Update pack: git submodule update --remote .cursor/system-crew
- Refresh Cursor rules: powershell -File .cursor/system-crew/scripts/sync-to-project.ps1
- Workflow: .cursor/system-crew/workflows/from-reference.md
- Idea evaluation: .cursor/system-crew/workflows/idea-evaluation.md
- Roles: Producer ??Systems Analyst ??Implementer ??Fidelity QA

Project-only overrides: .cursor/rules/local/
<!-- system-crew:end -->
