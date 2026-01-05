import React, { useState, useEffect } from 'react';
import { Triangle, Circle, X, Square } from 'lucide-react';

const PSGameImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    // 1. 이미지 주소가 아예 없거나, 로딩 중 에러가 발생했을 때 보여줄 '기본 화면'
    if (!src || hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-[#1a1a1a] ${className}`}
                aria-label={alt || "Game image placeholder"}
                role="img"
            >
                <div className="grid grid-cols-2 gap-3 opacity-10">
                    <Triangle size={24} className="text-gray-100" />
                    <Circle size={24} className="text-gray-100" />
                    <X size={24} className="text-gray-100" />
                    <Square size={24} className="text-gray-100" />
                </div>
            </div>
        );
    }

    // 2. 정상적인 이미지 태그
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setHasError(true)} // 로딩 실패 시 에러 상태를 true로 변경
            loading="lazy"   // 스크롤 내려서 화면에 보일 때 로딩 (데이터 절약)
            decoding="async" // 이미지 디코딩을 백그라운드에서 수행 (렉 방지)
        />
    );
};

export default PSGameImage;