import React from 'react';

const SkeletonCard = () => {
    return (
        <div className="bg-ps-card rounded-lg overflow-hidden border border-white/5 shadow-lg relative">
            {/* 이미지 영역 뼈대 */}
            <div className="aspect-[3/4] bg-gray-700/30 animate-pulse" />

            {/* 텍스트 영역 뼈대 */}
            <div className="p-4 space-y-4">
                {/* 제목 */}
                <div className="h-4 bg-gray-700/30 rounded animate-pulse w-3/4" />

                {/* 가격 정보 */}
                <div className="space-y-2 pt-2">
                    <div className="h-3 bg-gray-700/30 rounded animate-pulse w-1/2 ml-auto" />
                    <div className="h-6 bg-gray-700/30 rounded animate-pulse w-full" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;