# Idea Evaluation

- Date: 2026-07-30
- Idea id: `20260730-standalone-launch`
- Status: `decided`
- Verdict: `ADOPT_WITH_CHANGES`
- Related: `docs/references/assets/20260729-cursor-usage-widget/system-spec.md` (autostart was deferred → promote for launch UX)

## Proposal (user)

cmd에서 `npm run`으로 실행하면 정상인데, exe를 찾아 직접 실행하면 올바르게 켜지지 않는다.  
비개발자도 쉽게 켤 수 있게 고치고, 시작프로그램 등록 시에도 오류가 나지 않게 해 달라.

## Context

- Goal of this pass: 단독 실행·시작프로그램이 **릴리스(프론트 내장) 바이너리**만 쓰도록 고정
- Constraints: Tauri `devUrl`은 Vite 의존; `tauri-plugin-autostart`는 `current_exe()`를 등록 → debug exe가 시작프로그램에 박힘

## Scores

| Axis | Result (Pass / Partial / Fail) | Evidence |
|------|--------------------------------|----------|
| Feasibility | Pass | 릴리스 빌드 + LOCALAPPDATA 설치 복사 + `auto-launch`로 경로 고정 가능. debug는 Vite 없으면 MessageBox 후 종료. |
| Direction fit | Pass | 상시 플로팅 위젯·비개발자 사용과 맞음. 트레이-only로 바꾸지 않음. |
| Efficiency | Pass | 커스텀 런처/설치 경로가 MSI 전체보다 단순. 플러그인 current_exe 의존만 제거. |

## Alternatives considered

| Alternative | Pros | Cons | Better when |
|-------------|------|------|-------------|
| exe 직접 실행도 dev처럼 Vite 자동 기동 | 개발 습관 유지 | 비개발자에 Node/Vite 강제, 시작프로그램에 부적합 | 개발자-only |
| NSIS 설치 프로그램만 | 표준 배포 | 빌드·서명·스토어 범위 큼 | 스토어 배포 시 |
| **LOCALAPPDATA 복사 + `시작.bat` + autostart 고정 경로** | 더블클릭·부팅 모두 동일 바이너리 | 최초 1회 릴리스 빌드 필요 | **지금 (채택)** |

## Decision

- Verdict: `ADOPT_WITH_CHANGES`
- What we will do now:
  1. debug exe를 Vite 없이 실행하면 안내 MessageBox 후 종료
  2. `%LOCALAPPDATA%\CursorUsageWidget\`에 릴리스 exe 설치·실행하는 `시작.bat`
  3. 시작프로그램은 항상 그 설치 경로만 등록 (debug `current_exe` 등록 금지)
- What we will not do: 전체 스토어/MSI 배포 파이프라인, Vite를 exe에 묶기
- Modified approach: 플러그인 기본 `enable`(current_exe) 대신 설치 경로 기준 커스텀 autostart 명령

## Follow-up

- Spec / implementation owner: Implementer
- Revisit when: 공개 배포·코드서명 필요 시
- Logged in INDEX: yes
