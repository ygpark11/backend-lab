import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Calendar,
    ChevronRight,
    Circle,
    Gamepad2,
    Info,
    Lock,
    Square,
    Triangle,
    X as XIcon,
    Layers,
    Sparkles,
    CheckCircle2,
    BookmarkCheck,
    PlayCircle
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { useLocation } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import HelpModal from '../components/common/HelpModal';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';

// --- 유틸리티 함수 ---
const formatTargetMonth = (targetMonth) => {
    if (!targetMonth) return '';
    const [year, month] = targetMonth.split('-');
    return `${year}년 ${parseInt(month, 10)}월`;
};

const PS_SHAPES = [
    { Icon: Triangle, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', glow: 'shadow-[0_0_24px_rgba(52,211,153,0.4)]' },
    { Icon: Circle, color: 'text-rose-500', bg: 'bg-rose-500/15', border: 'border-rose-500/40', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]' },
    { Icon: XIcon, color: 'text-ps-blue', bg: 'bg-ps-blue/15', border: 'border-ps-blue/40', glow: 'shadow-[0_0_20px_rgba(0,112,209,0.35)]' },
    { Icon: Square, color: 'text-pink-500', bg: 'bg-pink-500/15', border: 'border-pink-500/40', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.35)]' }
];

// --- 서브 컴포넌트 1: 홀로그래픽 캡슐 카드 ---
const GameCard = ({ game, isLatestMonth, benefitType }) => {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const isGhost = !game.gameId;
    const isEssential = benefitType === 'ESSENTIAL';

    const handleClick = () => {
        if (!isGhost) {
            navigate(`/games/${game.gameId}`, { state: { background: location } });
        }
    };

    // 미수집(isGhost) 카드: 실제 썸네일/타이틀 노출 + 추적 대기 오버레이 연출
    if (isGhost) {
        return (
            <article
                className="group/card relative overflow-hidden rounded-2xl bg-surface/60 backdrop-blur-xl border border-divider/60 flex flex-col justify-between p-3.5 sm:p-4.5 cursor-default transition-all duration-300"
            >
                <div className="flex flex-col gap-3">
                    {/* 16:9 썸네일 + 반투명 틴트 및 자물쇠 오버레이 */}
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-base border border-divider/50 shrink-0">
                        <PSGameImage
                            src={game.imageUrl}
                            alt={game.title}
                            width={640}
                            className="w-full h-full object-cover filter brightness-[0.7] contrast-[0.9]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-black/40 to-transparent"></div>

                        {/* 중앙 자물쇠 칩 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 shadow-lg">
                                <Lock className="w-4 h-4 text-white/70" />
                            </div>
                        </div>

                        {/* HUD 좌하단 상태 태그 */}
                        <span className="absolute bottom-2 left-2 text-[9px] sm:text-[10px] font-bold text-yellow-400/90 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-yellow-500/20 whitespace-nowrap shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0"></span>
                            <span>데이터 수집 대기</span>
                        </span>
                    </div>

                    {/* 실제 게임 타이틀 및 직관적 안내 문구 */}
                    <div>
                        <h3 className="font-black text-sm sm:text-base leading-snug line-clamp-2 break-keep text-primary/80">
                            {game.title}
                        </h3>
                        <p className="text-xs text-secondary mt-1.5 flex items-center gap-1.5 font-medium break-keep">
                            <Info className="w-3.5 h-3.5 text-secondary shrink-0" />
                            <span className="line-clamp-1 break-keep">아직 추적되지 않은 타이틀입니다</span>
                        </p>
                    </div>
                </div>

                {/* 카드 푸터 */}
                <div className="mt-3.5 sm:mt-4 pt-3 flex items-center justify-between border-t border-divider/60 gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-hover text-secondary text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                        UNTRACKED
                    </span>
                    <span className="text-xs font-semibold text-secondary/60 flex items-center gap-1 shrink-0">
                        <span>추적 대기 타이틀</span>
                    </span>
                </div>
            </article>
        );
    }

    return (
        <article
            onClick={handleClick}
            className={`
                group/card relative overflow-hidden rounded-2xl bg-surface/80 backdrop-blur-xl border flex flex-col justify-between p-3.5 sm:p-4.5 cursor-pointer
                transition-all duration-300
                ${isLatestMonth
                    ? 'border-divider hover:border-emerald-500/60 hover:shadow-[0_0_25px_rgba(52,211,153,0.18)] hover:-translate-y-1'
                    : 'border-divider hover:border-ps-blue/50 hover:shadow-[0_0_20px_rgba(0,112,209,0.15)] hover:-translate-y-1'
                }
            `}
        >
            <div className="flex flex-col gap-3">
                {/* 16:9 와이드 시네마틱 썸네일 & HUD 오버레이 */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-base border border-divider/50 shrink-0">
                    <PSGameImage
                        src={game.imageUrl}
                        alt={game.title}
                        width={640}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90"></div>

                    {/* HUD 좌하단: 최신 월 상태 태그 */}
                    {isLatestMonth && (
                        <span className="absolute bottom-2 left-2 text-[9px] sm:text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-emerald-500/30 whitespace-nowrap shadow-sm">
                            {isEssential ? (
                                <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>라이브러리 등록 가능</span>
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>카탈로그 플레이 가능</span>
                                </>
                            )}
                        </span>
                    )}
                </div>

                {/* 게임 타이틀 & 본문 안내 (단어 단위 줄바꿈 break-keep 및 2줄 클램프) */}
                <div>
                    <h3 className={`font-black text-sm sm:text-base leading-snug line-clamp-2 break-keep transition-colors ${
                        isLatestMonth ? 'text-primary group-hover/card:text-emerald-400' : 'text-primary group-hover/card:text-ps-blue'
                    }`}>
                        {game.title}
                    </h3>
                    
                    <p className="text-xs text-secondary mt-1.5 flex items-center gap-1.5 font-medium break-keep">
                        {isEssential ? (
                            <>
                                <BookmarkCheck className="w-3.5 h-3.5 text-ps-blue shrink-0" />
                                <span className="line-clamp-1 break-keep">등록 시 구독 기간 영구 소장 플레이</span>
                            </>
                        ) : (
                            <>
                                <PlayCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                <span className="line-clamp-1 break-keep">스페셜·디럭스 요금제 무제한 플레이</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* 카드 푸터: flex-nowrap 및 축소 방지 */}
            <div className="mt-3.5 sm:mt-4 pt-3 flex items-center justify-between border-t border-divider gap-2">
                {isLatestMonth ? (
                    <span className="px-2 sm:px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">
                        {isEssential ? 'CLAIM FREE' : 'PLAY NOW'}
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded bg-surface-hover text-secondary text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                        {isEssential ? 'SAVED ARCHIVE' : 'CATALOG HISTORY'}
                    </span>
                )}

                <div className={`text-xs font-bold flex items-center gap-0.5 shrink-0 transition-colors ${
                    isLatestMonth ? 'text-emerald-400' : 'text-ps-blue'
                }`}>
                    <span>세부 정보</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover/card:translate-x-0.5 transition-transform" />
                </div>
            </div>
        </article>
    );
};

// --- 서브 컴포넌트 2: 스켈레톤 UI ---
const SkeletonMonth = () => (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 relative animate-pulse mb-12 pl-12 lg:pl-16">
        <div className="lg:w-[170px] flex-shrink-0">
            <div className="w-32 h-10 rounded-2xl bg-surface border border-divider"></div>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl bg-surface border border-divider flex flex-col p-4 gap-3 shadow-lg">
                    <div className="aspect-video bg-surface-hover rounded-xl border border-divider/50"></div>
                    <div className="w-3/4 h-4 bg-surface-hover rounded mt-1"></div>
                    <div className="w-1/2 h-3 bg-surface-hover rounded"></div>
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

    const isEssential = activeTab === 'ESSENTIAL';

    return (
        <div className="min-h-screen bg-base text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors duration-500 select-none">
            <SEO
                title={isEssential ? "PS Plus 월간 게임 아카이브" : "PS Plus 게임 카탈로그 아카이브"}
                description="PS Plus 요금제별 역대 무료 게임 및 카탈로그 아카이브 타임라인을 탐색하세요."
                url="https://ps-signal.com/monthly-games"
            />

            {/* 배경 앰비언트 글로우 오브 */}
            <div className="hidden md:block absolute top-[5%] left-[5%] w-[35%] h-[40%] rounded-full blur-[140px] pointer-events-none bg-emerald-500/10 transition-colors duration-500"></div>
            <div className="hidden md:block absolute top-[35%] right-[5%] w-[30%] h-[35%] rounded-full blur-[140px] pointer-events-none bg-ps-blue/15 transition-colors duration-500"></div>
            <div className="hidden md:block absolute bottom-[15%] left-[10%] w-[25%] h-[30%] rounded-full blur-[120px] pointer-events-none bg-yellow-500/10 transition-colors duration-500"></div>

            {/* PlayStation 상징 기하학 심볼 워터마크 */}
            <div className="absolute top-32 right-10 md:right-20 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                <Square className="w-24 h-24 stroke-[2px]" />
                <Triangle className="w-24 h-24 stroke-[2px]" />
                <Circle className="w-24 h-24 stroke-[2px]" />
                <XIcon className="w-24 h-24 stroke-[2px]" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* 헤더 섹션: 단정하고 직관적인 구성 */}
                <header className="flex flex-col gap-6 mb-8 sm:mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* 상단 태그 및 실시간 배지 */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-divider shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                <span className="text-[10px] sm:text-[11px] font-black text-yellow-400 uppercase tracking-widest whitespace-nowrap">
                                    {isEssential ? 'PS PLUS MONTHLY VAULT' : 'PS PLUS CATALOG VAULT'}
                                </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-secondary flex items-center gap-1.5 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                                LIVE TIMELINE
                            </span>
                        </div>

                        {/* 아카이브 이용 가이드 버튼 */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'ARCHIVE' }); }}
                            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-surface hover:bg-surface-hover border border-divider text-secondary hover:text-primary transition-all duration-300 shadow-sm text-xs font-bold shrink-0"
                            aria-label="아카이브 가이드 보기"
                        >
                            <Info className="w-4 h-4 text-ps-blue shrink-0" />
                            <span className="whitespace-nowrap">아카이브 이용 가이드</span>
                        </button>
                    </div>

                    {/* 메인 타이틀 & 혜택 모드 탭 분기 */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
                        <div className="max-w-2xl flex flex-col gap-2">
                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-primary break-keep">
                                PS Plus <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">
                                    {isEssential ? '월간 게임 아카이브' : '카탈로그 타임라인'}
                                </span>
                            </h1>
                            <p className="text-xs sm:text-sm text-secondary font-medium leading-relaxed break-keep">
                                {isEssential
                                    ? '매달 무료로 제공되는 에센셜 게임의 발자취를 확인하세요. 기간 내 라이브러리에 등록한 타이틀은 구독 중 영구 플레이가 보장됩니다.'
                                    : '스페셜·디럭스 요금제에서 즐길 수 있는 게임 카탈로그 라인업의 월별 추가 이력을 한눈에 추적합니다.'
                                }
                            </p>
                        </div>

                        {/* 요금제 모드 탭 (에센셜 vs 카탈로그) */}
                        <div className="inline-flex p-1 sm:p-1.5 rounded-2xl bg-surface border border-divider shadow-inner self-start lg:self-auto w-full sm:w-auto shrink-0">
                            <button
                                onClick={() => setActiveTab('ESSENTIAL')}
                                className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                                    isEssential
                                        ? 'bg-ps-blue text-white shadow-md'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span>월간 게임 (ESSENTIAL)</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('CATALOG')}
                                className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                                    !isEssential
                                        ? 'bg-ps-blue text-white shadow-md'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span>신규 카탈로그 (EXTRA/DELUXE)</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* 크로노 볼트 타임라인 (Chrono Conduit Timeline) */}
                <div className="relative mt-2 sm:mt-4">
                    {/* 세로 에너지 도관 라인 (데스크톱 전용) */}
                    <div className="hidden lg:block absolute top-6 bottom-16 left-[22px] w-[3px] bg-gradient-to-b from-emerald-400 via-ps-blue to-indigo-500/40 shadow-[0_0_15px_rgba(0,112,209,0.3)] rounded-full -z-0"></div>

                    {loading && pageNumber === 0 ? (
                        <div>
                            <SkeletonMonth />
                            <SkeletonMonth />
                        </div>
                    ) : !loading && pages.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-24 sm:py-32 px-4 text-center animate-fadeIn">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-5 rounded-3xl bg-surface border border-divider flex items-center justify-center shadow-inner">
                                <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-secondary opacity-40" />
                            </div>
                            <h3 className="text-lg sm:text-2xl font-black text-primary mb-2">아카이브가 텅 비어있습니다</h3>
                            <p className="text-xs sm:text-sm text-secondary font-medium break-keep">
                                아직 수집된 {isEssential ? '월간 게임' : '카탈로그'} 데이터가 존재하지 않습니다.
                            </p>
                        </div>
                    ) : (
                        /* 타임라인 월 블록 목록 */
                        <div className="space-y-10 sm:space-y-12 lg:space-y-14">
                            {pages.map((monthData, index) => {
                                const shapeConfig = PS_SHAPES[index % 4];
                                const ShapeIcon = shapeConfig.Icon;
                                const isLatest = index === 0;

                                return (
                                    <section
                                        key={monthData.targetMonth}
                                        className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-10 relative animate-fadeIn group/month"
                                        style={{ animationDelay: `${(index % 5) * 50}ms` }}
                                    >
                                        {/* 좌측 타임라인 노드 & 월 라벨 (모바일에서 감싸기 flex-wrap 적용) */}
                                        <div className="lg:w-[170px] flex-shrink-0 relative z-10">
                                            <div className="lg:sticky lg:top-24 flex items-center lg:items-start gap-3">
                                                {/* 데스크톱 전용 심볼 발광 노드 마커 */}
                                                <div className={`hidden lg:flex w-11 h-11 rounded-2xl items-center justify-center flex-shrink-0 relative bg-base border-2 transition-all duration-300 group-hover/month:scale-110 ${
                                                    isLatest
                                                        ? 'border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.4)]'
                                                        : `border-divider ${shapeConfig.border} group-hover/month:${shapeConfig.glow}`
                                                }`}>
                                                    {isLatest ? (
                                                        <>
                                                            <Triangle className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                                                            <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping opacity-75 pointer-events-none"></span>
                                                        </>
                                                    ) : (
                                                        <ShapeIcon className={`w-5 h-5 stroke-[2.5px] transition-colors ${shapeConfig.color}`} />
                                                    )}
                                                </div>

                                                {/* 모바일/데스크톱 월 타이틀 */}
                                                <div className="flex flex-wrap items-center lg:flex-col lg:items-start gap-2 lg:gap-1 w-full">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className={`w-4 h-4 lg:hidden shrink-0 ${isLatest ? 'text-emerald-400' : 'text-secondary'}`} />
                                                        <span className={`font-black text-base sm:text-xl tracking-tight transition-colors whitespace-nowrap ${isLatest ? 'text-primary' : 'text-primary group-hover/month:text-ps-blue'}`}>
                                                            {formatTargetMonth(monthData.targetMonth)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {isLatest ? (
                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black flex items-center gap-1 whitespace-nowrap">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                                                                <span>{isEssential ? '현재 수령 가능' : '신규 라인업'}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded bg-surface-hover text-secondary text-[10px] font-bold whitespace-nowrap">
                                                                {isEssential ? '배포 종료' : '카탈로그 이력'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 우측 캡슐 카드 그리드 */}
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-5 lg:pb-12">
                                            {monthData.games.map((game) => (
                                                <GameCard
                                                    key={game.psStoreId || game.gameId}
                                                    game={game}
                                                    isLatestMonth={isLatest}
                                                    benefitType={activeTab}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}

                    {/* 무한 스크롤 옵저버 타겟 & 완료 메시지 */}
                    <div ref={observerTarget} className="pt-6 sm:pt-8 pb-10">
                        {loadingMore && <SkeletonMonth />}

                        {!hasNext && pages.length > 0 && (
                            <div className="text-center text-secondary text-xs sm:text-sm font-bold mt-8 sm:mt-10 p-5 sm:p-6 bg-surface/60 backdrop-blur-md border border-divider rounded-3xl animate-fadeIn max-w-md mx-auto flex flex-col items-center gap-2 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-ps-blue/10 flex items-center justify-center text-ps-blue mb-1 shrink-0">
                                    <Circle className="w-4 h-4 stroke-[3]" />
                                </div>
                                <span className="break-keep">모든 아카이브 내역을 불러왔습니다.</span>
                                <span className="text-[11px] text-secondary font-normal break-keep">
                                    {isEssential
                                        ? '2022년 이후 배포된 역대 월간 무료 게임 내역입니다.'
                                        : '2022년 이후 추가된 역대 게임 카탈로그 라인업입니다.'
                                    }
                                </span>
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
