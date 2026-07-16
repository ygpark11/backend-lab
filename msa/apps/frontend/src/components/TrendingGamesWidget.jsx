import React, { useRef, useState, useEffect } from 'react';
import { Circle, Triangle, X, Square, Trophy } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import PSGameImage from './common/PSGameImage';
import client from '../api/client';

const TrendingGamesWidget = () => {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const scrollRef = useRef(null);
    // moved 상태만 ref로 관리 (effect 클로저 ↔ 버튼 onClick 공유)
    const dragRef = useRef({ moved: false });

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client.get('/api/v1/insights/trending?limit=10')
            .then(res => setGames(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // PC 마우스 드래그 — document 레벨로 처리해 setPointerCapture 없이도 안정적 동작
    // 모바일 터치 스크롤은 브라우저 기본 처리에 위임 (click도 정상 발생)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let active = false;
        let startX = 0;
        let scrollLeftStart = 0;

        const onMouseMove = (e) => {
            if (!active) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 5) dragRef.current.moved = true;
            el.scrollLeft = scrollLeftStart - dx;
        };

        const onMouseUp = () => {
            active = false;
            el.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onMouseDown = (e) => {
            if (e.button !== 0) return;
            active = true;
            startX = e.clientX;
            scrollLeftStart = el.scrollLeft;
            dragRef.current.moved = false;
            el.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [games]); // games 로드 후 scroll div가 DOM에 생기므로 의존성 필요

    if (!loading && games.length === 0) return null;

    return (
        <div className="mb-8 bg-glass backdrop-blur-md border border-divider rounded-xl p-4 shadow-lg">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" />
                    <h2 className="text-sm font-black text-primary tracking-tight">지갑 수호대 픽</h2>
                    <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full tracking-widest shadow-[0_0_6px_rgba(250,204,21,0.15)]">
                        TOP 10
                    </span>
                </div>
                <span className="text-[10px] text-muted font-bold hidden sm:block">가장 많이 찜한 게임</span>
            </div>

            {/* 가로 스크롤 */}
            {loading ? (
                <div className="flex gap-3 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="shrink-0 w-[100px] sm:w-[120px] flex flex-col gap-1.5 p-2 rounded-xl bg-surface border border-divider">
                            <div className="relative w-full aspect-[3/4] rounded-lg bg-surface-hover overflow-hidden">
                                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent" />
                            </div>
                            <div className="h-3 rounded bg-surface-hover w-3/4 mx-auto" />
                            <div className="h-2.5 rounded bg-surface-hover w-1/2 mx-auto" />
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    onDragStart={(e) => e.preventDefault()}
                >
                    {games.map((game) => (
                        <button
                            key={game.id}
                            onClick={() => {
                                if (dragRef.current.moved) return;
                                navigate(`/games/${game.id}`, { state: { background: location } });
                            }}
                            className="shrink-0 snap-center w-[100px] sm:w-[120px] flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface border border-divider hover:border-ps-blue/50 hover:bg-surface-hover transition-all active:scale-95"
                        >
                            {/* 이미지 + 등수 배지 */}
                            <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden">
                                <PSGameImage
                                    src={game.imageUrl}
                                    alt={game.title}
                                    className="w-full h-full object-cover"
                                    width={640}
                                />
                                <div className="absolute top-0 left-0 z-20 px-1.5 py-0.5 rounded-br-lg backdrop-blur-md border-b border-r bg-glass border-divider">
                                    <span className={`text-[10px] font-black tracking-tight ${
                                        game.rank === 1 ? 'text-yellow-400' :
                                        game.rank === 2 ? 'text-gray-400' :
                                        game.rank === 3 ? 'text-amber-500' :
                                        'text-secondary'}`}
                                    >
                                        {game.rank}위
                                    </span>
                                </div>
                            </div>

                            {/* 타이틀 */}
                            <p className="text-xs font-bold text-primary line-clamp-2 w-full text-center leading-snug break-keep">{game.title}</p>

                            {/* priceVerdict + 가격 */}
                            <div className="flex items-center gap-1">
                                {game.priceVerdict === 'BUY_NOW'    && <Circle   className="w-3 h-3 text-green-500 fill-green-500" />}
                                {game.priceVerdict === 'GOOD_OFFER' && <Triangle className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                                {game.priceVerdict === 'WAIT'       && <X        className="w-3 h-3 text-red-500" />}
                                {(game.priceVerdict === 'TRACKING' || !game.priceVerdict) && <Square className="w-3 h-3 text-ps-blue" />}
                                {game.currentPrice > 0 && (
                                    <span className="text-[10px] font-bold text-secondary">
                                        ₩{game.currentPrice.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrendingGamesWidget;
