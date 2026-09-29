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

const PSGameImage = ({ src, alt, className = '', priority = false, width }) => {
    const optimizedSrc = getOptimizedSrc(src, width);

    const [currentSrc, setCurrentSrc] = useState(optimizedSrc);
    const [prevSrc, setPrevSrc] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);

    // src 변경 시 렌더 중에 바로 초기화 (React 공식: adjusting state during rendering, cascading render 방지)
    if (optimizedSrc && optimizedSrc !== currentSrc) {
        setPrevSrc(currentSrc);
        setCurrentSrc(optimizedSrc);
        setIsLoaded(false);
        setHasError(false);
    }

    // 브라우저 캐시 이미지 처리: 이미 complete 상태면 다음 프레임에서 즉시 표시
    useEffect(() => {
        const node = imgRef.current;
        if (node?.complete && node.naturalWidth > 0) {
            const id = requestAnimationFrame(() => {
                setIsLoaded(true);
                setPrevSrc(null);
            });
            return () => cancelAnimationFrame(id);
        }
    }, [currentSrc]);

    if (!optimizedSrc || hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-surface border border-divider ${className}`}
                aria-label={alt || "Game image placeholder"}
                role="img"
            >
                <div className="grid grid-cols-2 gap-3 opacity-30">
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
            {/* 1. 로딩 대기 플레이스홀더 (시커먼 빈 화면 방지: 은은한 PS 4대 심볼 모노톤 워터마크) */}
            {!isLoaded && !prevSrc && (
                <div className={`absolute inset-0 flex items-center justify-center bg-surface/80 border border-divider/40 pointer-events-none ${className}`}>
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 opacity-15">
                        <Triangle size={18} className="text-muted" />
                        <Circle size={18} className="text-muted" />
                        <X size={18} className="text-muted" />
                        <Square size={18} className="text-muted" />
                    </div>
                </div>
            )}

            {/* 2. 이전 이미지: 새 이미지가 로드될 때까지 100% 그대로 화면을 지켜줌 */}
            {prevSrc && !isLoaded && (
                <img
                    src={prevSrc}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${className}`}
                    aria-hidden="true"
                />
            )}

            {/* 3. 새 이미지: 준비되는 순간 부드럽게 300ms 페이드인으로 위를 덮음 */}
            <img
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                className={className}
                style={{
                    opacity: isLoaded ? undefined : 0,
                    transition: 'opacity 300ms ease-out',
                }}
                onLoad={() => {
                    setIsLoaded(true);
                    setPrevSrc(null);
                }}
                onError={() => setHasError(true)}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
            />
        </>
    );
};

export default PSGameImage;
