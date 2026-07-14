import React, { useState, useCallback } from 'react';
import { Triangle, Circle, X, Square } from 'lucide-react';

const PSGameImage = ({ src, alt, className, priority = false }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);

    // src 변경 시 렌더 중에 바로 초기화
    if (currentSrc !== src) {
        setCurrentSrc(src);
        setHasError(false);
        setIsLoaded(false);
    }

    // ref 콜백: DOM에 img가 붙는 시점(커밋 단계)에 캐시된 이미지 즉시 감지
    // src가 바뀌면 콜백이 새 함수로 교체되어 자동으로 재실행됨
    const imgRef = useCallback((node) => {
        if (node?.complete && node.naturalWidth > 0) {
            setIsLoaded(true);
        }
    }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

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
