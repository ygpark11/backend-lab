// 첫 화면 이후 브라우저 유휴 시간에 주요 화면 코드를 미리 받아, 메뉴 첫 이동 시 지연을 없앰
// App.jsx의 lazyWithReload(() => import(...))와 같은 모듈을 가리켜야 같은 청크가 재사용됨
const MAIN_ROUTE_IMPORTS = [
    () => import('../pages/GameDetailPage'),
    () => import('../pages/CurationPage'),
    () => import('../pages/PioneerCandidatesPage'),
    () => import('../pages/InsightsPage'),
    () => import('../pages/ArcadePage'),
    () => import('../pages/PsPlusPricingPage'),
    () => import('../pages/MonthlyGamesArchivePage'),
];

// 데이터 절약 모드이거나 2G급 회선이면 미리 받지 않음
const shouldSkipPrefetch = () => {
    const connection = navigator.connection;
    if (!connection) return false;
    return connection.saveData === true || /(^|-)2g$/.test(connection.effectiveType || '');
};

// 첫 화면의 API·이미지 요청과 회선을 다투지 않도록 페이지 load 이후 + 2초 뒤 유휴 시간에 시작
const START_DELAY_MS = 2000;

export const prefetchMainRoutes = () => {
    if (shouldSkipPrefetch()) return () => {};
    let timer = null;
    let idleId = null;
    const run = () => MAIN_ROUTE_IMPORTS.forEach(load => load().catch(() => {}));
    const schedule = () => {
        timer = setTimeout(() => {
            if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(run, { timeout: 5000 });
            else run();
        }, START_DELAY_MS);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
        window.removeEventListener('load', schedule);
        if (timer) clearTimeout(timer);
        if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
    };
};
