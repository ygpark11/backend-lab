import React from 'react';
import { Circle, Triangle, Square, X } from 'lucide-react';

const PSLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fadeIn">
            <div className="flex items-center gap-5">
                {/* 1. 세모 (Original Green) - 고유 컬러 유지 + 영롱한 그림자 추가 */}
                <div className="relative">
                    <Triangle className="w-8 h-8 text-[#00A39D] stroke-[3px] animate-[bounce_1s_infinite_-0.3s] drop-shadow-sm" />
                </div>

                {/* 2. 동그라미 (Original Red) */}
                <div className="relative">
                    <Circle className="w-8 h-8 text-[#FF3E3E] stroke-[3px] animate-[bounce_1s_infinite_-0.15s] drop-shadow-sm" />
                </div>

                {/* 3. 엑스 (Original Blue) */}
                <div className="relative">
                    <X className="w-8 h-8 text-[#4E6CBB] stroke-[4px] animate-[bounce_1s_infinite_0s] drop-shadow-sm" />
                </div>

                {/* 4. 네모 (Original Pink) */}
                <div className="relative">
                    <Square className="w-8 h-8 text-[#E8789C] stroke-[3px] animate-[bounce_1s_infinite_0.15s] drop-shadow-sm" />
                </div>
            </div>

            <p className="text-secondary font-bold tracking-[0.2em] text-sm animate-pulse">
                LOADING DATA...
            </p>
        </div>
    );
};

export default PSLoader;