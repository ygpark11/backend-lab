import React, { useCallback, useEffect, useState } from 'react';
import {
    ShieldCheck,
    Gamepad2,
    Sparkles,
    Plus,
    Check,
    X,
    Clock,
    ArrowRight,
    ExternalLink,
    CalendarDays,
    Info,
    Store,
    Flame,
    Triangle,
    Circle,
    Square,
    ChevronDown
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import client from '../api/client';
import SEO from '../components/common/SEO';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import HelpModal from '../components/common/HelpModal';

// PlayStation 공식 PS Plus 혜택 1:1 리스트
const PS_PLUS_BENEFITS = {
    ESSENTIAL: [
        { name: "월간 게임", active: true, highlight: true },
        { name: "온라인 멀티플레이", active: true, highlight: false },
        { name: "독점 할인", active: true, highlight: false },
        { name: "독점 콘텐츠", active: true, highlight: false },
        { name: "클라우드 스토리지", active: true, highlight: false },
        { name: "셰어플레이", active: true, highlight: false },
        { name: "게임 카탈로그", active: false, highlight: false },
        { name: "Ubisoft+ Classics", active: false, highlight: false },
        { name: "클래식 카탈로그", active: false, highlight: false },
        { name: "게임 체험판", active: false, highlight: false }
    ],
    SPECIAL: [
        { name: "월간 게임", active: true, highlight: false },
        { name: "온라인 멀티플레이", active: true, highlight: false },
        { name: "독점 할인", active: true, highlight: false },
        { name: "독점 콘텐츠", active: true, highlight: false },
        { name: "클라우드 스토리지", active: true, highlight: false },
        { name: "셰어플레이", active: true, highlight: false },
        { name: "게임 카탈로그", active: true, highlight: true },
        { name: "Ubisoft+ Classics", active: true, highlight: false },
        { name: "클래식 카탈로그", active: false, highlight: false },
        { name: "게임 체험판", active: false, highlight: false }
    ],
    DELUXE: [
        { name: "월간 게임", active: true, highlight: false },
        { name: "온라인 멀티플레이", active: true, highlight: false },
        { name: "독점 할인", active: true, highlight: false },
        { name: "독점 콘텐츠", active: true, highlight: false },
        { name: "클라우드 스토리지", active: true, highlight: false },
        { name: "셰어플레이", active: true, highlight: false },
        { name: "게임 카탈로그", active: true, highlight: false },
        { name: "Ubisoft+ Classics", active: true, highlight: false },
        { name: "클래식 카탈로그", active: true, highlight: true },
        { name: "게임 체험판", active: true, highlight: true }
    ]
};

const DURATION_OPTIONS = [
    { id: 'price1Month', label: '1개월', months: 1 },
    { id: 'price3Month', label: '3개월', months: 3 },
    { id: 'price12Month', label: '12개월', months: 12 }
];

const formatSaleEndDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}월 ${d.getDate()}일 마감`;
    } catch {
        return null;
    }
};

const PsPlusPricingPage = () => {
    const navigate = useTransitionNavigate();
    const [loading, setLoading] = useState(true);
    const [pricingData, setPricingData] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState('price12Month');
    const [helpInfo, setHelpInfo] = useState({ isOpen: false, type: null });

    const handleOpenHelp = useCallback((e, type) => {
        e.stopPropagation();
        setHelpInfo({ isOpen: true, type });
    }, []);

    const handleCloseHelp = useCallback(() => {
        setHelpInfo({ isOpen: false, type: null });
    }, []);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const response = await client.get('/api/v1/subscriptions/ps-plus/pricing');
                setPricingData(response.data);
            } catch (error) {
                console.error("PS Plus 가격 정보 로딩 실패:", error);
                toast.error("가격 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchPricing();
    }, []);

    const prices = pricingData?.pricingData || {};
    const history = pricingData?.historyData || {};
    const currentDurationObj = DURATION_OPTIONS.find(d => d.id === selectedDuration) || DURATION_OPTIONS[2];

    return (
        <div className="min-h-screen bg-base text-primary pt-20 sm:pt-24 pb-16 sm:pb-20 px-3.5 sm:px-6 lg:px-8 font-sans relative overflow-x-hidden transition-colors duration-500 select-none">
            <SEO
                title="PS Plus 요금제 비교"
                description="PlayStation Plus 에센셜, 스페셜, 디럭스 구독권 실시간 가격 비교 및 역대 최저가 추이"
                url="https://ps-signal.com/ps-plus"
            />

            {/* 🌌 PS-Signal 고유 브랜드 오로라 */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vh] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] pointer-events-none transition-colors duration-500" />
                <div className="absolute top-[25%] right-[-5%] w-[45vw] h-[45vh] rounded-full bg-yellow-500/10 dark:bg-yellow-500/15 blur-[130px] pointer-events-none transition-colors duration-500" />
                <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vh] rounded-full bg-ps-blue/5 dark:bg-ps-blue/10 blur-[120px] pointer-events-none transition-colors duration-500" />

                {/* PlayStation ○△×□ 워터마크 */}
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 flex gap-6 sm:gap-12 md:gap-16 opacity-[0.03] dark:opacity-[0.02] text-primary select-none pointer-events-none">
                    <Triangle className="w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 stroke-[1.2px]" />
                    <Circle className="w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 stroke-[1.2px]" />
                    <X className="w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 stroke-[1.2px]" />
                    <Square className="w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 stroke-[1.2px]" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* 👑 상단 헤더 섹션 (모바일 최적화) */}
                <header className="mb-8 sm:mb-12 flex flex-col items-center text-center animate-fadeIn">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 mb-3 sm:mb-4 shadow-sm">
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 stroke-[3]" />
                        <span className="text-[11px] sm:text-[12px] font-black tracking-widest uppercase">
                            PlayStation® Plus
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-primary">
                            어떤 <span className="text-yellow-600 dark:text-yellow-400">플랜</span>이 적합할까요?
                        </h1>
                        <button
                            onClick={(e) => handleOpenHelp(e, 'PS_PLUS')}
                            className="p-1.5 rounded-full text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                            aria-label="요금제 가이드 보기"
                        >
                            <Info className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </button>
                    </div>

                    <p className="text-xs sm:text-base text-secondary font-medium max-w-xl mx-auto mb-5 sm:mb-6 px-2">
                        모든 혜택을 한눈에 비교하고 결정하세요.
                    </p>

                    {/* 🎛️ 플루이드 캡슐 기간 토글 (모바일 터치 최적화) */}
                    <div className="inline-flex items-center p-1 rounded-full bg-surface border border-divider shadow-inner backdrop-blur-md">
                        {DURATION_OPTIONS.map((btn) => {
                            const isSelected = selectedDuration === btn.id;
                            return (
                                <button
                                    key={btn.id}
                                    onClick={() => setSelectedDuration(btn.id)}
                                    className={`relative px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-1 ${
                                        isSelected
                                            ? 'bg-primary text-[color:var(--color-bg-base)] shadow-md'
                                            : 'text-secondary hover:text-primary'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* 💳 3열 티어 카드 그리드 (모바일 줄바꿈/여백 완벽 최적화) */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 mb-10 sm:mb-12">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="rounded-3xl bg-surface border border-divider p-6 sm:p-8 flex flex-col h-[560px] sm:h-[620px] animate-shimmer"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 mb-10 sm:mb-12 items-stretch">
                        {/* 1. Essential (슬레이트 실버) */}
                        <PricingCard
                            tier="ESSENTIAL"
                            name="에센셜"
                            subName="ESSENTIAL"
                            price={prices?.ESSENTIAL?.[selectedDuration]}
                            discountPrice={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            historyData={history?.ESSENTIAL?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.ESSENTIAL}
                            theme="basic"
                            icon={ShieldCheck}
                            durationMonths={currentDurationObj.months}
                            durationLabel={currentDurationObj.label}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                        />

                        {/* 2. Special (PS Plus Gold - MOST POPULAR HERO CARD) */}
                        <PricingCard
                            tier="SPECIAL"
                            name="스페셜"
                            subName="SPECIAL"
                            isPopular={true}
                            price={prices?.SPECIAL?.[selectedDuration]}
                            discountPrice={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.SPECIAL?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            historyData={history?.SPECIAL?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.SPECIAL}
                            theme="gold"
                            icon={Gamepad2}
                            durationMonths={currentDurationObj.months}
                            durationLabel={currentDurationObj.label}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                        />

                        {/* 3. Deluxe (PlayStation Ice Blue / Platinum) */}
                        <PricingCard
                            tier="DELUXE"
                            name="디럭스"
                            subName="DELUXE"
                            price={prices?.DELUXE?.[selectedDuration]}
                            discountPrice={prices?.DELUXE?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.DELUXE?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.DELUXE?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            historyData={history?.DELUXE?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.DELUXE}
                            theme="premium"
                            icon={Sparkles}
                            durationMonths={currentDurationObj.months}
                            durationLabel={currentDurationObj.label}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                        />
                    </div>
                )}

                {/* 🛍️ 하단 와이드 Official PlayStation Store CTA 배너 (모바일 반응형 완벽 대응) */}
                <aside aria-label="Official PlayStation Store" className="relative">
                    <a
                        href="https://www.playstation.com/ko-kr/ps-plus/?smcid=pdc%3Ako-kr%3Asupport-subscriptions%3Aprimary%20nav%3Amsg-store%3Aps-plus#subscriptions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block rounded-3xl bg-surface hover:bg-surface-hover border border-divider hover:border-ps-blue/60 p-5 sm:p-8 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-ps-blue/5 via-transparent to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                            <div className="flex items-center gap-3.5 sm:gap-6 w-full sm:w-auto">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-ps-blue text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
                                    <Store className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[10px] sm:text-[11px] font-bold text-ps-blue uppercase tracking-wider truncate">
                                            Official PlayStation™ Store
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded-full bg-ps-blue/10 text-ps-blue text-[9px] font-black border border-ps-blue/20 shrink-0">
                                            공식
                                        </span>
                                    </div>
                                    <h2 className="text-base sm:text-xl font-black text-primary group-hover:text-ps-blue transition-colors truncate">
                                        공식 스토어에서 구독권 구매하기
                                    </h2>
                                    <p className="text-xs sm:text-sm text-secondary font-medium hidden sm:block">
                                        PlayStation Network 공식 사이트에서 플랜을 확인하고 바로 구독을 시작하세요.
                                    </p>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-hover group-hover:bg-ps-blue group-hover:text-white text-primary font-bold text-xs sm:text-sm border border-divider group-hover:border-ps-blue shadow-sm transition-all shrink-0">
                                <span>스토어 바로가기</span>
                                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </div>
                    </a>
                </aside>
            </div>

            <HelpModal
                isOpen={helpInfo.isOpen}
                type={helpInfo.type}
                onClose={handleCloseHelp}
            />
        </div>
    );
};

