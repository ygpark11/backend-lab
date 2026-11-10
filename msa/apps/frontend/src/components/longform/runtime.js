// 롱폼 런타임 — 에셋 준비, 재생 시계, 파이프라인용 window.__LF 계약을 담당한다.
//
// [렌더 모드] ?render=1
//   - 시계가 자동으로 흐르지 않는다. 파이프라인이 window.__LF.seek(t) 후 스크린샷을 찍는다.
//   - window.__LF.ready (Promise) / isReady: 이미지·폰트 디코딩 완료 여부
//   - window.__LF.manifest: 씬 목록·시작/끝 시각·사실값(facts)·효과음 큐(cues)
// [미리보기 모드] 기본
//   - 에셋 준비 후 실시간으로 1회 재생하고 마지막 프레임에서 멈춘다. ?t=12.5 로 특정 시각 고정 가능
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { getOptimizedSrc } from '../../utils/imageUtils';

export const LF_CONTRACT_VERSION = 1;
export const FONT_FAMILY = "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

// 동적 서브셋은 글리프를 쓰는 순간 내려받아 프레임마다 글꼴이 달라질 수 있으므로 단일 파일 버전을 쓴다
const FONT_CSS = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css';
const FONT_LINK_ID = 'lf-pretendard';

export const posterSrc = (url) => getOptimizedSrc(url, 1280);
export const backdropSrc = (url) => getOptimizedSrc(url, 480);

function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
}

async function loadFont() {
    if (!document.getElementById(FONT_LINK_ID)) {
        const link = document.createElement('link');
        link.id = FONT_LINK_ID;
        link.rel = 'stylesheet';
        link.href = FONT_CSS;
        document.head.appendChild(link);
        await withTimeout(new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; }), 8000);
    }
    await withTimeout(Promise.all([
        document.fonts.load("900 64px 'Pretendard Variable'", '가A0'),
        document.fonts.load("500 32px 'Pretendard Variable'", '가A0'),
    ]).catch(() => {}), 8000);
    await document.fonts.ready;
}

async function loadImage(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
    try {
        await withTimeout(img.decode(), 15000);
    } catch {
        // 이미지가 실패해도 렌더는 계속 (배경 그라데이션으로 대체됨)
    }
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/**
 * @param {{ manifest: object, total: number, imageUrls: string[], renderMode: boolean, freezeAt: number|null }} opts
 * @returns {{ t: number, ready: boolean }}
 */
export function useLongformRuntime({ manifest, total, imageUrls, renderMode, freezeAt }) {
    const [t, setT] = useState(freezeAt ?? 0);
    const [ready, setReady] = useState(false);
    const rafRef = useRef(null);

    const imageKey = imageUrls.join('|');
    const readyPromise = useMemo(
        () => Promise.all([
            loadFont(),
            ...imageUrls.flatMap((url) => [loadImage(posterSrc(url)), loadImage(backdropSrc(url))]),
        ]).then(nextFrame),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [imageKey],
    );

    // 파이프라인 계약 객체
    useEffect(() => {
        const api = {
            version: LF_CONTRACT_VERSION,
            isReady: false,
            manifest,
            ready: readyPromise.then(() => manifest),
            seek: (time) => {
                flushSync(() => setT(Math.max(0, Math.min(total, Number(time) || 0))));
                return nextFrame();
            },
        };
        window.__LF = api;
        readyPromise.then(() => {
            api.isReady = true;
            setReady(true);
        });
        return () => {
            if (window.__LF === api) delete window.__LF;
        };
    }, [manifest, readyPromise, total]);

    // 미리보기: 준비되면 실시간 재생 (렌더 모드/고정 시각이면 재생하지 않음)
    useEffect(() => {
        if (!ready || renderMode || freezeAt != null) return undefined;
        const t0 = performance.now();
        const tick = (now) => {
            const time = Math.min(total, (now - t0) / 1000);
            setT(time);
            if (time < total) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [ready, renderMode, freezeAt, total]);

    return { t, ready };
}

/**
 * 1920x1080 스테이지를 현재 창 크기에 맞게 축소/확대하는 배율.
 * 사이트 전역의 `html { scrollbar-gutter: stable }` 때문에 스크롤바를 숨겨도 오른쪽 15px이 예약되므로
 * 마운트 동안 문서 스크롤과 거터를 끈다 (언마운트 시 원복).
 */
export function useStageScale(width, height) {
    const get = () => Math.min(document.documentElement.clientWidth / width, document.documentElement.clientHeight / height);
    const [scale, setScale] = useState(get);
    useEffect(() => {
        const html = document.documentElement;
        const prevHtml = html.style.overflow;
        const prevGutter = html.style.scrollbarGutter;
        const prevBody = document.body.style.overflow;
        html.style.overflow = 'hidden';
        html.style.scrollbarGutter = 'auto';
        document.body.style.overflow = 'hidden';
        const onResize = () => setScale(get());
        onResize();
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            html.style.overflow = prevHtml;
            html.style.scrollbarGutter = prevGutter;
            document.body.style.overflow = prevBody;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);
    return scale;
}
