# Cursor Usage Desktop Widget — 인수인계

작성일: 2026-07-29  
상태: **스펙 승인 완료 · 구현 착수 가능** (상세: `docs/references/assets/20260729-cursor-usage-widget/system-spec.md`)  
레포: `C:\Users\cykim\project\cursor-usage-widget`

이 문서는 “무엇을 / 왜 / 어디까지”만 고정한다. 구현 착수 전에 읽고, 범위가 바뀌면 이 문서를 먼저 갱신한다.

---

## 1. 한 줄 목표

Windows 바탕화면 위에 Steam **Mini Cozy Room**처럼 떠 있는 작은 위젯으로, Cursor **포함(included) 사용량 잔여**만 항상 보이게 한다.

---

## 2. 배경 · 동기

- Cursor 사용량은 주로 [cursor.com/dashboard](https://cursor.com/dashboard) Usage에서 확인한다.
- IDE 밖(바탕화면)에서도 잔여 사용량을 상시 보고 싶다.
- 사용자는 **on-demand(초과 과금)를 쓰지 않는다.** 관심사는 included 쿼터/잔여뿐이다.

---

## 3. 제품 범위 (In Scope)

| 항목 | 내용 |
|------|------|
| 플랫폼 | Windows 데스크톱 |
| UI 형태 | **바탕화면형 플로팅 위젯** (항상 보이거나 쉽게 눈에 띄는 작은 창) |
| 레퍼런스 UX | Steam Friends의 **Mini Cozy Room** — 트레이 아이콘이 아니라 바탕화면/데스크톱 위에 떠 있는 작은 룸/패널 |
| 표시 데이터 | **Included usage만** — **Cursor 모델**과 **Other 모델** 두 트랙 모두 |
| UI | 트랙당 **프로그레스바 + 간단 문구** (룸형/장식형 아님) |
| 갱신 | 주기적 폴링 (구체 초/분은 미정, 분 단위가 현실적) |

### UX 의도 (중요)

- **시스템 트레이 앱이 아니다.** 트레이에만 두고 호버로 보는 형태는 거부.
- **IDE 상태바 확장만으로 대체하지 않는다.** Cursor 밖에서도 보이게 하는 것이 핵심.
- Mini Cozy Room처럼 “데스크톱에 올려둔 작은 상시 오브젝트” 느낌. 숫자만인 미니멀 패널이어도 되고, 장식형 룸 UI는 **후순위 옵션**(아래 Open Decisions).

---

## 4. 비범위 (Out of Scope) — 초기 버전

- On-demand / 초과 과금 추적·한도 설정 UI
- 팀 Admin/Analytics API 전용 대시보드 (개인 Pro 전제)
- 모델별·요청별 상세 분석, 알림/이메일, 멀티 계정
- macOS / Linux (필요 시 이후)
- Cursor 공식 제품화·스토어 배포 필수 요건
- 공식 공개 Usage API가 생기기를 기다림 (현재 없음)

---

## 5. 기술 판단 (구현 전 합의)

### 5.1 데이터 소스

- 개인 Pro에 **공식 public usage API는 없다.**
- Team/Enterprise Admin API는 이 유스케이스(개인 included 잔여 위젯)의 1차 경로가 아니다.
- 현실적 경로: Cursor가 로그인 상태를 저장하는 로컬 DB에서 세션 토큰을 읽고, 대시보드/IDE가 쓰는 **비공식(내부) usage 엔드포인트**를 폴링한다.

참고로 커뮤니티가 쓰는 패턴(변경될 수 있음):

- 로컬 DB: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`
- 사용량 조회 예: `POST https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage` 등
- 유사 도구: Marketplace “Cursor Usage Status”류 확장, `cursor-credits` CLI 등

### 5.2 표시할 값 (on-demand 없음 전제)

- 주기 내 **included 사용량**과 **한도(또는 잔여)** 만 다루면 충분.
- On-demand 잔액·토글·한도는 UI/로직에서 제외해도 된다.
- 응답 스키마는 Cursor 쪽 변경에 취약하므로, 파서는 “included 잔여를 뽑는” 최소 필드로 유지하는 편이 안전하다.

### 5.3 UI 구현 방향

- Windows 구형 Desktop Gadget 슬롯은 사실상 쓰지 않는다.
- **독립 작은 창**(투명/반투명, always-on-top 또는 바탕화면 위 z-order)이 Mini Cozy Room에 가장 가깝다.
- 스택은 미정 (Tauri / Electron / WPF 등). “가벼운 상시 위젯”이면 네이티브·Tauri 쪽이 유리할 수 있으나 **결정은 구현 착수 시**.

### 5.4 리스크 · 제약

| 리스크 | 설명 |
|--------|------|
| API 불안정 | 내부 엔드포인트·응답 형태·토큰 형식이 Cursor 업데이트로 깨질 수 있음 |
| 인증 | 로컬 `state.vscdb` 토큰 읽기 — 로그·원격 전송·커밋 금지 |
| 로그인 의존 | Cursor에 로그인되어 있지 않으면 위젯은 데이터 없음 |
| 공식 미지원 | “개인용 유틸” 전제. 장애 시 대시보드가 진실의 원천 |

---

## 6. 성공 기준 (초기 MVP)

1. Windows에서 위젯 창이 바탕화면 위에 떠 있고, 트레이-only가 아니다.
2. Cursor 로그인 상태에서 **Cursor / Other** included 사용량이 각각 **프로그레스바 + 간단 문구**로 표시된다.
3. On-demand 관련 UI/카피가 없다.
4. 수 분 이내 주기로 값이 갱신된다 (기본 5분, 설정 가능하면 가산점).
5. 토큰·시크릿이 레포/로그에 남지 않는다.

---

## 7. 명시적으로 하지 않은 것 (이 대화 기준)

- 코드·의존성·앱 스캐폴딩: **없음**
- 디자인 시안·에셋: **없음**
- 원격 GitHub 레포 생성·푸시: **없음** (로컬 git init만 된 상태일 수 있음)

---

## 8. Open Decisions — 승인됨 (2026-07-29)

1. **비주얼** — 프로그레스바 + 간단 문구 (룸형 거부)  
2. **창 동작** — always-on-top + 드래그; 클릭 스루·자동시작은 후순위  
3. **표시** — Cursor / Other 각 `used / limit`(또는 잔여·%) + 바  
4. **스택** — Tauri 2  
5. **실패 UX** — NeedLogin vs FetchError 구분  

---

## 9. 다음 작업 (착수)

1. Phase 0: 토큰 → usage → Cursor·Other 필드 맵핑 스파이크  
2. Phase 1: 플로팅 창 스캐폴드  
3. Phase 2: 듀얼 바 UI + 폴링  
4. Phase 3: 설정·위치 persist·README  

---

## 10. 관련 참고 (비공식·변경 가능)

- Dashboard: https://cursor.com/dashboard  
- 커뮤니티 Usage 상태바 확장 / `cursor-credits` 등 — **참고용**, 이 레포의 종속하지 말 것  
- 공식 Agent/Cloud API는 **billing/usage 잔여 조회용이 아님**

---

## 11. 사용자 의도 요약 (그대로 유지할 문장)

> On-demand는 안 쓴다. 사용량(included)만 궁금하다. Cursor 모델과 Other 모델 둘 다 보여야 한다.  
> Windows 트레이보다 Steam Mini Cozy Room처럼 바탕화면 쪽에 띄워 놓고 싶다. 룸형 UI는 아니고 프로그레스바+문구면 된다.  
> 스펙은 승인됐고, Phase 0 스파이크부터 구현한다.
