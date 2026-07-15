import React, { useState, useRef, useEffect } from 'react';
import { Triangle, Circle, X, Square } from 'lucide-react';

// PS Store CDN은 ?w= 파라미터로 리사이징 지원
const getOptimizedSrc = (src, width) => {
    if (!src || !width) return src;
    try {
        const url = new URL(src);
        if (url.hostname === 'image.api.playstation.com') {
            url.searchParams.set('w', String(width));
            return url.toString();
        }
    } catch {
        // 유효하지 않은 URL은 원본 반환
    }
    return src;
};

const PSGameImage = ({ src, alt, className, priority = false, width }) => {
    const optimizedSrc = getOptimizedSrc(src, width);

    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(priority); // priority 이미지는 즉시 로드
    const [currentSrc, setCurrentSrc] = useState(optimizedSrc);
    const imgRef = useRef(null);

    // src 변경 시 렌더 중에 바로 초기화 (cascading render 없음)
    if (currentSrc !== optimizedSrc) {
        setCurrentSrc(optimizedSrc);
        setHasError(false);
        setIsLoaded(false);
        if (!priority) setShouldLoad(false);
    }

    // 뷰포트 500px 전부터 src 주입 → 미리 다운로드 시작
    // IntersectionObserver 콜백 내 setState는 외부 시스템 구독 패턴 → ESLint OK
    useEffect(() => {
        if (shouldLoad || !optimizedSrc) return;
        const node = imgRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setShouldLoad(true);
            },
            { rootMargin: '500px 0px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [optimizedSrc, shouldLoad]);

    // 캐시된 이미지: useEffect(paint 후) + rAF(다음 프레임) → fade-in 정상 동작
    useEffect(() => {
        if (!shouldLoad) return;
        const node = imgRef.current;
        if (!node?.complete || node.naturalWidth === 0) return;
        const id = requestAnimationFrame(() => setIsLoaded(true));
        return () => cancelAnimationFrame(id);
    }, [shouldLoad, optimizedSrc]);

    if (!optimizedSrc || hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-surface border border-divider ${className}`}
                aria-label={alt || "Game image placeholder"}
                role="img"
            >
                <div className="grid grid-cols-2 gap-3 opacity-30 animate-pulse-slow">
                    <Triangle size={24} className="text-muted" />
                    <Circle size={24} className="text-muted" />
                    <X size={24} className="text-muted" />
                    <Square size={24} className="text-muted" />
                </div>
            </div>
        );
    }

    return (
        <>
            {!isLoaded && (
                <div className="absolute inset-0 bg-surface overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent" />
                </div>
            )}
            <img
                ref={imgRef}
                src={shouldLoad ? optimizedSrc : undefined}
                alt={alt}
                className={className}
                style={{ opacity: isLoaded ? undefined : 0, transition: 'opacity 600ms ease' }}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
            />
        </>
    );
};

export default PSGameImage;
