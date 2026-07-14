import React, { useState, useRef, useEffect } from 'react';
import { Triangle, Circle, X, Square } from 'lucide-react';

const PSGameImage = ({ src, alt, className, priority = false }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);
    const imgRef = useRef(null);

    // src 변경 시 렌더 중에 바로 초기화 (cascading render 없음)
    if (currentSrc !== src) {
        setCurrentSrc(src);
        setHasError(false);
        setIsLoaded(false);
    }

    useEffect(() => {
        const node = imgRef.current;
        if (!node?.complete || node.naturalWidth === 0) return;
        // useEffect는 브라우저 페인트 후 실행 → opacity:0 프레임이 이미 그려진 상태
        // rAF로 다음 프레임에 setState → CSS transition(0→1)이 정상 동작
        const id = requestAnimationFrame(() => setIsLoaded(true));
        return () => cancelAnimationFrame(id);
    }, [src]);

    if (!src || hasError) {
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
                src={src}
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
