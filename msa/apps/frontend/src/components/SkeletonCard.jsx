import React from 'react';

const SkeletonCard = () => {
    return (
        <div className="bg-glass backdrop-blur-md rounded-xl overflow-hidden border border-divider shadow-lg relative h-full flex flex-col">

            {/* 이미지 영역 뼈대 */}
            <div className="aspect-[3/4] bg-surface animate-pulse shrink-0" />

            {/* 텍스트 영역 뼈대 */}
            <div className="p-4 space-y-4 flex flex-col flex-1 bg-transparent">

                {/* 뱃지 영역 뼈대 */}
                <div className="flex gap-2">
                    <div className="h-4 bg-surface rounded animate-pulse w-1/3" />
                </div>

                {/* 제목 영역 뼈대 */}
                <div className="space-y-2 mt-4">
                    <div className="h-4 bg-surface rounded animate-pulse w-full" />
                    <div className="h-4 bg-surface rounded animate-pulse w-3/4" />
                </div>

                {/* 가격 정보 뼈대 (우측 하단 정렬) */}
                <div className="space-y-2 mt-auto pt-4 flex flex-col items-end">
                    <div className="h-3 bg-surface rounded animate-pulse w-1/3" />
                    <div className="flex justify-between items-end w-full">
                        <div className="h-6 bg-surface rounded animate-pulse w-1/2" />
                        <div className="h-4 bg-surface rounded animate-pulse w-8" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;