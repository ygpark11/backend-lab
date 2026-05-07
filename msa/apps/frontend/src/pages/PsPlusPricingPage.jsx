import React, {useCallback, useEffect, useState} from 'react';
import {ArrowRight, Check, ChevronDown, Gamepad2, Info, Plus, ShieldCheck, Sparkles, X} from 'lucide-react';
import {useTransitionNavigate} from '../hooks/useTransitionNavigate';
import client from '../api/client';
import PSLoader from '../components/PSLoader';
import SEO from '../components/common/SEO';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import HelpModal from '../components/common/HelpModal';

const PS_PLUS_BENEFITS = {
    // ... (기존과 완벽히 동일하므로 생략 없이 풀버전 유지)
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

const PsPlusPricingPage = () => {
    const navigate = useTransitionNavigate();
    const [loading, setLoading] = useState(true);
    const [pricingData, setPricingData] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState('price12Month');
    const [helpInfo, setHelpInfo] = useState({ isOpen: false, type: null });

    const handleOpenHelp = useCallback((e, type) => {
        e.stopPropagation(); // 이벤트 버블링 방지
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

    if (loading) return <div className="min-h-screen bg-base pt-24 flex justify-center"><PSLoader /></div>;

    if (!pricingData || !pricingData.pricingData || Object.keys(pricingData.pricingData).length === 0) {
        return (
            <div className="min-h-screen bg-base pt-32 flex flex-col items-center text-center px-4">
                <div className="bg-surface border border-divider p-8 rounded-2xl max-w-md w-full shadow-lg">
                    <Gamepad2 className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-black text-primary mb-2">데이터 수집 중입니다</h2>
                    <p className="text-secondary text-sm">
                        현재 PS Plus 가격 정보를 불러오고 있습니다.<br/>잠시 후 다시 시도해 주세요.
                    </p>
                </div>
            </div>
        );
    }

    const prices = pricingData.pricingData;
    const history = pricingData.historyData || {};

    return (
        <div className="min-h-screen bg-base text-primary pt-24 pb-20 px-0 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors duration-500">
            <SEO title="PS Plus 요금제" description="PlayStation Plus 에센셜, 스페셜, 디럭스 구독권 가격 비교" />

            <div className="hidden md:block absolute top-[10%] left-[5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-yellow-500/10 dark:bg-yellow-500/5 transition-colors duration-500"></div>
            <div className="hidden md:block absolute bottom-[10%] right-[5%] w-[30%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-blue-500/10 dark:bg-blue-500/5 transition-colors duration-500"></div>

            <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-0">
                <div className="mb-12 flex flex-col items-center text-center animate-fadeIn">
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 mb-6">
                        <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2.5} />
                    </div>

                    <div className="flex items-center justify-center gap-3 mb-4">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                            어떤 <span className="text-yellow-600 dark:text-yellow-400">플랜</span>이 적합할까요?
                        </h1>
                        <button
                            onClick={(e) => handleOpenHelp(e, 'PS_PLUS')}
                            className="p-1.5 rounded-full text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                            aria-label="요금제 가이드 보기"
                        >
                            <Info className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
                        </button>
                    </div>

                    <p className="text-secondary font-bold mb-8">모든 혜택을 한눈에 비교하고 결정하세요.</p>

                    <div className="inline-flex bg-surface border border-divider p-1.5 rounded-full shadow-inner">
                        {[
                            { id: 'price1Month', label: '1개월' },
                            { id: 'price3Month', label: '3개월' },
                            { id: 'price12Month', label: '12개월' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setSelectedDuration(btn.id)}
                                className={`relative px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2
                                    ${selectedDuration === btn.id
                                    ? 'bg-primary text-[color:var(--color-bg-base)] shadow-md'
                                    : 'text-secondary hover:text-primary'}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    <div className="w-[85vw] sm:w-[60vw] md:w-auto shrink-0 snap-center h-full">
                        <PricingCard
                            tier="ESSENTIAL"
                            name="에센셜"
                            price={prices?.ESSENTIAL?.[selectedDuration]}
                            discountPrice={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            historyData={history?.ESSENTIAL?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.ESSENTIAL}
                            theme="basic"
                            icon={ShieldCheck}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                        />
                    </div>

                    <div className="w-[85vw] sm:w-[60vw] md:w-auto shrink-0 snap-center h-full">
                        <PricingCard
                            tier="SPECIAL"
                            name="스페셜"
                            price={prices?.SPECIAL?.[selectedDuration]}
                            discountPrice={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            historyData={history?.SPECIAL?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.SPECIAL}
                            theme="gold"
                            icon={Gamepad2}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                        />
                    </div>

                    <div className="w-[85vw] sm:w-[60vw] md:w-auto shrink-0 snap-center h-full">
                        <PricingCard
                            tier="DELUXE"
                            name="디럭스"
                            price={prices?.DELUXE?.[selectedDuration]}
                            discountPrice={prices?.DELUXE?.[selectedDuration.replace('price', 'discountPrice')]}
                            historyData={history?.DELUXE?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.DELUXE}
                            theme="premium"
                            icon={Sparkles}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                        />
                    </div>
                </div>
            </div>

            <HelpModal
                isOpen={helpInfo.isOpen}
                type={helpInfo.type}
                onClose={handleCloseHelp}
            />
        </div>
    );
};

const PricingCard = ({ tier, name, price, discountPrice, historyData, benefits, theme, icon: Icon, onCatalogClick, onExclusiveClick }) => {

    const themeStyles = {
        basic: {
            border: 'border-gray-300 dark:border-gray-600',
            bgFrom: 'bg-white dark:bg-zinc-800',
            text: 'text-gray-700 dark:text-gray-300',
            highlightBg: 'bg-gray-600 dark:bg-gray-500 text-white'
        },
        gold: {
            border: 'border-yellow-400 dark:border-yellow-500',
            bgFrom: 'bg-yellow-50 dark:bg-yellow-500/10',
            text: 'text-yellow-700 dark:text-yellow-400',
            highlightBg: 'bg-yellow-500 text-black'
        },
        premium: {
            border: 'border-gray-800 dark:border-zinc-800',
            bgFrom: 'bg-zinc-100 dark:bg-black',
            text: 'text-amber-700 dark:text-amber-500',
            highlightBg: 'bg-amber-600 dark:bg-amber-600 text-white'
        }
    };

    const style = themeStyles[theme];
    const [isChartOpen, setIsChartOpen] = useState(false);

    const chartDataToRender = historyData && historyData.length > 0 ? historyData : (price ? [
        {
            date: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
            price: price,
            discountRate: 0,
            verdict: 'TRACKING'
        }
    ] : []);

    return (
        <div className={`relative overflow-hidden rounded-3xl bg-glass backdrop-blur-xl border p-8 flex flex-col h-full transition-all duration-300 group
            ${style.border} hover:${style.border.replace('border', 'border-hover')} border-divider md:hover:shadow-lg md:hover:-translate-y-2
        `}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${style.bgFrom} to-transparent`}></div>

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-2xl ${style.bgFrom} border ${style.border}`}>
                        <Icon className={`w-6 h-6 ${style.text}`} />
                    </div>
                    <h2 className="text-2xl font-black text-primary">{name}</h2>
                </div>

                <div className="mb-8 flex flex-col">
                    {discountPrice && discountPrice > 0 ? (
                        <>
                            <span className="text-xl font-bold text-muted line-through decoration-muted mb-1">
                                ₩{price.toLocaleString()}
                            </span>
                            <div>
                                <span className="text-4xl font-black text-primary tracking-tighter">
                                    ₩{discountPrice.toLocaleString()}
                                </span>
                                <span className="text-secondary font-medium ml-1">/ 선택기간</span>
                            </div>
                        </>
                    ) : (
                        <div>
                            <span className="text-4xl font-black text-primary tracking-tighter">
                                ₩{price ? price.toLocaleString() : '---'}
                            </span>
                            <span className="text-secondary font-medium ml-1">/ 선택기간</span>
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-divider mb-6"></div>

                <ul className="space-y-4 flex-1 mb-8">
                    {benefits.map((benefit, idx) => (
                        <li key={idx} className={`flex items-start gap-3 ${!benefit.active ? 'opacity-40' : ''}`}>
                            <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center 
                                ${benefit.active
                                ? (benefit.highlight ? style.highlightBg : 'bg-surface border border-divider text-primary')
                                : 'bg-transparent border border-divider text-muted'}`}>
                                {benefit.active
                                    ? <Check className="w-3 h-3 stroke-[3]" />
                                    : <X className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className={`text-sm leading-relaxed 
                                ${benefit.active
                                ? (benefit.highlight ? 'font-black text-primary' : 'font-bold text-secondary')
                                : 'font-medium text-muted line-through decoration-muted'}`}>
                                {benefit.name}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="mt-auto flex flex-col gap-3">

                    {/* 카탈로그 둘러보기 (스페셜/디럭스 전용 - 항상 Primary) */}
                    {onCatalogClick && (
                        <button
                            onClick={onCatalogClick}
                            className="w-full py-3.5 rounded-xl bg-primary text-[color:var(--color-bg-base)] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                        >
                            카탈로그 게임 둘러보기 <ArrowRight className="w-4 h-4" />
                        </button>
                    )}

                    {onExclusiveClick && (
                        <button
                            onClick={onExclusiveClick}
                            className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                                border border-yellow-400/50 dark:border-yellow-500/30
                                bg-yellow-50/50 dark:bg-yellow-500/5
                                text-yellow-700 dark:text-yellow-400
                                hover:bg-yellow-100 dark:hover:bg-yellow-500/10"
                        >
                            PS Plus 추가 할인 보기 <Plus className="w-4 h-4" strokeWidth={3} />
                        </button>
                    )}

                    <div className="w-full h-px bg-divider my-1"></div>

                    <button onClick={() => setIsChartOpen(!isChartOpen)} className="w-full py-2 text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1">
                        역대 가격 추이 보기 <ChevronDown className={`w-3 h-3 transition-transform ${isChartOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isChartOpen && (
                        <div className="pt-2 pb-1 animate-fadeIn border-t border-divider mt-2">
                            <PriceChart historyData={chartDataToRender} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PsPlusPricingPage;