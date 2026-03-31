import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { Sparkles, Timer, Circle, Triangle, Square, X } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import PSGameImage from "./common/PSGameImage.jsx";

export default function RelatedGameCard({ game }) {
    const navigate = useTransitionNavigate();
    const location = useLocation();

    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
    const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
    const isClosing = daysLeft >= 0 && daysLeft <= 3;

    const renderSignalIcon = () => {
        if (game.discountRate >= 50) {
            return <Circle className="w-3 h-3 text-green-600 dark:text-green-500 fill-green-600 dark:fill-green-500 animate-pulse" />;
        }
        if (game.discountRate >= 20) {
            return <Triangle className="w-3 h-3 text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" />;
        }
        if (game.discountRate > 0) {
            return <Square className="w-3 h-3 text-blue-600 dark:text-blue-500 fill-blue-600 dark:fill-blue-500" />;
        }
        return <X className="w-3 h-3 text-secondary" />;
    };

    const handleClick = () => {
        navigate(`/games/${game.id}`, { replace: true, state: location.state || { background: location } });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div
            onClick={handleClick}
            className={`relative group bg-surface rounded-xl overflow-hidden shadow-md border cursor-pointer hover:-translate-y-1 transition-all duration-300
                ${isPlatinum ? 'border-yellow-400/40 shadow-yellow-500/10' : 'border-divider hover:border-ps-blue/50'}
            `}
        >
            <div
                className="aspect-[16/9] overflow-hidden relative"
                style={{ viewTransitionName: `game-poster-${game.id}` }}
            >
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

                {isPlatinum && <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-400 animate-pulse z-10" />}
                {isClosing && <Timer className="absolute top-2 left-2 w-4 h-4 text-red-500 animate-pulse z-10" />}
            </div>

            <div className="p-3 flex flex-col flex-1 bg-transparent relative z-20">
                <div className="flex justify-between items-start mb-1 gap-2">
                    <h4 className="text-xs font-bold text-primary line-clamp-1 group-hover:text-ps-blue transition-colors flex-1">
                        {game.name}
                    </h4>

                    <div className="shrink-0 mt-0.5" title="할인 강도">
                        {renderSignalIcon()}
                    </div>
                </div>

                <div className="flex justify-between items-end mt-auto pt-2">
                    <div>
                        {game.discountRate > 0 && <p className="text-[10px] text-secondary line-through">{game.originalPrice?.toLocaleString()}</p>}
                        <p className="text-sm font-black text-primary">{game.price?.toLocaleString()}원</p>
                    </div>
                    {game.metaScore > 0 && (
                        <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border ${game.metaScore >= 80 ? 'bg-score-green-bg text-score-green-text border-green-500/30' : 'bg-score-yellow-bg text-score-yellow-text border-yellow-500/30'}`}>
                            {game.metaScore}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}