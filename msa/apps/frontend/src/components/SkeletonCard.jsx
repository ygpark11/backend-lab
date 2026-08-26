import React from 'react';

const SkeletonCard = () => {
    return (
        <div className="relative flex flex-col rounded-2xl overflow-hidden bg-glass backdrop-blur-xl border border-divider shadow-md h-full transform-gpu">
            {/* 3:4 포스터 썸네일 영역 */}
            <div className="aspect-[3/4] bg-surface/80 animate-pulse relative shrink-0">
                {/* 상단 좌측 배지 자리 */}
                <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 w-12 h-5 bg-surface rounded-full animate-pulse" />
                {/* 상단 우측 평점 배지 자리 */}
                <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-10 h-5 bg-surface rounded-lg animate-pulse" />
            </div>

            {/* 카드 하단 정보 영역 */}
            <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between bg-transparent">
                <div>
                    {/* 태그 영역 */}
                    <div className="flex gap-1 mb-1.5 sm:mb-2 min-h-[20px]">
                        <div className="w-14 h-4 bg-surface rounded animate-pulse" />
                    </div>

                    {/* 제목 영역 (2줄) */}
                    <div className="space-y-1.5 mb-2">
                        <div className="h-3.5 bg-surface rounded animate-pulse w-full" />
                        <div className="h-3.5 bg-surface rounded animate-pulse w-2/3" />
                    </div>
                </div>

                {/* 하단 가격 & 심볼 자리 */}
                <div className="pt-2 border-t border-divider/40 flex items-end justify-between gap-1.5 mt-2">
                    {/* PS 심볼 자리 */}
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface animate-pulse shrink-0" />

                    {/* 가격 정보 */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="w-12 h-3 bg-surface rounded animate-pulse" />
                        <div className="w-16 h-5 bg-surface rounded animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
