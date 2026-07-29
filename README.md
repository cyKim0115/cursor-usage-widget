# Cursor Usage Widget

Windows 바탕화면용 플로팅 위젯. Cursor **included** 사용량을 **Cursor / Other** 두 트랙으로 프로그레스바 + 짧은 문구로 표시한다.

스펙: `docs/references/assets/20260729-cursor-usage-widget/system-spec.md`  
스파이크: `python scripts/spike_usage.py`

## 요구 사항

- Windows + Cursor 로그인
- Node.js, Rust (rustup), Visual Studio C++ Build Tools
- WebView2 (Win10/11 기본)

## 개발 실행

```powershell
npm install
npm run tauri dev
```

## 주의

- 인증은 로컬 `%APPDATA%\Cursor\User\globalStorage\state.vscdb`의 `cursorAuth/accessToken`을 읽는다.
- Cursor 내부 API(`api2.cursor.sh` DashboardService)는 **비공식**이며 언제든 깨질 수 있다. 장애 시 [대시보드](https://cursor.com/dashboard)가 진실의 원천이다.
- 토큰을 로그·커밋·원격 전송하지 말 것.
- On-demand UI는 범위 밖이다.
