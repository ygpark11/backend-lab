import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Timer, Circle, Triangle, Square, X } from 'lucide-react'; // 👈 도형 아이콘 추가
import { differenceInCalendarDays, parseISO } from 'date-fns';
import PSGameImage from "./common/PSGameImage.jsx";

export default function RelatedGameCard({ game }) {
    const navigate = useNavigate();

    // IGDB스코어 85점 이상 & 할인율 50% 이상이면 '플래티넘 딜' 효과
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

    // 마감 임박 계산 (3일 이내)
    const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
    const isClosing = daysLeft >= 0 && daysLeft <= 3;

    // 단순 색상 점 대신 -> PS 도형 아이콘(Mini-Shape) 리턴
    const renderSignalIcon = () => {
        // 1. 대박 할인 (50%+) -> 초록 동그라미 (O) = BUY NOW
        if (game.discountRate >= 50) {
            return <Circle className="w-3 h-3 text-green-500 fill-green-500 animate-pulse" />;
        }
        // 2. 평타 할인 (20%+) -> 노랑 세모 (△) = GOOD OFFER
        if (game.discountRate >= 20) {
            return <Triangle className="w-3 h-3 text-yellow-400 fill-yellow-400" />;
        }
        // 3. 짤짤이 할인 -> 파란 네모 (□) = TRACKING/INFO
        if (game.discountRate > 0) {
            return <Square className="w-3 h-3 text-blue-500 fill-blue-500" />;
        }
        // 4. 정가/할인없음 -> 회색 엑스 (X) = WAIT (여기선 빨강 대신 회색으로 은은하게)
        return <X className="w-3 h-3 text-gray-500" />;
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
                <PSGameImage
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

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

                    <div className="shrink-0 mt-0.5" title="할인 강도">
                        {renderSignalIcon()}
                    </div>
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