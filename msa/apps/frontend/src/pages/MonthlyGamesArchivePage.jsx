import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Calendar, ChevronRight, Circle, Gamepad2, Info, Lock, Square, Triangle, X as XIcon, Plus, Ghost, Layers
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { useLocation } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import HelpModal from '../components/common/HelpModal';
import PSGameImage from '../components/common/PSGameImage';

// --- 유틸리티 함수 ---
const formatTargetMonth = (targetMonth) => {
    if (!targetMonth) return '';
    const [year, month] = targetMonth.split('-');
    return `${year}년 ${parseInt(month, 10)}월`;
};

const PS_SHAPES = [
    { Icon: Triangle, color: 'text-green-500', borderHover: 'group-hover/month:border-green-500', textHover: 'group-hover/month:text-green-500', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.4)]' },
    { Icon: Circle, color: 'text-red-500', borderHover: 'group-hover/month:border-red-500', textHover: 'group-hover/month:text-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]' },
    { Icon: XIcon, color: 'text-blue-500', borderHover: 'group-hover/month:border-blue-500', textHover: 'group-hover/month:text-blue-500', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.4)]' },
    { Icon: Square, color: 'text-pink-500', borderHover: 'group-hover/month:border-pink-500', textHover: 'group-hover/month:text-pink-500', glow: 'shadow-[0_0_12px_rgba(236,72,153,0.4)]' }
];

