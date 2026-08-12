---
name: project-workflows
description: >-
  Index for shared project workflows: Korean git commits, +커푸 commit+push,
  grouped/stepwise commits, and README tone. Use when committing, drafting commit
  messages, pushing, 전체 커밋, splitting mixed working-tree changes, or editing
  README/user-facing docs.
---

# Project Workflows

- `korean-git-commit` — 한글 커밋 메시지 · 커밋/푸시 절차 · `+커푸`
- `grouped-git-commit` — 비슷한 변경끼리 묶어 1~N커밋 · 「전체」커밋
- `readme-tone` — README·사용 안내 존댓말 톤 (~합니다, ~하세요, ~둡니다, ~마세요)
- `rebuild-restart-app` — 작업 완료 후 release 강제 재빌드·설치본 재시작

## Routing

- 커밋 / 커밋 메시지 / `+커푸` / 푸시 → `korean-git-commit` (+ `git-commit-on-finish` 룰)
- 전체 커밋 / 전부 커밋 / 단계별 커밋 / 비슷한 것끼리 커밋 / 혼합 워킹트리 → `grouped-git-commit`
- README / 사용 안내 / 존댓말 톤 → `readme-tone`
- 작업 완료 후 설치본 재빌드·재시작 / `rebuild-restart` / 빌드 최신화 → `rebuild-restart-app`
