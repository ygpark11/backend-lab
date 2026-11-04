import { lazy } from 'react';

const RELOAD_FLAG = 'ps-chunk-reloaded';

// 라우트 단위 코드 분할용 React.lazy 래퍼.
// 새 배포로 이전 해시의 청크 파일이 사라진 상태에서 열려 있던 탭이 페이지를 이동하면
// import가 실패하므로, 최신 index.html을 받도록 1회만 새로고침한다 (무한 새로고침 방지).
export const lazyWithReload = (importer) => lazy(async () => {
    try {
        const module = await importer();
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* 저장소 접근 불가 시 무시 */ }
        return module;
    } catch (error) {
        let alreadyReloaded = false;
        try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* 무시 */ }
        if (!alreadyReloaded) {
            try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* 무시 */ }
            window.location.reload();
            return new Promise(() => {});
        }
        throw error;
    }
});
