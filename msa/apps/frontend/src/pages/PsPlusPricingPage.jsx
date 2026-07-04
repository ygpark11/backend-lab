import React, {useCallback, useEffect, useState} from 'react';
import { ArrowRight, Check, ChevronDown, Gamepad2, Info, Plus, ShieldCheck, Sparkles, X, CalendarDays, ExternalLink, Clock } from 'lucide-react';
import {useTransitionNavigate} from '../hooks/useTransitionNavigate';
import client from '../api/client';
import PSLoader from '../components/PSLoader';
import SEO from '../components/common/SEO';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import HelpModal from '../components/common/HelpModal';

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
            <SEO title="PS Plus 요금제" description="PlayStation Plus 에센셜, 스페셜, 디럭스 구독권 가격 비교" url="https://ps-signal.com/ps-plus" />

            <div className="hidden md:block absolute top-[10%] left-[5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-yellow-500/10 transition-colors duration-500"></div>
            <div className="hidden md:block absolute bottom-[10%] right-[5%] w-[30%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-blue-500/10 transition-colors duration-500"></div>

            <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-0">
                <div className="mb-12 flex flex-col items-center text-center animate-fadeIn">
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 mb-6">
                        <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2.5} />
                    </div>

                    <div className="flex items-center justify-center gap-3 mb-4">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                            어떤 <span className="text-yellow-500">플랜</span>이 적합할까요?
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
                                className={`relative px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2
                                    ${selectedDuration === btn.id
                                    ? 'bg-primary text-[color:var(--color-bg-base)] shadow-md'
                                    : 'text-secondary hover:text-primary'}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 animate-fadeIn" style={{ animationDelay: '150ms' }}>
                        <a
                            href="https://www.playstation.com/ko-kr/ps-plus/?smcid=pdc%3Ako-kr%3Asupport-subscriptions%3Aprimary%20nav%3Amsg-store%3Aps-plus#subscriptions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative inline-flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-surface hover:bg-surface-hover border border-divider shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative z-10 bg-[#00439c] text-white p-2 rounded-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                            <div className="relative z-10 flex flex-col items-start mr-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5 leading-none">
                                    Official PlayStation™ Store
                                </span>
                                <span className="text-sm sm:text-base font-black text-primary leading-none group-hover:text-ps-blue transition-colors">
                                    공식 스토어 구독하러 가기
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    <div className="w-[85vw] sm:w-[60vw] md:w-auto shrink-0 snap-center h-full">
                        <PricingCard
                            tier="ESSENTIAL"
                            name="에센셜"
                            price={prices?.ESSENTIAL?.[selectedDuration]}
                            discountPrice={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.ESSENTIAL?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            historyData={history?.ESSENTIAL?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.ESSENTIAL}
                            theme="basic"
                            icon={ShieldCheck}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                        />
                    </div>

                    <div className="w-[85vw] sm:w-[60vw] md:w-auto shrink-0 snap-center h-full">
                        <PricingCard
                            tier="SPECIAL"
                            name="스페셜"
                            price={prices?.SPECIAL?.[selectedDuration]}
                            discountPrice={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.SPECIAL?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.SPECIAL?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            historyData={history?.SPECIAL?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.SPECIAL}
                            theme="gold"
                            icon={Gamepad2}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
                        />
                    </div>

                    <div className="w-[85vw] sm:w-[60vw] md:w-auto shrink-0 snap-center h-full">
                        <PricingCard
                            tier="DELUXE"
                            name="디럭스"
                            price={prices?.DELUXE?.[selectedDuration]}
                            discountPrice={prices?.DELUXE?.[selectedDuration.replace('price', 'discountPrice')]}
                            discountRate={prices?.DELUXE?.[selectedDuration.replace('price', 'discountRate')] || 0}
                            saleEndDate={prices?.DELUXE?.[selectedDuration.replace('price', 'saleEndDate')] || null}
                            historyData={history?.DELUXE?.[selectedDuration] || []}
                            benefits={PS_PLUS_BENEFITS.DELUXE}
                            theme="premium"
                            icon={Sparkles}
                            onCatalogClick={() => navigate('/games?inCatalog=true')}
                            onExclusiveClick={() => navigate('/games?isPlusExclusive=true')}
                            onMonthlyGamesClick={() => navigate('/monthly-games')}
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

const formatSaleEndDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const PricingCard = ({ name, price, discountPrice, discountRate, saleEndDate, historyData, benefits, theme, icon: Icon, onCatalogClick, onExclusiveClick, onMonthlyGamesClick }) => {

    const themeStyles = {
        basic: {
            border: 'border-divider',
            borderHover: 'hover:border-divider-strong',
            bgFrom: 'bg-surface',
            text: 'text-secondary',
            highlightBg: 'bg-gray-500 text-white'
        },
        gold: {
            border: 'border-yellow-500/60',
            borderHover: 'hover:border-yellow-500',
            bgFrom: 'bg-yellow-500/10',
            text: 'text-yellow-500',
            highlightBg: 'bg-yellow-500 text-black'
        },
        premium: {
            border: 'border-divider-strong',
            borderHover: 'hover:border-amber-500/50',
            bgFrom: 'bg-surface',
            text: 'text-amber-500',
            highlightBg: 'bg-amber-600 text-white'
        }
    };

    const style = themeStyles[theme];
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const activeBenefits = benefits.filter(b => b.active);
    const inactiveBenefits = benefits.filter(b => !b.active);

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
        <div className={`relative overflow-hidden rounded-3xl bg-glass backdrop-blur-xl border p-8 flex flex-col h-full transition-all duration-300 group
            ${style.border} ${style.borderHover} md:hover:shadow-lg md:hover:-translate-y-2
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
                            <div className="flex items-end gap-3 flex-wrap">
                                <span className="text-4xl font-black text-primary tracking-tighter">
                                    ₩{discountPrice.toLocaleString()}
                                </span>
                                <span className="text-secondary font-medium mb-1">/ 선택기간</span>
                            </div>
                            {discountRate > 0 && (
                                <div className="flex flex-col gap-1.5 mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-lg font-black text-sm bg-ps-blue text-white shadow-md">
                                            -{discountRate}%
                                        </span>
                                        <span className="text-xs font-bold text-secondary">프로모션 진행 중</span>
                                    </div>
                                    {saleEndDate && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                            <span>할인 종료: {formatSaleEndDate(saleEndDate)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
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

                <ul className="space-y-3 flex-1 mb-6">
                    {activeBenefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                                ${benefit.highlight ? style.highlightBg : 'bg-surface border border-divider text-primary'}`}>
                                <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className={`text-sm leading-relaxed ${benefit.highlight ? 'font-black text-primary' : 'font-bold text-secondary'}`}>
                                {benefit.name}
                            </span>
                        </li>
                    ))}

                    {inactiveBenefits.length > 0 && (
                        <>
                            <li>
                                <button
                                    onClick={() => setShowInactive(p => !p)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-secondary transition-colors py-0.5"
                                >
                                    <ChevronDown className={`w-3 h-3 transition-transform ${showInactive ? 'rotate-180' : ''}`} />
                                    미포함 {inactiveBenefits.length}개 {showInactive ? '접기' : '보기'}
                                </button>
                            </li>
                            {showInactive && inactiveBenefits.map((benefit, idx) => (
                                <li key={`i-${idx}`} className="flex items-start gap-3 opacity-40">
                                    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-transparent border border-divider text-muted">
                                        <X className="w-3 h-3 stroke-[3]" />
                                    </div>
                                    <span className="text-sm leading-relaxed font-medium text-muted line-through decoration-muted">
                                        {benefit.name}
                                    </span>
                                </li>
                            ))}
                        </>
                    )}
                </ul>

                <div className="mt-auto flex flex-col gap-2">
                    {onCatalogClick && (
                        <button
                            onClick={onCatalogClick}
                            className="w-full py-3 rounded-xl bg-primary text-[color:var(--color-bg-base)] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md active:scale-95"
                        >
                            카탈로그 둘러보기 <ArrowRight className="w-4 h-4" />
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {onMonthlyGamesClick && (
                            <button
                                onClick={onMonthlyGamesClick}
                                className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95
                                    border border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10"
                            >
                                <CalendarDays className="w-3.5 h-3.5" /> 월간 게임
                            </button>
                        )}
                        {onExclusiveClick && (
                            <button
                                onClick={onExclusiveClick}
                                className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95
                                    border border-yellow-500/30 bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500/10"
                            >
                                PLUS 할인 <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    <div className="w-full h-px bg-divider mt-1"></div>

                    <button onClick={() => setIsChartOpen(!isChartOpen)} className="w-full py-2 text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1">
                        역대 가격 추이 보기 <ChevronDown className={`w-3 h-3 transition-transform ${isChartOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isChartOpen && (
                        <div className="pt-2 pb-1 animate-fadeIn border-t border-divider mt-2">
                            <PriceChart historyData={chartDataToRender} lowestPrice={lowestPrice} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PsPlusPricingPage;