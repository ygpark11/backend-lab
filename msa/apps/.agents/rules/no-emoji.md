# NO_EMOJI_RULE (이모지 절대 사용 금지 규약)

## 1. 핵심 원칙
- **UI 및 코드베이스 내 이모지(Emoji) 사용을 전면 엄격 금지**합니다.
- OS/플랫폼(Windows, macOS, iOS, Android, Linux)마다 이모지 렌더링 모양, 색상, 세로 정렬(Vertical Alignment), 폰트 호환성이 제각각 달라 UI 일관성과 프리미엄 감성을 해치기 때문입니다.

## 2. 금지 대상
- UI 레이블, 버튼 텍스트, 카드 타이틀, 모달 헤더, 결과 안내 메시지(`setResultMessage` 등)
- 알림 토스트, 뱃지 텍스트, 콘솔 로그, 코드 내 주석

## 3. 대체 표준
- 시각적 포인트가 필요한 경우 **반드시 `lucide-react` 벡터 아이콘**을 컴포넌트로 임포트하여 사용합니다.
  - 예: 불꽃 ➔ `<Flame className="..." />`
  - 예: 방패/보호 ➔ `<Shield className="..." />`
  - 예: 트로피/왕관 ➔ `<Trophy className="..." />`, `<Crown className="..." />`
  - 예: 골드/코인 ➔ `<Coins className="..." />`
  - 예: 스파크/성공 ➔ `<Sparkles className="..." />`, `<CheckCircle2 className="..." />`
  - 예: 경고/파괴 ➔ `<AlertTriangle className="..." />`, `<XCircle className="..." />`
- 텍스트는 불필요한 장식 이모지 없이 정갈하고 명확한 한국어 표준 문장으로 작성합니다.
