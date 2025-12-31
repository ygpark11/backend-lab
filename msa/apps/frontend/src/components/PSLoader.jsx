import React from 'react';
import {Circle, Square, Triangle, X} from 'lucide-react';

const PSLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fadeIn">
            <div className="flex items-center gap-5">
                {/* 1. 세모 (Original Green) */}
                <div className="relative group">
                    <Triangle className="absolute inset-0 w-8 h-8 text-[#00A39D] stroke-[3px] animate-[bounce_1s_infinite_-0.3s]" />
                </div>

                {/* 2. 동그라미 (Original Red) */}
                <div className="relative">
                    <Circle className="w-8 h-8 text-[#FF3E3E] stroke-[3px] animate-[bounce_1s_infinite_-0.15s]" />
                </div>

                {/* 3. 엑스 (Original Blue) */}
                <div className="relative">
                    <X className="w-8 h-8 text-[#4E6CBB] stroke-[4px] animate-[bounce_1s_infinite_0s]" />
                </div>

                {/* 4. 네모 (Original Pink) */}
                <div className="relative">
                    <Square className="w-8 h-8 text-[#E8789C] stroke-[3px] animate-[bounce_1s_infinite_0.15s]" />
                </div>
            </div>

            <p className="text-gray-500 font-bold tracking-[0.2em] text-sm animate-pulse">
                LOADING DATA...
            </p>
        </div>
    );
};

export default PSLoader;