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
        <div className="mb-8">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
                    <h2 className="text-sm font-black text-primary tracking-tight">지갑 수호대 픽</h2>
                    <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full tracking-widest">
                        TOP 10
                    </span>
                </div>
                <span className="text-[10px] text-muted font-bold hidden sm:block">가장 많이 찜한 게임</span>
            </div>

            {/* 시네마틱 가로 스크롤 */}
            {loading ? (
                <div className="flex gap-3 overflow-hidden">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="shrink-0 w-[220px] sm:w-[280px] h-[160px] sm:h-[200px] rounded-xl bg-surface border border-divider overflow-hidden relative">
                            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent" />
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
                            className="group shrink-0 snap-center w-[220px] sm:w-[280px] md:w-[320px] rounded-xl overflow-hidden relative border border-divider bg-surface active:scale-95 transition-transform"
                        >
                            {/* 배너 이미지 */}
                            <div className="relative w-full h-[160px] sm:h-[200px] overflow-hidden">
                                <PSGameImage
                                    src={game.imageUrl}
                                    alt={game.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    width={640}
                                />
                                {/* 그래디언트 오버레이 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                {/* 등수 배지 */}
                                <div className="absolute top-0 left-0 px-2 py-1 rounded-br-xl backdrop-blur-md border-b border-r bg-black/40 border-white/10 z-10">
                                    <span className={`text-[11px] font-black tracking-tight ${
                                        game.rank === 1 ? 'text-yellow-400' :
                                        game.rank === 2 ? 'text-gray-300' :
                                        game.rank === 3 ? 'text-amber-500' :
                                        'text-white/70'}`}
                                    >
                                        {game.rank}위
                                    </span>
                                </div>

                                {/* 하단 정보: 타이틀 + verdict + 가격 */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                                    <p className="text-xs font-bold text-white/90 line-clamp-1 mb-2 text-left break-keep">{game.title}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                            {game.priceVerdict === 'BUY_NOW'    && <Circle   className="w-4 h-4 text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.9)]" />}
                                            {game.priceVerdict === 'GOOD_OFFER' && <Triangle className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.9)]" />}
                                            {game.priceVerdict === 'WAIT'       && <X        className="w-4 h-4 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />}
                                            {(game.priceVerdict === 'TRACKING' || !game.priceVerdict) && <Square className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.9)]" />}
                                            {game.currentPrice > 0 && (
                                                <span className="text-xs font-black text-white">
                                                    ₩{game.currentPrice.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrendingGamesWidget;