/* 🃏 시각적 위계와 모바일 가독성이 뛰어난 티어 카드 */
const PricingCard = ({
    name,
    subName,
    isPopular = false,
    price,
    discountPrice,
    discountRate,
    saleEndDate,
    historyData,
    benefits,
    theme,
    icon: Icon,
    durationMonths,
    durationLabel,
    onCatalogClick,
    onMonthlyGamesClick,
    onExclusiveClick
}) => {
    const [isChartOpen, setIsChartOpen] = useState(false);

    const themeStyles = {
        basic: {
            border: 'border-divider hover:border-divider-strong',
            bgGlow: 'bg-slate-400/5',
            iconBox: 'bg-surface border-divider text-secondary',
            tag: 'border-divider text-secondary bg-surface',
            btnPrimary: 'bg-primary text-[color:var(--color-bg-base)] hover:opacity-90 shadow-md',
            highlightText: 'text-primary font-black',
            checkIcon: 'text-primary'
        },
        gold: {
            border: 'border-yellow-500/60 hover:border-yellow-500 shadow-[0_0_35px_rgba(234,179,8,0.15)]',
            bgGlow: 'bg-yellow-500/10',
            iconBox: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
            tag: 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
            btnPrimary: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:brightness-110 shadow-[0_0_20px_rgba(234,179,8,0.3)]',
            highlightText: 'text-yellow-600 dark:text-yellow-400 font-black',
            checkIcon: 'text-yellow-500'
        },
        premium: {
            border: 'border-divider-strong hover:border-ps-blue/50 shadow-sm',
            bgGlow: 'bg-blue-500/5',
            iconBox: 'bg-ps-blue/10 border-ps-blue/20 text-ps-blue',
            tag: 'border-ps-blue/20 text-ps-blue bg-ps-blue/10',
            btnPrimary: 'bg-primary text-[color:var(--color-bg-base)] hover:opacity-90 shadow-md',
            highlightText: 'text-ps-blue font-black',
            checkIcon: 'text-ps-blue'
        }
    };

    const style = themeStyles[theme] || themeStyles.basic;

    const finalPrice = (discountPrice && discountPrice > 0) ? discountPrice : price;
    const monthlyEquivalent = (finalPrice && durationMonths) ? Math.round(finalPrice / durationMonths) : null;

    const chartDataToRender = historyData && historyData.length > 0 ? historyData : (price ? [
        {
            date: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
            price: price,
            discountRate: 0,
            verdict: 'TRACKING'
        }
    ] : []);

    const lowestPrice = historyData && historyData.length > 0
        ? Math.min(...historyData.map(h => h.price))
        : null;

    return (
        <div className={`relative overflow-hidden rounded-3xl bg-glass backdrop-blur-xl border p-5 sm:p-7 lg:p-8 flex flex-col justify-between transition-all duration-300 group ${style.border} ${
            isPopular ? 'lg:-translate-y-2 lg:scale-[1.02] shadow-xl z-20' : 'z-10'
        }`}>
            {/* 내부 앰비언트 백그라운드 */}
            <div className={`absolute top-0 right-0 w-44 h-44 ${style.bgGlow} blur-3xl rounded-full pointer-events-none transition-all duration-500 group-hover:scale-150`} />

            {/* 🌟 MOST POPULAR 리본 (스페셜 전용) */}
            {isPopular && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-yellow-500 text-black text-[10px] sm:text-[11px] font-black tracking-wider flex items-center gap-1 shadow-md">
                        <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black stroke-black" />
                        <span>MOST POPULAR</span>
                    </div>
                </div>
            )}

            <div className="relative z-10 flex-1 flex flex-col">
                {/* 1. 상단 티어 헤더 */}
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className={`p-2.5 sm:p-3 rounded-2xl border ${style.iconBox} shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight">{name}</h2>
                            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider border ${style.tag}`}>
                                {subName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. 압도적인 가격 강조 (모바일 줄바꿈 무결성) */}
                <div className="mb-4 sm:mb-6 flex flex-col">
                    {discountPrice && discountPrice > 0 ? (
                        <>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-muted line-through">
                                    ₩{price?.toLocaleString()}
                                </span>
                                <span className="px-1.5 py-0.2 rounded font-black text-[10px] bg-red-500/10 border border-red-500/30 text-red-500">
                                    -{discountRate}%
                                </span>
                                {saleEndDate && (
                                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 ml-auto">
                                        <Clock className="w-2.5 h-2.5 animate-pulse" />
                                        {formatSaleEndDate(saleEndDate)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5 flex-nowrap">
                                <span className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
                                    ₩{discountPrice.toLocaleString()}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-secondary">/ {durationLabel}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-baseline gap-1.5 flex-nowrap">
                            <span className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
                                ₩{price ? price.toLocaleString() : '---'}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-secondary">/ {durationLabel}</span>
                        </div>
                    )}

                    {/* 월 환산 가성비 지표 */}
                    {monthlyEquivalent && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-divider self-start">
                            <span className="text-[10px] sm:text-[11px] font-medium text-secondary">월 환산 시</span>
                            <span className="text-[11px] sm:text-[12px] font-black text-primary">₩{monthlyEquivalent.toLocaleString()}원</span>
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-divider mb-4 sm:mb-6" />

                {/* 3. 깔끔하고 명확한 혜택 수직 체크리스트 */}
                <ul className="space-y-2.5 sm:space-y-3 flex-1 mb-6 sm:mb-8">
                    {benefits.map((benefit, idx) => (
                        <li
                            key={idx}
                            className={`flex items-start gap-2.5 sm:gap-3 transition-opacity ${
                                benefit.active ? 'opacity-100' : 'opacity-35'
                            }`}
                        >
                            <div className="shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center">
                                {benefit.active ? (
                                    <Check className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] ${benefit.highlight ? style.checkIcon : 'text-secondary'}`} />
                                ) : (
                                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted stroke-[2.5]" />
                                )}
                            </div>
                            <span
                                className={`text-xs sm:text-sm leading-snug ${
                                    !benefit.active
                                        ? 'text-muted line-through decoration-muted/50'
                                        : benefit.highlight
                                            ? style.highlightText
                                            : 'text-secondary font-medium'
                                }`}
                            >
                                {benefit.name}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* 4. 액션 버튼 그룹 */}
                <div className="mt-auto flex flex-col gap-2 sm:gap-2.5 pt-2 border-t border-divider">
                    {onCatalogClick ? (
                        <button
                            onClick={onCatalogClick}
                            className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-[0.98] ${style.btnPrimary}`}
                        >
                            <span>카탈로그 둘러보기</span>
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={onMonthlyGamesClick}
                            className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-[0.98] ${style.btnPrimary}`}
                        >
                            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>이번 달 월간 게임 보기</span>
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {onMonthlyGamesClick && onCatalogClick && (
                            <button
                                onClick={onMonthlyGamesClick}
                                className="py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-ps-blue/30 bg-ps-blue/5 text-ps-blue hover:bg-ps-blue/10"
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span>월간 게임</span>
                            </button>
                        )}
                        {onExclusiveClick && (
                            <button
                                onClick={onExclusiveClick}
                                className={`py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-yellow-500/30 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 ${
                                    !onCatalogClick ? 'col-span-2' : ''
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>PLUS 할인</span>
                            </button>
                        )}
                    </div>

                    <div className="w-full h-px bg-divider mt-0.5" />

                    {/* 역대 가격 추이 차트 아코디언 */}
                    <button
                        onClick={() => setIsChartOpen(!isChartOpen)}
                        className="w-full py-1.5 text-[11px] font-bold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                        <span>역대 가격 추이 보기</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isChartOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isChartOpen && (
                        <div className="pt-2 pb-1 border-t border-divider mt-1 animate-fadeIn">
                            <PriceChart historyData={chartDataToRender} lowestPrice={lowestPrice} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PsPlusPricingPage;
