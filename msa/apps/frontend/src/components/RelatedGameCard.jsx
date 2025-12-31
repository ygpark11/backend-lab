import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Timer } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export default function RelatedGameCard({ game }) {
    const navigate = useNavigate();

    // 메타스코어 85점 이상 & 할인율 50% 이상이면 '플래티넘 딜' 효과
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

    // 마감 임박 계산 (3일 이내)
    const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
    const isClosing = daysLeft >= 0 && daysLeft <= 3;

    const getDotColor = () => {
        if (game.discountRate >= 50)
            return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] ring-1 ring-green-400'; // 강한 초록빛
        if (game.discountRate >= 20)
            return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] ring-1 ring-yellow-300'; // 강한 노란빛
        if (game.discountRate > 0)
            return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'; // 파란빛
        return 'bg-gray-600 border border-gray-500'; // 꺼진 불
    };

    // 클릭 시 상세 페이지 이동 (화면 상단으로 스크롤 초기화 포함)
    const handleClick = () => {
        navigate(`/games/${game.id}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div
            onClick={handleClick}
            className={`relative group bg-ps-card rounded-xl overflow-hidden shadow-lg border cursor-pointer hover:-translate-y-1 transition-all duration-300
                ${isPlatinum ? 'border-yellow-400/40 shadow-yellow-500/10' : 'border-white/5 hover:border-white/20'}
            `}
        >
            {/* 이미지 영역 */}
            <div className="aspect-[16/9] overflow-hidden relative">
                <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                {game.discountRate > 0 && (
                    <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-md z-10">
                        -{game.discountRate}%
                    </span>
                )}

                {isPlatinum && <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-300 animate-pulse z-10" />}
                {isClosing && <Timer className="absolute top-2 left-2 w-4 h-4 text-red-500 animate-pulse z-10" />}
            </div>

            {/* 정보 영역 */}
            <div className="p-3">
                <div className="flex justify-between items-start mb-1 gap-2">
                    <h4 className="text-xs font-bold text-gray-200 line-clamp-1 group-hover:text-ps-blue transition-colors flex-1">
                        {game.name}
                    </h4>
                    {/* 신호등 Dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 transition-all duration-500 ${getDotColor()}`} title="할인 강도"></div>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        {game.discountRate > 0 && <p className="text-[10px] text-gray-500 line-through">{game.originalPrice?.toLocaleString()}</p>}
                        <p className="text-sm font-black text-white">{game.price?.toLocaleString()}원</p>
                    </div>
                    {game.metaScore > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${game.metaScore >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {game.metaScore}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}