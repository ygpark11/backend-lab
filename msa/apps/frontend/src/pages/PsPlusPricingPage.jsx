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
    TrendingUp
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import client from '../api/client';
import SEO from '../components/common/SEO';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import HelpModal from '../components/common/HelpModal';

// PlayStation 공식 PS Plus 혜택 계층 데이터 (공식 명칭 100% 준수)
const TIER_BENEFITS = {
    ESSENTIAL: [
        { name: "월간 게임", isNew: true },
        { name: "온라인 멀티플레이", isNew: true },
        { name: "독점 할인", isNew: true },
        { name: "독점 콘텐츠", isNew: true },
        { name: "클라우드 스토리지", isNew: true },
        { name: "셰어플레이", isNew: true }
    ],
    SPECIAL: [
        { name: "에센셜의 모든 혜택 기본 포함", isBase: true },
        { name: "게임 카탈로그", isNew: true, highlight: true },
        { name: "Ubisoft+ Classics", isNew: true, highlight: true }
    ],
    DELUXE: [
        { name: "스페셜의 모든 혜택 기본 포함", isBase: true },
        { name: "클래식 카탈로그", isNew: true, highlight: true },
        { name: "게임 체험판", isNew: true, highlight: true }
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
    const [chartModal, setChartModal] = useState({ isOpen: false, tier: null, title: '' });

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

    const openChartModal = (tier, title) => {
        setChartModal({ isOpen: true, tier, title });
    };

    const closeChartModal = () => {
        setChartModal({ isOpen: false, tier: null, title: '' });
    };

    const activeChartHistory = chartModal.tier ? (history?.[chartModal.tier]?.[selectedDuration] || []) : [];
    const activeLowestPrice = activeChartHistory.length > 0
        ? Math.min(...activeChartHistory.map(h => h.price))
        : null;

    return (
        <div className="min-h-screen bg-base text-primary pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-x-hidden transition-colors duration-500 select-none flex flex-col justify-between">
            <SEO
                title="PS Plus 요금제 비교"
                description="PlayStation Plus 에센셜, 스페셜, 디럭스 구독권 실시간 가격 비교 및 역대 최저가 추이"
                url="https://ps-signal.com/ps-plus"
            />

            {/* 🌌 PS-Signal 고유 브랜드 오로라 (PS Blue & PS Plus Gold) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vh] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] pointer-events-none transition-colors duration-500" />
                <div className="absolute top-[25%] right-[-5%] w-[45vw] h-[45vh] rounded-full bg-yellow-500/10 dark:bg-yellow-500/15 blur-[130px] pointer-events-none transition-colors duration-500" />
                <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vh] rounded-full bg-ps-blue/5 dark:bg-ps-blue/10 blur-[120px] pointer-events-none transition-colors duration-500" />

                {/* PlayStation ○△×□ 시그니처 워터마크 */}
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 flex gap-8 md:gap-16 opacity-[0.03] dark:opacity-[0.02] text-primary select-none pointer-events-none">
                    <Triangle className="w-36 h-36 md:w-48 md:h-48 stroke-[1.2px]" />
                    <Circle className="w-36 h-36 md:w-48 md:h-48 stroke-[1.2px]" />
                    <X className="w-36 h-36 md:w-48 md:h-48 stroke-[1.2px]" />
                    <Square className="w-36 h-36 md:w-48 md:h-48 stroke-[1.2px]" />
                </div>
            </div>

            <div className="max-w-7xl w-full mx-auto relative z-10 my-auto flex flex-col gap-6 sm:gap-8">
                {/* 🧭 통합 상단 바 (Zero-Scroll 최적화) */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface/90 dark:bg-[#18181b]/90 backdrop-blur-xl border border-divider p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm animate-fadeIn">
                    {/* 좌측: 타이틀 & 가이드 */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                            <Plus className="w-5 h-5 stroke-[3]" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                                PS Plus 요금제 비교
                            </h1>
                            <button
                                onClick={(e) => handleOpenHelp(e, 'PS_PLUS')}
                                className="p-1.5 rounded-full text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                                aria-label="요금제 가이드 보기"
                            >
                                <Info className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* 중앙: 플루이드 캡슐 기간 토글 (추천 뱃지 가독성 완벽 해결) */}
                    <div className="inline-flex items-center p-1 rounded-full bg-base border border-divider shadow-inner">
                        {DURATION_OPTIONS.map((btn) => {
                            const isSelected = selectedDuration === btn.id;
                            return (
                                <button
                                    key={btn.id}
                                    onClick={() => setSelectedDuration(btn.id)}
                                    className={`relative px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-primary text-[color:var(--color-bg-base)] shadow-sm scale-[1.02]'
                                            : 'text-secondary hover:text-primary'
                                    }`}
                                >
                                    <span>{btn.label}</span>
                                    {btn.id === 'price12Month' && (
                                        <span className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-black rounded-full ${
                                            isSelected
                                                ? 'bg-yellow-500 text-black shadow-sm'
                                                : 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-300'
                                        }`}>
                                            추천
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* 우측: 공식 스토어 바로가기 */}
                    <a
                        href="https://www.playstation.com/ko-kr/ps-plus/?smcid=pdc%3Ako-kr%3Asupport-subscriptions%3Aprimary%20nav%3Amsg-store%3Aps-plus#subscriptions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-surface-hover hover:bg-ps-blue hover:text-white text-primary font-bold text-xs sm:text-sm border border-divider hover:border-ps-blue shadow-sm transition-all group shrink-0"
                    >
                        <Store className="w-4 h-4 text-ps-blue group-hover:text-white transition-colors" />
                        <span>공식 스토어</span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </header>

                {/* 💳 3열 티어 카드 그리드 (배경 깔끔하게 불투명화 & 폰트 크기 및 여백 확대) */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="relative rounded-3xl bg-surface/95 dark:bg-[#18181b]/95 border border-divider p-7 sm:p-8 flex flex-col h-[560px] overflow-hidden shadow-sm"
                            >
                                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-divider-strong to-transparent transform-gpu" />
                                <div className="w-12 h-12 rounded-2xl bg-surface-hover mb-4" />
                                <div className="w-28 h-7 rounded bg-surface-hover mb-4" />
                                <div className="w-44 h-10 rounded bg-surface-hover mb-6" />
                                <div className="space-y-3.5 flex-1">
                                    {[1, 2, 3, 4, 5].map((j) => (
                                        <div key={j} className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-surface-hover" />
                                            <div className="w-3/4 h-4 rounded bg-surface-hover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full h-12 rounded-xl bg-surface-hover mt-auto" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                        {/* 1. Essential (슬레이트 실버) */}
                        <GoldenPricingCard
                            tier="ESSENTIAL"
                            name="에센셜"
                            subName="ESSENTIAL"
                            price={prices?.ESSENTIAL?.[selectedDuration]}
                            discountPrice={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            benefits={TIER_BENEFITS.ESSENTIAL}
                            theme="basic"
                            icon={ShieldCheck}
                            durationMonths={currentDurationObj.months}
                            durationLabel={currentDurationObj.label}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                            onOpenChart={() => openChartModal('ESSENTIAL', '에센셜 (Essential)')}
                        />

                        {/* 2. Special (PS Plus Gold - MOST POPULAR HERO CARD) */}
                        <GoldenPricingCard
                            tier="SPECIAL"
                            name="스페셜"
                            subName="SPECIAL"
                            isPopular={true}
                            price={prices?.SPECIAL?.[selectedDuration]}
                            discountPrice={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.SPECIAL?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            benefits={TIER_BENEFITS.SPECIAL}
                            theme="gold"
                            icon={Gamepad2}
                            durationMonths={currentDurationObj.months}
                            durationLabel={currentDurationObj.label}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                            onOpenChart={() => openChartModal('SPECIAL', '스페셜 (Special)')}
                        />

                        {/* 3. Deluxe (PlayStation Ice Blue / Platinum) */}
                        <GoldenPricingCard
                            tier="DELUXE"
                            name="디럭스"
                            subName="DELUXE"
                            price={prices?.DELUXE?.[selectedDuration]}
                            discountPrice={prices?.DELUXE?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.DELUXE?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.DELUXE?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            benefits={TIER_BENEFITS.DELUXE}
                            theme="premium"
                            icon={Sparkles}
                            durationMonths={currentDurationObj.months}
                            durationLabel={currentDurationObj.label}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                            onOpenChart={() => openChartModal('DELUXE', '디럭스 (Deluxe)')}
                        />
                    </div>
                )}
            </div>

            {/* 📊 역대 가격 추이 모달 */}
            {chartModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={closeChartModal}>
                    <div className="bg-surface border border-divider-strong rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-ps-blue/10 text-ps-blue">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-primary">{chartModal.title}</h3>
                                    <p className="text-xs text-secondary font-medium">{currentDurationObj.label} 구독권 역대 가격 변동</p>
                                </div>
                            </div>
                            <button onClick={closeChartModal} className="p-2 rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="pt-2">
                            <PriceChart historyData={activeChartHistory} lowestPrice={activeLowestPrice} />
                        </div>
                    </div>
                </div>
            )}

            <HelpModal
                isOpen={helpInfo.isOpen}
                type={helpInfo.type}
                onClose={handleCloseHelp}
            />
        </div>
    );
};

/* 🃏 시각적 위계와 대비가 한층 강화된 골든 밸런스 티어 카드 */
const GoldenPricingCard = ({
    name,
    subName,
    isPopular = false,
    price,
    discountPrice,
    discountRate,
    saleEndDate,
    benefits,
    theme,
    icon: Icon,
    durationMonths,
    durationLabel,
    onCatalogClick,
    onMonthlyGamesClick,
    onExclusiveClick,
    onOpenChart
}) => {
    const themeStyles = {
        basic: {
            border: 'border-divider hover:border-divider-strong',
            bgGlow: 'bg-slate-400/5',
            iconBox: 'bg-surface border-divider text-secondary',
            tag: 'border-divider text-secondary bg-base',
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

    return (
        <div className={`relative overflow-hidden rounded-3xl bg-surface/95 dark:bg-[#18181b]/95 backdrop-blur-xl border p-6 sm:p-7 lg:p-8 flex flex-col justify-between transition-all duration-300 group shadow-sm ${style.border} ${
            isPopular ? 'lg:-translate-y-2 lg:scale-[1.01] shadow-xl z-20' : 'z-10'
        }`}>
            {/* 내부 앰비언트 글로우 */}
            <div className={`absolute top-0 right-0 w-48 h-48 ${style.bgGlow} blur-3xl rounded-full pointer-events-none transition-all duration-500 group-hover:scale-150`} />

            {/* 🌟 MOST POPULAR 리본 (스페셜 전용) */}
            {isPopular && (
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
                    <div className="px-3 py-1 rounded-full bg-yellow-500 text-black text-[10px] sm:text-[11px] font-black tracking-wider flex items-center gap-1 shadow-md">
                        <Flame className="w-3.5 h-3.5 fill-black stroke-black" />
                        <span>MOST POPULAR</span>
                    </div>
                </div>
            )}

            <div className="relative z-10 flex-1 flex flex-col">
                {/* 1. 상단 티어 헤더 */}
                <div className="flex items-center gap-3.5 mb-5 sm:mb-6">
                    <div className={`p-3 rounded-2xl border ${style.iconBox} shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-primary tracking-tight">{name}</h2>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${style.tag}`}>
                                {subName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. 압도적인 가격 강조 (크기 확대 & 선명한 위계) */}
                <div className="mb-5 sm:mb-6 flex flex-col">
                    {discountPrice && discountPrice > 0 ? (
                        <>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-bold text-muted line-through">
                                    ₩{price?.toLocaleString()}
                                </span>
                                <span className="px-2 py-0.5 rounded font-black text-[11px] bg-red-500/10 border border-red-500/30 text-red-500">
                                    -{discountRate}%
                                </span>
                                {saleEndDate && (
                                    <span className="text-[11px] text-red-500 font-bold flex items-center gap-1 ml-auto">
                                        <Clock className="w-3 h-3 animate-pulse" />
                                        {formatSaleEndDate(saleEndDate)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5 flex-nowrap">
                                <span className="text-4xl sm:text-5xl font-black text-primary tracking-tight">
                                    ₩{discountPrice.toLocaleString()}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-secondary">/ {durationLabel}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-baseline gap-1.5 flex-nowrap">
                            <span className="text-4xl sm:text-5xl font-black text-primary tracking-tight">
                                ₩{price ? price.toLocaleString() : '---'}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-secondary">/ {durationLabel}</span>
                        </div>
                    )}

                    {/* 월 환산 가성비 뱃지 */}
                    {monthlyEquivalent && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-base border border-divider self-start">
                            <span className="text-[11px] font-medium text-secondary">월 환산 시</span>
                            <span className="text-[12px] font-black text-primary">₩{monthlyEquivalent.toLocaleString()}원</span>
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-divider mb-5 sm:mb-6" />

                {/* 3. [NO BOX NOISE] 정갈하고 가독성 높은 수직 체크리스트 */}
                <ul className="space-y-3 sm:space-y-3.5 flex-1 mb-6 sm:mb-8">
                    {benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <div className="shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center">
                                <Check className={`w-4 h-4 stroke-[3] ${
                                    benefit.highlight ? style.checkIcon : 'text-secondary'
                                }`} />
                            </div>
                            <span
                                className={`text-sm leading-snug ${
                                    benefit.highlight
                                        ? style.highlightText
                                        : benefit.isBase
                                            ? 'text-primary font-bold'
                                            : 'text-secondary font-medium'
                                }`}
                            >
                                {benefit.name}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* 4. 정교한 3-Tier 버튼 그룹 */}
                <div className="mt-auto flex flex-col gap-2.5 pt-3 border-t border-divider">
                    {onCatalogClick ? (
                        <button
                            onClick={onCatalogClick}
                            className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${style.btnPrimary}`}
                        >
                            <span>게임 카탈로그 둘러보기</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={onMonthlyGamesClick}
                            className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${style.btnPrimary}`}
                        >
                            <CalendarDays className="w-4 h-4" />
                            <span>이번 달 월간 게임 보기</span>
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {onMonthlyGamesClick && onCatalogClick && (
                            <button
                                onClick={onMonthlyGamesClick}
                                className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-ps-blue/30 bg-ps-blue/5 text-ps-blue hover:bg-ps-blue/10"
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span>월간 게임</span>
                            </button>
                        )}
                        {onExclusiveClick && (
                            <button
                                onClick={onExclusiveClick}
                                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-yellow-500/30 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 ${
                                    !onCatalogClick ? 'col-span-2' : ''
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>PLUS 할인</span>
                            </button>
                        )}
                    </div>

                    <div className="w-full h-px bg-divider mt-0.5" />

                    {/* 역대 가격 변동 모달 트리거 */}
                    <button
                        onClick={onOpenChart}
                        className="py-1 text-[11px] sm:text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>역대 가격 변동 추이</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PsPlusPricingPage;
