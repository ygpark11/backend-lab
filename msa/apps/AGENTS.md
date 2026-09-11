# AGENTS.md

Antigravity 및 AI 어시스턴트를 위한 **PS Tracker** 프로젝트 전역 가이드입니다.

---

## 🚨 최우선 필수 규약 (Non-negotiable Rules)

### 1. 이모지(Emoji) 절대 사용 금지
- **UI 및 코드베이스 어디에도 이모지(🔥, ✨, 👑, 💥, 🛡️, 💎, 💰, ⚠️, 💔 등)를 절대 사용하지 않습니다.**
- 시각적 표현이 필요한 경우 100% `lucide-react`의 벡터 아이콘을 사용하고, 텍스트는 정갈한 표준 한국어/영어로 작성합니다.
- 상세 규칙: [no-emoji.md](file:///.agents/rules/no-emoji.md)

### 2. 고성능 & 저발열 원칙 (게임 및 고부하 UI)
- 애니메이션 루프 내에서 React 상태(`useState`)를 고빈도(`setInterval(16ms)` 등)로 갱신하여 초당 수십 회 리렌더링을 유발하는 코드를 엄격히 금지합니다.
- 파티클이나 애니메이션은 **CSS 하드웨어 가속(`transform: translateZ(0)`, `will-change`)** 또는 **`<canvas>` + `requestAnimationFrame`**을 직접 조작하여 React 리렌더링 없이 무부하 60FPS로 구동해야 합니다.
- 불필요한 과도한 다중 `box-shadow` / `filter: drop-shadow`의 블러 반경을 통제하여 모바일 기기 발열 및 배터리 소모를 방지합니다.

---

## 작업 영역별 상세 가이드 문서 색인
- **[이모지 금지 규약](file:///.agents/rules/no-emoji.md)**
- **[UI/UX 디자인 시스템 가이드](file:///frontend/.agents/rules/ui-ux.md)**
- **[코딩 컨벤션 가이드](file:///frontend/.agents/rules/coding.md)**
- **[환경 설정 및 배포 가이드](file:///frontend/.agents/rules/environment.md)**
