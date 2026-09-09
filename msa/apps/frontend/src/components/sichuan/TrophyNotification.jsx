import React, { useEffect } from 'react';
import { Trophy, Award } from 'lucide-react';

const TrophyNotification = ({ trophy, onClose }) => {
    useEffect(() => {
        if (!trophy) return;
        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [trophy, onClose]);

    if (!trophy) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-auto pointer-events-none animate-in fade-in slide-in-from-top-8 duration-500">
            <div className="flex items-center gap-3.5 px-4 sm:px-5 py-3 rounded-2xl bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                {/* 트로피 배지 */}
                <div
                    className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                        backgroundColor: trophy.bgColor,
                        boxShadow: `0 0 15px ${trophy.borderColor}`
                    }}
                >
                    {trophy.grade === 'PLATINUM' ? (
                        <Trophy className="w-6 h-6 text-sky-400 drop-shadow-[0_0_8px_#38bdf8]" />
                    ) : trophy.grade === 'GOLD' ? (
                        <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_#facc15]" />
                    ) : trophy.grade === 'SILVER' ? (
                        <Award className="w-6 h-6 text-slate-200 drop-shadow-[0_0_8px_#cbd5e1]" />
                    ) : (
                        <Award className="w-6 h-6 text-amber-700 drop-shadow-[0_0_8px_#cd7f32]" />
                    )}
                </div>

                {/* 텍스트 내용 */}
                <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[10px] tracking-wider uppercase font-black text-secondary">
                        Trophy Unlocked
                    </span>
                    <span className="text-sm sm:text-base font-black tracking-tight truncate text-white" style={{ color: trophy.color }}>
                        {trophy.name}
                    </span>
                    <span className="text-xs text-slate-300 font-medium truncate">
                        {trophy.desc}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(TrophyNotification);
