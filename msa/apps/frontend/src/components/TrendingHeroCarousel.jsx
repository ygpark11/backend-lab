import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    ChevronLeft, 
    ChevronRight, 
    Trophy, 
    Flame, 
    Circle, 
    Triangle, 
    X, 
    Square, 
    Pause, 
    Play,
    Sparkles 
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import PSGameImage from './common/PSGameImage';
import client from '../api/client';

// 언어 태그 괄호 및 PS4/PS5 suffix 정제 함수
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

const AUTOPLAY_INTERVAL = 4500; // 4.5초 슬라이드 인터벌

const TrendingHeroCarousel = () => {
    const navigate = useTransitionNavigate();
    const location = useLocation();

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isCardHovered, setIsCardHovered] = useState(false);
    const [isInView, setIsInView] = useState(true);
    const [isTabVisible, setIsTabVisible] = useState(true);
    const [cycleKey, setCycleKey] = useState(0);

    const containerRef = useRef(null);
    const dragStartXRef = useRef(0);
    const dragCurrentXRef = useRef(0);
    const isDraggingRef = useRef(false);
    const dragDistanceRef = useRef(0);

    // 1. 최다 찜 TOP 10 데이터 로드
    useEffect(() => {
        let isMounted = true;
        client.get('/api/v1/insights/trending?limit=10')
            .then(res => {
                if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
                    setGames(res.data);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    const totalGames = games.length;

    // 슬라이드 이동 함수
    const nextSlide = useCallback(() => {
        if (totalGames === 0) return;
        setCurrentIndex(prev => (prev + 1) % totalGames);
        setCycleKey(prev => prev + 1);
    }, [totalGames]);

    const prevSlide = useCallback(() => {
        if (totalGames === 0) return;
        setCurrentIndex(prev => (prev - 1 + totalGames) % totalGames);
        setCycleKey(prev => prev + 1);
    }, [totalGames]);

    const goToSlide = useCallback((index) => {
        setCurrentIndex(index);
        setCycleKey(prev => prev + 1);
    }, []);

    // 2. 발열/배터리 절전: 브라우저 탭 비활성화 감지
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabVisible(document.visibilityState === 'visible');
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // 3. 발열/배터리 절전: 화면 스크롤 밖(Viewport Out) 감지
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            setIsInView(entry.isIntersecting);
        }, { threshold: 0.1 });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 4. 오토플레이 타이머 (4.5초 슬라이드 & 스마트 절전 연동)
    const isPlaying = !isPaused && !isCardHovered && isInView && isTabVisible && totalGames > 1;

    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            if (!isDraggingRef.current) {
                nextSlide();
            }
        }, AUTOPLAY_INTERVAL);

        return () => clearInterval(timer);
    }, [isPlaying, nextSlide, currentIndex, cycleKey]);

    // 4. 터치 & 마우스 드래그 스와이프 인터랙션
    const handleTouchStart = (e) => {
        isDraggingRef.current = true;
        dragStartXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
        dragCurrentXRef.current = dragStartXRef.current;
        dragDistanceRef.current = 0;
    };

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current) return;
        dragCurrentXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
        dragDistanceRef.current = dragCurrentXRef.current - dragStartXRef.current;
    };

    const handleTouchEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        const diff = dragDistanceRef.current;
        const threshold = 40; // 스와이프 인식 최소 거리

        if (diff < -threshold) {
            nextSlide();
        } else if (diff > threshold) {
            prevSlide();
        }
    };

    const handleCardClick = (gameId) => {
        // 드래그 중 실수로 클릭되는 현상 방지
        if (Math.abs(dragDistanceRef.current) > 8) return;
        navigate(`/games/${gameId}`, { state: { background: location } });
    };

    if (loading) {
        return (
            <div className="mb-8 w-full h-[220px] sm:h-[260px] md:h-[300px] rounded-3xl bg-surface border border-divider overflow-hidden relative shadow-lg">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent" />
            </div>
        );
    }

    if (totalGames === 0) return null;

    const activeGame = games[currentIndex] || games[0];

    return (
        <section 
            ref={containerRef}
            className="mb-8 md:mb-10 relative overflow-hidden rounded-3xl group select-none transition-all"
        >
            {/* 앰비언트 백드롭 글로우 (다크 모드: 앰비언트 무드, 라이트 모드: 은은한 감쇠) */}
            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl">
                <div 
                    className="absolute -inset-10 bg-cover bg-center transition-all duration-700 ease-out opacity-25 dark:opacity-35 blur-3xl scale-125"
                    style={{ backgroundImage: `url(${activeGame.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent dark:from-base dark:via-base/50 dark:to-transparent" />
            </div>

            {/* 헤더 바: 타이틀 & 슬라이드 카운터 / 컨트롤러 */}
            <div className="flex items-center justify-between px-3 sm:px-6 pt-3 pb-2 sm:pt-4 sm:pb-3 relative z-20">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-sm">
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-500/30" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-black text-primary tracking-tight flex items-center gap-1.5">
                                실시간 최다 찜 <span className="text-amber-500 dark:text-amber-400">TOP 10</span>
                            </h2>
                            <span className="hidden xs:inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <Sparkles className="w-2.5 h-2.5" /> SPOTLIGHT
                            </span>
                        </div>
                    </div>
                </div>

                {/* 슬라이드 컨트롤러 & 넘버링 */}
                <div className="flex items-center gap-2 sm:gap-3 bg-surface/80 dark:bg-black/40 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-divider shadow-sm">
                    <span className="text-[11px] sm:text-xs font-black text-primary font-mono tracking-wider">
                        {String(currentIndex + 1).padStart(2, '0')}
                        <span className="text-muted font-normal mx-0.5">/</span>
                        <span className="text-secondary">{String(totalGames).padStart(2, '0')}</span>
                    </span>

                    <div className="w-px h-3 bg-divider" />

                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-1 hover:text-primary text-secondary transition-colors"
                        title={isPaused ? "자동 넘김 재생" : "일시 정지"}
                        aria-label={isPaused ? "자동 넘김 재생" : "일시 정지"}
                    >
                        {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                    </button>
                </div>
            </div>

            {/* 3D Depth & Peek 캐러셀 트랙 */}
            <div 
                className="relative w-full h-[210px] sm:h-[260px] md:h-[310px] flex items-center overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y [--card-w:84%] sm:[--card-w:72%] md:[--card-w:60%] lg:[--card-w:52%]"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
            >
                {/* 슬라이더 트랙 컨테이너 */}
                <div 
                    className="flex w-full h-full items-center transition-transform duration-500 ease-out will-change-transform"
                    style={{
                        // 카드 너비(--card-w)에 맞춰 현재 활성 카드의 정중앙을 컨테이너 중심(50%)에 완벽하게 일치시킴
                        transform: `translateX(calc(50% - (var(--card-w) / 2) - (${currentIndex} * var(--card-w))))`,
                    }}
                >
                    {games.map((game, idx) => {
                        const isActive = idx === currentIndex;
                        const rank = game.rank || idx + 1;

                        // 랭킹 뱃지 스타일 분기
                        const rankBadgeClass = 
                            rank === 1 ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]' :
                            rank === 2 ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-black border-slate-100 shadow-[0_0_12px_rgba(203,213,225,0.4)]' :
                            rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-500 shadow-[0_0_12px_rgba(217,119,6,0.4)]' :
                            'bg-black/60 backdrop-blur-md text-white/90 border-white/20';

                        return (
                            <div
                                key={game.id}
                                onClick={() => isActive ? handleCardClick(game.id) : goToSlide(idx)}
                                onMouseEnter={() => { if (isActive) setIsCardHovered(true); }}
                                onMouseLeave={() => { 
                                    if (isActive) {
                                        setIsCardHovered(false);
                                        setCycleKey(prev => prev + 1);
                                    }
                                }}
                                className={`shrink-0 w-[var(--card-w)] px-2 sm:px-3 h-full transition-all duration-500 ease-out flex items-center justify-center
                                    ${isActive ? 'scale-100 z-10 opacity-100' : 'scale-[0.92] sm:scale-[0.90] z-0 opacity-40 hover:opacity-75 cursor-pointer'}
                                `}
                            >
                                <div className="relative w-full h-[180px] sm:h-[220px] md:h-[270px] rounded-2xl sm:rounded-3xl overflow-hidden border border-divider/80 bg-surface shadow-2xl group/card">
                                    {/* 고화질 게임 이미지 */}
                                    <PSGameImage
                                        src={game.imageUrl}
                                        alt={cleanTitle(game.title)}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                                        priority={idx < 3}
                                        width={800}
                                    />

                                    {/* 다크 그라디언트 엣지 & 세미-다크 스크림 (가독성 100% 보장) */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />

                                    {/* 상단 랭킹 배지 */}
                                    <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-10 flex items-center gap-1.5">
                                        <div className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black tracking-tight flex items-center gap-1 border ${rankBadgeClass}`}>
                                            {rank <= 3 && <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
                                            <span>#{rank}</span>
                                        </div>

                                        {game.discountRate > 0 && (
                                            <span className="bg-ps-blue text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                                                -{game.discountRate}%
                                            </span>
                                        )}
                                    </div>

                                    {/* 하단 콘텐츠 정보 영역 */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-10 flex flex-col justify-end">
                                        <h3 className="text-xs sm:text-base md:text-lg font-black text-white line-clamp-1 sm:line-clamp-2 mb-1.5 sm:mb-2 drop-shadow-lg group-hover/card:text-blue-300 transition-colors">
                                            {cleanTitle(game.title)}
                                        </h3>

                                        <div className="flex items-center justify-between gap-2">
                                            {/* 가격 진단 심볼 & 칩 */}
                                            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-xl border border-white/10 shadow-sm">
                                                {game.priceVerdict === 'BUY_NOW' && (
                                                    <div className="flex items-center gap-1 text-green-400">
                                                        <Circle className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                                        <span className="text-[10px] sm:text-xs font-black tracking-tight">역대최저가</span>
                                                    </div>
                                                )}
                                                {game.priceVerdict === 'GOOD_OFFER' && (
                                                    <div className="flex items-center gap-1 text-yellow-400">
                                                        <Triangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                                                        <span className="text-[10px] sm:text-xs font-black tracking-tight">추천할인</span>
                                                    </div>
                                                )}
                                                {game.priceVerdict === 'WAIT' && (
                                                    <div className="flex items-center gap-1 text-red-400">
                                                        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                                        <span className="text-[10px] sm:text-xs font-black tracking-tight">보류</span>
                                                    </div>
                                                )}
                                                {(game.priceVerdict === 'TRACKING' || !game.priceVerdict) && (
                                                    <div className="flex items-center gap-1 text-blue-400">
                                                        <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                                        <span className="text-[10px] sm:text-xs font-black tracking-tight">추적중</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 가격 표시 */}
                                            <div className="bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-xl border border-white/10 shadow-sm">
                                                <span className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight">
                                                    {game.currentPrice > 0 ? `₩${game.currentPrice.toLocaleString()}` : '무료'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* PC 좌/우 화살표 내비게이션 버튼 (마우스 호버 시 자연스럽게 등장) */}
                <button
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-xl"
                    aria-label="이전 게임"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                    className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-xl"
                    aria-label="다음 게임"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* 하단 슬림 타이머 프로그레스 바 */}
            <div className="px-4 sm:px-6 pb-2 sm:pb-3 pt-1">
                <div className="w-full bg-divider/60 h-1 sm:h-1.5 rounded-full overflow-hidden flex">
                    <div 
                        key={`${currentIndex}-${cycleKey}`}
                        className={`h-full bg-amber-500 dark:bg-amber-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] ${
                            isPaused ? 'w-0' : ''
                        }`}
                        style={{
                            animation: isPaused ? 'none' : `heroProgress ${AUTOPLAY_INTERVAL}ms linear forwards`,
                            animationPlayState: isPlaying ? 'running' : 'paused',
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes heroProgress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}</style>
        </section>
    );
};

export default TrendingHeroCarousel;