// --- 서브 컴포넌트 1: 게임 카드 ---
const GameCard = ({ game }) => {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const isGhost = !game.gameId;

    const handleClick = () => {
        if (!isGhost) {
            navigate(`/games/${game.gameId}`, { state: { background: location } });
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`
                relative overflow-hidden rounded-2xl bg-surface border transition-all duration-300 flex flex-col h-full group/card
                ${isGhost
                ? 'cursor-default border-divider/50 opacity-80'
                : 'cursor-pointer border-divider hover:border-ps-blue/50 hover:shadow-[0_0_20px_rgba(0,67,156,0.15)] hover:-translate-y-1'
            }
            `}
        >
            {isGhost && (
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 z-10 shadow-lg">
                    <Lock className="w-3 h-3 text-gray-400" /> 수집 대기중
                </div>
            )}

            <div className="relative aspect-[16/9] w-full overflow-hidden bg-base border-b border-divider/50">
                <PSGameImage
                    src={game.imageUrl}
                    alt={game.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${isGhost ? 'grayscale-[60%] opacity-80' : 'group-hover/card:scale-105'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90"></div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className={`font-bold text-sm md:text-base leading-snug line-clamp-2 transition-colors ${isGhost ? 'text-secondary' : 'text-primary group-hover/card:text-ps-blue'}`}>
                        {game.title}
                    </h3>
                </div>

                {!isGhost && (
                    <div className="mt-4 flex items-center justify-end text-xs font-bold text-ps-blue opacity-0 group-hover/card:opacity-100 transition-all translate-x-2 group-hover/card:translate-x-0 duration-300">
                        상세보기 <ChevronRight className="w-4 h-4 ml-0.5" />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 서브 컴포넌트 2: 스켈레톤 UI ---
const SkeletonMonth = () => (
    <div className="flex flex-col lg:flex-row gap-6 relative animate-pulse mb-12">
        <div className="hidden lg:block absolute left-[27px] top-0 bottom-0 w-[2px] bg-divider"></div>
        <div className="lg:w-[160px] flex-shrink-0 relative z-10">
            <div className="w-28 h-10 rounded-full bg-surface border border-divider"></div>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:pb-16">
            {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl bg-surface border border-divider flex flex-col overflow-hidden shadow-lg">
                    <div className="aspect-[16/9] bg-base border-b border-divider/50"></div>
                    <div className="p-4 flex flex-col gap-2">
                        <div className="w-3/4 h-4 bg-divider rounded"></div>
                        <div className="w-1/2 h-3 bg-divider rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// --- 메인 페이지 컴포넌트 ---
const MonthlyGamesArchivePage = () => {
    const [activeTab, setActiveTab] = useState('ESSENTIAL');
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasNext, setHasNext] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);
    const [helpInfo, setHelpInfo] = useState({ isOpen: false, type: null });

    const observerTarget = useRef(null);

    const fetchArchive = useCallback(async (pageIdx, tab) => {
        try {
            if (pageIdx === 0) setLoading(true);
            else setLoadingMore(true);

            const response = await client.get(`/api/v1/subscriptions/benefits?benefitType=${tab}&page=${pageIdx}&size=5`);

            if (!response.data || response.status === 204) {
                setHasNext(false);
                return;
            }

            const { content, last } = response.data;

            setPages(prev => {
                if (pageIdx === 0) return content;
                const existingMonths = new Set(prev.map(p => p.targetMonth));
                const newContent = content.filter(c => !existingMonths.has(c.targetMonth));
                return [...prev, ...newContent];
            });

            setHasNext(!last);
        } catch (error) {
            console.error('아카이브 로딩 실패:', error);
            toast.error('데이터를 불러오는 중 문제가 발생했습니다.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPages([]);
        setPageNumber(0);
        setHasNext(true);
        fetchArchive(0, activeTab);
    }, [activeTab, fetchArchive]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNext && !loading && !loadingMore) {
                    setPageNumber(prev => {
                        const next = prev + 1;
                        fetchArchive(next, activeTab);
                        return next;
                    });
                }
            },
            { threshold: 0.1, rootMargin: "300px" }
        );

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasNext, loading, loadingMore, fetchArchive, activeTab]);


    return (
        <div className="min-h-screen bg-base text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors duration-500">
            {/* 배경 이펙트 */}
            <div className="hidden md:block absolute top-[5%] left-[5%] w-[30%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-yellow-500/10 transition-colors duration-500"></div>
            <div className="hidden md:block absolute bottom-[20%] right-[5%] w-[30%] h-[30%] rounded-full blur-[120px] pointer-events-none bg-ps-blue/10 transition-colors duration-500"></div>

            <div className="absolute top-32 right-10 md:right-20 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                <Square className="w-24 h-24 stroke-[2px]" />
                <Triangle className="w-24 h-24 stroke-[2px]" />
                <Circle className="w-24 h-24 stroke-[2px]" />
                <XIcon className="w-24 h-24 stroke-[2px]" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">

                {/* 헤더 */}
                <div className="mb-10 animate-fadeIn flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg mb-6">
                            <Layers className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                            PS Plus <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">혜택</span> 아카이브
                        </h1>
                        <p className="text-secondary font-bold">역대 PS Plus 요금제별 무료 혜택의 발자취를 탐험하세요.</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'ARCHIVE' }); }}
                        className="self-start md:self-auto p-2 rounded-full text-secondary hover:text-primary hover:bg-surface-hover border border-divider bg-surface transition-colors"
                        aria-label="아카이브 가이드 보기"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex bg-surface border border-divider p-1.5 rounded-2xl w-full sm:w-fit mb-12 shadow-sm animate-fadeIn">
                    <button
                        onClick={() => setActiveTab('ESSENTIAL')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2
                            ${activeTab === 'ESSENTIAL'
                            ? 'bg-ps-blue text-white shadow-md'
                            : 'text-secondary hover:text-primary'}`}
                    >
                        <Gamepad2 className="w-4 h-4" /> 월간 게임
                    </button>
                    <button
                        onClick={() => setActiveTab('CATALOG')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2
                            ${activeTab === 'CATALOG'
                            ? 'bg-ps-blue text-white shadow-md'
                            : 'text-secondary hover:text-primary'}`}
                    >
                        <Layers className="w-4 h-4" /> 신규 카탈로그
                    </button>
                </div>

                {/* 타임라인 및 게임 리스트 */}
                <div className="relative">
                    {loading && pageNumber === 0 ? (
                        <div>
                            <SkeletonMonth />
                            <SkeletonMonth />
                        </div>
                    ) : !loading && pages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 px-4 text-center animate-fadeIn">
                            <div className="w-24 h-24 mb-6 rounded-full bg-surface border border-divider flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
                                <Ghost className="w-12 h-12 text-muted opacity-40" />
                            </div>
                            <h3 className="text-2xl font-black text-primary mb-2">아카이브가 텅 비어있습니다</h3>
                            <p className="text-secondary font-bold">
                                아직 수집된 {activeTab === 'ESSENTIAL' ? '월간 게임' : '카탈로그'} 데이터가 존재하지 않습니다.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-12 lg:space-y-0">
                            {pages.map((monthData, index) => {
                                const shapeConfig = PS_SHAPES[index % 4];
                                const ShapeIcon = shapeConfig.Icon;
                                const isLatest = index === 0;

                                return (
                                    <div key={monthData.targetMonth} className="flex flex-col lg:flex-row gap-6 lg:gap-12 relative animate-fadeIn group/month" style={{ animationDelay: `${(index % 5) * 50}ms` }}>

                                        {index < pages.length - 1 && <div className="hidden lg:block absolute left-[15px] top-[40px] bottom-[-40px] w-[2px] bg-gradient-to-b from-divider-strong via-divider to-transparent rounded-full z-0"></div>}

                                        <div className="lg:w-[160px] flex-shrink-0 relative z-10">
                                            <div className="lg:sticky lg:top-24 inline-flex lg:flex items-center gap-3 bg-glass backdrop-blur-md px-4 py-2 lg:px-0 lg:py-0 lg:bg-transparent lg:backdrop-blur-none border border-divider lg:border-none rounded-full shadow-sm lg:shadow-none transition-all">

                                                <div className={`hidden lg:flex w-8 h-8 rounded-full bg-base border-2 flex-shrink-0 items-center justify-center z-10 transition-all duration-300 group-hover/month:scale-125
                                                    ${isLatest ? `border-current ${shapeConfig.color} ${shapeConfig.glow}` : `border-divider ${shapeConfig.borderHover} group-hover/month:${shapeConfig.glow}`}
                                                `}>
                                                    <ShapeIcon className={`w-3.5 h-3.5 stroke-[3px] transition-colors
                                                        ${isLatest ? shapeConfig.color : `text-secondary ${shapeConfig.textHover}`}
                                                    `} />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Calendar className={`w-4 h-4 lg:hidden ${isLatest ? shapeConfig.color : 'text-secondary'}`} />
                                                    <span className={`font-black text-lg tracking-tight transition-colors ${isLatest ? 'text-primary' : 'text-secondary group-hover/month:text-primary'}`}>
                                                        {formatTargetMonth(monthData.targetMonth)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:pb-24">
                                            {monthData.games.map((game) => (
                                                <GameCard key={game.psStoreId} game={game} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div ref={observerTarget} className="pt-8 pb-10">
                        {loadingMore && <SkeletonMonth />}

                        {!hasNext && pages.length > 0 && (
                            <div className="text-center text-muted text-sm font-bold mt-10 p-6 bg-surface border border-divider rounded-2xl animate-fadeIn">
                                <Circle className="w-6 h-6 mx-auto mb-3 opacity-30 stroke-[3]" />
                                모든 아카이브 기록의 끝에 도달했습니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <HelpModal
                isOpen={helpInfo.isOpen}
                type={helpInfo.type}
                onClose={() => setHelpInfo({ isOpen: false, type: null })}
            />
        </div>
    );
};

export default MonthlyGamesArchivePage;