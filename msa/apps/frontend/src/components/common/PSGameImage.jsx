import React, { useState, useEffect, useRef } from 'react';
import { Triangle, Circle, X, Square } from 'lucide-react';

const PSGameImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null); // 🚀 1. useRef 추가

    useEffect(() => {
        setHasError(false);
        setIsLoaded(false);
    }, [src]);

    useEffect(() => {
        if (imgRef.current && imgRef.current.complete) {
            setIsLoaded(true);
        }
    }, []);

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
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
            decoding="async"
        />
    );
};

export default PSGameImage;