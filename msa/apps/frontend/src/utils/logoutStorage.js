// 로그아웃 시 브라우저 저장값 정리.
// 기기 설정(테마·효과음)과 개인 정보가 아닌 화면 상태는 남기고, 최근 본 게임 등 사용 기록은 지워 공용 PC에서 다음 사용자에게 보이지 않게 함
const KEEP_KEYS = ['ps-theme', 'ps-game-muted', 'psPlusBannerDismissedDate', 'ps_last_notice_id'];

export const clearStorageOnLogout = () => {
    try {
        const kept = KEEP_KEYS
            .map(key => [key, localStorage.getItem(key)])
            .filter(([, value]) => value !== null);
        localStorage.clear();
        kept.forEach(([key, value]) => localStorage.setItem(key, value));
    } catch {
        // 저장소 접근이 막힌 환경(시크릿 모드 등)에서도 로그아웃 이동은 계속 진행
    }
};
