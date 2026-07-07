import React, { useState, useEffect, useRef } from 'react';
import { Triangle, Circle, X, Square } from 'lucide-react';

const PSGameImage = ({ src, alt, className, priority = false }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        setHasError(false);
        // complete + naturalWidth > 0 으로 에러 완료(깨진 이미지)와 정상 완료를 구분
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setIsLoaded(true);
        } else {
            setIsLoaded(false);
        }
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
                // 부모 컨테이너(relative 또는 absolute 포지션)에 절대 위치로 채움
                <div className="absolute inset-0 bg-surface overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent" />
                </div>
            )}
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
