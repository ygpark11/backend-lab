import React, { useRef, useState, useEffect } from 'react';
import { Circle, Triangle, X, Square, Trophy, Flame } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import PSGameImage from './common/PSGameImage';
import client from '../api/client';

// 언어 태그 괄호 및 PS4/PS5 suffix 제거
function cleanTitle(title) {
    if (!title) return '';
    const langKeywords = ['한국어', '영어', '일본어', '중국어', '태국어', '독일어', '프랑스어', '스페인어'];
    const indices = langKeywords.map(k => title.indexOf(k)).filter(i => i !== -1);
    let cleaned = title;
    if (indices.length > 0) {
        const firstLangIdx = Math.min(...indices);
        const parenIdx = cleaned.lastIndexOf('(', firstLangIdx);
        if (parenIdx > 0) cleaned = cleaned.slice(0, parenIdx).trim();
    }
    return cleaned.replace(/\s+PS[45][™]?\s*(?:[&]\s*PS[45][™]?)?$/, '').trim();
}

const TrendingGamesWidget = () => {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const scrollRef = useRef(null);
    const dragRef = useRef({ moved: false });

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client.get('/api/v1/insights/trending?limit=10')
            .then(res => setGames(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // PC 마우스 드래그 가로 스크롤
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
    }, [games]);

    if (!loading && games.length === 0) return null;

    return (
        <section className="mb-10">
            {/* 섹션 헤더 */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-yellow-500/30" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-primary tracking-tight">트렌딩 핫딜</h2>
                            <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full tracking-widest uppercase">
                                TOP 10
                            </span>
                        </div>
                    </div>
                </div>
                <span className="text-xs text-secondary font-medium hidden sm:block">유저들이 가장 많이 찜한 실시간 인기작</span>
            </div>

            {/* 시네마틱 가로 스크롤 카드 리스트 */}
            {loading ? (
                <div className="flex gap-4 overflow-hidden py-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="shrink-0 w-[280px] sm:w-[340px] md:w-[380px] aspect-[16/9] rounded-2xl bg-surface border border-divider overflow-hidden relative shadow-md">
                            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent" />
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-1 px-0.5 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    onDragStart={(e) => e.preventDefault()}
                >
                    {games.map((game) => {
                        const rankBadgeColor =
                            game.rank === 1 ? 'bg-amber-400 text-black shadow-amber-400/40 border-amber-300' :
                            game.rank === 2 ? 'bg-slate-300 text-black shadow-slate-400/40 border-slate-200' :
                            game.rank === 3 ? 'bg-amber-600 text-white shadow-amber-600/40 border-amber-500' :
                            'bg-black/60 backdrop-blur-md text-white/90 border-white/20';

                        return (
                            <button
                                key={game.id}
                                onClick={() => {
                                    if (dragRef.current.moved) return;
                                    navigate(`/games/${game.id}`, { state: { background: location } });
                                }}
                                className="group relative shrink-0 snap-start w-[280px] sm:w-[340px] md:w-[380px] aspect-[16/9] rounded-2xl overflow-hidden border border-divider bg-surface hover:border-ps-blue/60 shadow-lg hover:shadow-[0_8px_30px_rgba(0,112,209,0.15)] transition-all duration-300 active:scale-[0.98] text-left"
                            >
                                {/* 배경 이미지 */}
                                <PSGameImage
                                    src={game.imageUrl}
                                    alt={cleanTitle(game.title)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    width={640}
                                />

                                {/* 다크 그라디언트 오버레이 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                                {/* 상단 랭킹 배지 */}
                                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight flex items-center gap-1 shadow-md border ${rankBadgeColor}`}>
                                        {game.rank <= 3 && <Trophy className="w-3 h-3 shrink-0" />}
                                        <span>#{game.rank}</span>
                                    </div>
                                </div>

                                {/* 하단 게임 정보 */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex flex-col justify-end">
                                    <h3 className="text-sm sm:text-base font-black text-white line-clamp-1 mb-2 drop-shadow-md group-hover:text-primary-fixed transition-colors">
                                        {cleanTitle(game.title)}
                                    </h3>

                                    <div className="flex items-center justify-between gap-2">
                                        {/* 가격 진단 심볼 & 칩 */}
                                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-sm">
                                            {game.priceVerdict === 'BUY_NOW' && (
                                                <div className="flex items-center gap-1.5 text-green-400">
                                                    <Circle className="w-3.5 h-3.5 fill-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                                    <span className="text-[11px] font-black tracking-wide">역대최저가</span>
                                                </div>
                                            )}
                                            {game.priceVerdict === 'GOOD_OFFER' && (
                                                <div className="flex items-center gap-1.5 text-yellow-400">
                                                    <Triangle className="w-3.5 h-3.5 fill-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                                                    <span className="text-[11px] font-black tracking-wide">추천할인</span>
                                                </div>
                                            )}
                                            {game.priceVerdict === 'WAIT' && (
                                                <div className="flex items-center gap-1.5 text-red-400">
                                                    <X className="w-3.5 h-3.5 stroke-[3] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                                    <span className="text-[11px] font-black tracking-wide">보류</span>
                                                </div>
                                            )}
                                            {(game.priceVerdict === 'TRACKING' || !game.priceVerdict) && (
                                                <div className="flex items-center gap-1.5 text-blue-400">
                                                    <Square className="w-3.5 h-3.5 fill-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                                    <span className="text-[11px] font-black tracking-wide">추적중</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 가격 */}
                                        {game.currentPrice > 0 ? (
                                            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                                <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                                                    ₩{game.currentPrice.toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                                <span className="text-xs font-black text-white/80">무료</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default TrendingGamesWidget;
