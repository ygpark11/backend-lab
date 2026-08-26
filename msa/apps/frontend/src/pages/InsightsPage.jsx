import React, { useEffect, useState } from 'react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Circle,
    Clock,
    Cpu,
    Database,
    Download,
    Flame,
    Gamepad2,
    Globe,
    Heart,
    Info,
    Layers,
    Plus,
    Radio,
    RefreshCw,
    Server,
    Shield,
    Sparkles,
    Square,
    Star,
    Terminal,
    Timer,
    TrendingDown,
    Triangle,
    Trophy,
    X as XIcon,
    Zap
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import client from '../api/client';
import PSLoader from '../components/PSLoader';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { adminApi } from '../api/adminApi';
import DonationModal from '../components/DonationModal';
import HelpModal from '../components/common/HelpModal';
import SEO from '../components/common/SEO';

const formatCurrency = (amount) => {
    if (!amount) return '0';
    if (amount >= 100000000) {
        return (amount / 100000000).toFixed(1) + '억';
    } else if (amount >= 10000) {
        return Math.floor(amount / 10000).toLocaleString() + '만';
    }
    return amount.toLocaleString();
};

const formatDate = (dateString) => {
    if (!dateString || dateString === '기록 없음') return '방금 전';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
};

const InsightsPage = () => {
    const navigate = useTransitionNavigate();
    const { isAdmin } = useCurrentUser();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDonationOpen, setIsDonationOpen] = useState(false);

    const [helpInfo, setHelpInfo] = useState({ isOpen: false, type: null });

    const handleRefreshCache = (e) => {
        e.stopPropagation();

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[260px] bg-surface text-primary p-3 border border-divider rounded-xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-red-600 dark:text-red-500">캐시 강제 초기화</h4>
                        <p className="text-xs text-secondary">인사이트 통계를 즉시 재집계할까요?</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-1">
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            setIsRefreshing(true);
                            const loadId = toast.loading('기존 캐시 삭제 및 데이터 재수집 중...');

                            try {
                                await adminApi.clearAllCaches();
                                const response = await client.get('/api/v1/insights/summary');
                                setStats(response.data);
                                toast.success('최신 데이터로 갱신되었습니다!', { id: loadId });
                            } catch (error) {
                                console.error('Cache clear failed:', error);
                                toast.error('캐시 초기화에 실패했습니다. 관리자 권한을 확인하세요.', { id: loadId });
                            } finally {
                                setIsRefreshing(false);
                            }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        네, 갱신합니다
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-1 bg-base hover:bg-surface-hover text-secondary hover:text-primary border border-divider py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { background: 'transparent', boxShadow: 'none', padding: 0 } });
    };

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const response = await client.get('/api/v1/insights/summary');
                setStats(response.data);
            } catch (error) {
                console.error('인사이트 데이터 로딩 실패:', error);
                toast.error('통계 데이터를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading || !stats) {
        return (
            <div className="min-h-screen bg-base pt-24 flex justify-center transition-colors duration-500">
                <PSLoader />
            </div>
        );
    }

    const hasClosingSoon = stats.closingSoonCount > 0;
    const hasNewDeals = stats.newDiscountCount > 0;
    const ptTotal = (stats.ptShortCount || 0) + (stats.ptMediumCount || 0) + (stats.ptLongCount || 0) + (stats.ptEpicCount || 0);

    const verdictTotal = (stats.verdictBuyNow || 0) + (stats.verdictGoodOffer || 0) + (stats.verdictWait || 0) + (stats.verdictTracking || 0);
    const verdictPct = (n) => verdictTotal > 0 ? Math.round((n / verdictTotal) * 100) : 0;

    const bnPct = verdictPct(stats.verdictBuyNow || 0);
    const goPct = verdictPct(stats.verdictGoodOffer || 0);
    const wtPct = verdictPct(stats.verdictWait || 0);
    const trPct = verdictPct(stats.verdictTracking || 0);

    // 실제 백엔드 동기화 필드명 맵핑
    const trackedCount = stats.totalTrackedCount || stats.totalTrackedGames || 0;
    const lastSync = stats.lastSyncTime || stats.lastCollectedAt;
    const wishlistCount = stats.totalWishlistCount || 0;

    return (
        <div className="min-h-screen bg-base text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors duration-500">
            <SEO
                title="인사이트"
                description="플레이스테이션 게임 가격 동향, 역대 최저가 갱신, 할인율 통계, 플레이타임별 분석 데이터"
                url="https://ps-signal.com/insights"
            />

            {/* 🌌 Atmospheric Aurora Glows */}
            <div className="hidden md:block absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] pointer-events-none bg-ps-blue/15 dark:bg-ps-blue/10 transition-colors duration-500" />
            <div className="hidden md:block absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] pointer-events-none bg-emerald-500/10 dark:bg-cyan-500/10 transition-colors duration-500" />

            {/* PlayStation Symbol Silhouettes (Decorative Background) */}
            <div className="absolute top-20 right-10 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                <Triangle className="w-40 h-40 stroke-[2px]" />
                <Circle className="w-40 h-40 stroke-[2px]" />
                <XIcon className="w-40 h-40 stroke-[2px]" />
                <Square className="w-40 h-40 stroke-[2px]" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">

                {/* 1. Header Section */}
                <div className="mb-8 sm:mb-10 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-ps-blue/10 border border-ps-blue/30 text-ps-blue">
                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                            Live Market Telemetry
                        </span>
                        {/* 관리자(Admin) 권한 보유자에게만 노출 */}
                        {isAdmin && (
                            <button
                                onClick={handleRefreshCache}
                                disabled={isRefreshing}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
                            >
                                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                관리자 캐시 초기화
                            </button>
                        )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 flex items-center gap-3 tracking-tight">
                        <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-ps-blue shrink-0" />
                        Market Insights
                    </h1>
                    <p className="text-secondary dark:text-zinc-400 font-medium text-sm sm:text-base max-w-2xl break-keep">
                        플레이스테이션 스토어의 실시간 가격 변동, 역대 최저가, 플레이타임 분포를 분석하는 종합 데이터 대시보드입니다.
                    </p>
                </div>

                <div className="space-y-8 sm:space-y-10">

                    {/* =========================================================================
                        Section 0: Luminous Price Signal Board (네온 글로우 가격 신호등)
                    ========================================================================= */}
                    <section className="animate-fadeIn" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
                        <div className="flex items-center justify-between mb-3.5">
                            <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-secondary dark:text-zinc-400 flex items-center gap-2">
                                <Radio className="w-4 h-4 text-ps-blue animate-pulse" /> Price Signal Board
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'VERDICT' }); }}
                                className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-divider"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        {/* 4 Neon Glass Signal Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {/* ○ BUY NOW (Green Neon) */}
                            <div className="relative overflow-hidden rounded-2xl border bg-green-500/10 dark:bg-green-500/15 border-green-500/30 p-4 sm:p-5 flex flex-col justify-between group hover:border-green-500/60 hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] transition-all duration-300">
                                <Circle className="absolute -right-4 -bottom-4 w-24 h-24 stroke-[1.5px] text-green-500/10 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div className="relative z-10 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Circle className="w-4 h-4 text-green-500 fill-green-500/30" />
                                            <span className="text-[10px] font-black tracking-widest uppercase text-green-700 dark:text-green-400">Buy Now</span>
                                        </div>
                                        <p className="text-xs font-black text-green-600 dark:text-green-300">지금 사도 좋아</p>
                                    </div>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30">
                                        {bnPct}%
                                    </span>
                                </div>
                                <div className="relative z-10 mt-4">
                                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-green-600 dark:text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                                        {(stats.verdictBuyNow || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-extrabold text-green-600/70 dark:text-green-400/70 ml-1">개</span>
                                </div>
                            </div>

                            {/* △ GOOD OFFER (Yellow Neon) */}
                            <div className="relative overflow-hidden rounded-2xl border bg-yellow-500/10 dark:bg-yellow-500/15 border-yellow-500/30 p-4 sm:p-5 flex flex-col justify-between group hover:border-yellow-500/60 hover:shadow-[0_0_25px_rgba(234,179,8,0.2)] transition-all duration-300">
                                <Triangle className="absolute -right-4 -bottom-4 w-24 h-24 stroke-[1.5px] text-yellow-500/10 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div className="relative z-10 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Triangle className="w-4 h-4 text-yellow-500 fill-yellow-500/30" />
                                            <span className="text-[10px] font-black tracking-widest uppercase text-yellow-700 dark:text-yellow-400">Good Offer</span>
                                        </div>
                                        <p className="text-xs font-black text-yellow-600 dark:text-yellow-300">괜찮은 가격</p>
                                    </div>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
                                        {goPct}%
                                    </span>
                                </div>
                                <div className="relative z-10 mt-4">
                                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-yellow-600 dark:text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]">
                                        {(stats.verdictGoodOffer || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-extrabold text-yellow-600/70 dark:text-yellow-400/70 ml-1">개</span>
                                </div>
                            </div>

                            {/* × WAIT (Red Neon) */}
                            <div className="relative overflow-hidden rounded-2xl border bg-red-500/10 dark:bg-red-500/15 border-red-500/30 p-4 sm:p-5 flex flex-col justify-between group hover:border-red-500/60 hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] transition-all duration-300">
                                <XIcon className="absolute -right-4 -bottom-4 w-24 h-24 stroke-[1.5px] text-red-500/10 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div className="relative z-10 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <XIcon className="w-4 h-4 text-red-500" />
                                            <span className="text-[10px] font-black tracking-widest uppercase text-red-700 dark:text-red-400">Wait</span>
                                        </div>
                                        <p className="text-xs font-black text-red-600 dark:text-red-300">더 기다려요</p>
                                    </div>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
                                        {wtPct}%
                                    </span>
                                </div>
                                <div className="relative z-10 mt-4">
                                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-red-600 dark:text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                                        {(stats.verdictWait || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-extrabold text-red-600/70 dark:text-red-400/70 ml-1">개</span>
                                </div>
                            </div>

                            {/* □ TRACKING (PS-Blue Neon) */}
                            <div className="relative overflow-hidden rounded-2xl border bg-ps-blue/10 dark:bg-ps-blue/15 border-ps-blue/30 p-4 sm:p-5 flex flex-col justify-between group hover:border-ps-blue/60 hover:shadow-[0_0_25px_rgba(0,112,209,0.2)] transition-all duration-300">
                                <Square className="absolute -right-4 -bottom-4 w-24 h-24 stroke-[1.5px] text-ps-blue/10 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div className="relative z-10 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Square className="w-4 h-4 text-ps-blue fill-ps-blue/20" />
                                            <span className="text-[10px] font-black tracking-widest uppercase text-blue-700 dark:text-blue-400">Tracking</span>
                                        </div>
                                        <p className="text-xs font-black text-blue-600 dark:text-blue-300">지켜보는 중</p>
                                    </div>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-ps-blue/20 text-blue-700 dark:text-blue-300 border border-ps-blue/30">
                                        {trPct}%
                                    </span>
                                </div>
                                <div className="relative z-10 mt-4">
                                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-blue-700 dark:text-ps-blue drop-shadow-[0_0_12px_rgba(0,112,209,0.3)]">
                                        {(stats.verdictTracking || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-extrabold text-blue-700/70 dark:text-blue-400/70 ml-1">개</span>
                                </div>
                            </div>
                        </div>

                        {/* 4-Segment Luminous Market Proportion Bar */}
                        {verdictTotal > 0 && (
                            <div className="mt-3.5 p-3 rounded-2xl bg-surface/90 border border-divider shadow-sm">
                                <div className="flex justify-between items-center text-[11px] font-extrabold text-secondary mb-2">
                                    <span className="flex items-center gap-1">
                                        <Shield className="w-3.5 h-3.5 text-ps-blue" />
                                        스토어 가격 상태 분포도
                                    </span>
                                    <span>총 {(verdictTotal).toLocaleString()}개 분석</span>
                                </div>
                                <div className="flex rounded-full overflow-hidden h-2.5 bg-base border border-divider">
                                    {bnPct > 0 && (
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                                            style={{ width: `${bnPct}%` }}
                                            title={`Buy Now: ${bnPct}%`}
                                        />
                                    )}
                                    {goPct > 0 && (
                                        <div
                                            className="bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-700"
                                            style={{ width: `${goPct}%` }}
                                            title={`Good Offer: ${goPct}%`}
                                        />
                                    )}
                                    {wtPct > 0 && (
                                        <div
                                            className="bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-700"
                                            style={{ width: `${wtPct}%` }}
                                            title={`Wait: ${wtPct}%`}
                                        />
                                    )}
                                    <div
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-ps-blue transition-all duration-700"
                                        title={`Tracking: ${trPct}%`}
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* =========================================================================
                        Section 1: 12-Column Grid (Market Radar 8열 + System Matrix 4열)
                    ========================================================================= */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 animate-fadeIn" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>

                        {/* ── Left 8-Column: Market Radar (행동 유도형 큐레이션) ── */}
                        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-secondary dark:text-zinc-400 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-ps-blue" /> Market Radar
                                </h2>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'RADAR' }); }}
                                    className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-divider"
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>

                            {/* 1. 역대 최저가 갱신 (Hero Card) */}
                            <div
                                onClick={() => navigate('/games?isAllTimeLow=true')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 sm:p-6 cursor-pointer group hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] transition-all duration-300"
                            >
                                <Triangle className="absolute -right-6 -bottom-6 w-36 h-36 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-red-500" />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-red-500 to-transparent pointer-events-none" />

                                <div className="relative z-10 flex flex-col justify-between gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                                                <Flame className="w-5 h-5 animate-pulse" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black tracking-widest uppercase text-red-500">Historical Anomaly</span>
                                                <h3 className="text-lg sm:text-xl font-black text-primary leading-tight">역대 최저가 타이틀</h3>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-base border border-divider flex items-center justify-center group-hover:bg-red-500 group-hover:border-red-500 group-hover:text-white text-secondary transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>

                                    <div className="flex items-baseline justify-between mt-2 pt-3 border-t border-divider/60">
                                        <div>
                                            <p className="text-xs text-secondary font-bold">출시 이래 가장 저렴한 가격에 도달한 게임들</p>
                                        </div>
                                        <div className="text-4xl sm:text-5xl font-black text-primary tracking-tighter text-right">
                                            {stats.allTimeLowCount?.toLocaleString()}
                                            <span className="text-sm font-extrabold text-red-500 ml-1.5">개</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. 2-Grid: 마감 임박 + 신규 할인 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* 마감 임박 */}
                                <div
                                    onClick={() => navigate('/games?isClosingSoon=true')}
                                    className={`relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 cursor-pointer group transition-all duration-300 ${
                                        hasClosingSoon ? 'hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.15)]' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                <Timer className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-black tracking-wider uppercase text-orange-500">Closing Soon</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="text-base font-black text-primary mb-2">할인 마감 임박</h3>
                                    <div className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">
                                        {stats.closingSoonCount?.toLocaleString() || 0}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                </div>

                                {/* 신규 할인 */}
                                <div
                                    onClick={() => navigate('/games?isNewDiscount=true')}
                                    className={`relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 cursor-pointer group transition-all duration-300 ${
                                        hasNewDeals ? 'hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-ps-blue border border-blue-500/20">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-black tracking-wider uppercase text-ps-blue">New Deals</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="text-base font-black text-primary mb-2">따끈한 신규 할인</h3>
                                    <div className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">
                                        {stats.newDiscountCount?.toLocaleString() || 0}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. 진행 중인 스토어 할인 규모 (Market Volume) */}
                            <div
                                onClick={() => navigate('/games?minDiscountRate=1')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 cursor-pointer group hover:border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.1)] transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-xl bg-base border border-divider flex items-center justify-center group-hover:border-green-500/50 transition-colors shrink-0">
                                        <TrendingDown className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-secondary uppercase tracking-wider">Market Volume</span>
                                        <p className="text-base font-black text-primary">진행 중인 스토어 할인 규모</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end">
                                    <div>
                                        <p className="text-[10px] text-secondary font-bold uppercase mb-0.5">할인 중 타이틀</p>
                                        <p className="text-xl sm:text-2xl font-black text-primary">
                                            {stats.totalDiscountedGames?.toLocaleString()}
                                            <span className="text-xs text-secondary font-medium ml-1">개</span>
                                        </p>
                                    </div>
                                    <div className="w-[1px] h-8 bg-divider" />
                                    <div>
                                        <p className="text-[10px] text-secondary font-bold uppercase mb-0.5">쏟아지는 총 할인액</p>
                                        <p className="text-xl sm:text-2xl font-black text-green-400">
                                            {formatCurrency(stats.totalDiscountAmount)}
                                            <span className="text-xs text-secondary font-medium ml-1">원</span>
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* ── Right 4-Column: System Matrix (실시간 데이터 연동 텔레메트리 콘솔) ── */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-secondary dark:text-zinc-400 flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-teal-400" /> System Matrix
                                </h2>
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    ONLINE
                                </span>
                            </div>

                            {/* Terminal Console Card */}
                            <div className="rounded-2xl border border-divider-strong bg-surface/95 dark:bg-surface/90 p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-md relative overflow-hidden h-full">
                                <div className="bg-base/90 rounded-xl border border-divider p-4 font-mono text-xs text-secondary flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between pb-2 border-b border-divider/60 text-muted text-[10px]">
                                        <span>PS_TRACKER_TELEMETRY</span>
                                        <span className="text-emerald-400 font-bold">STATUS: OK</span>
                                    </div>
                                    <div className="text-teal-400 font-bold">&gt; DAEMON: PS_COLLECTOR_V4</div>
                                    <div className="text-primary font-medium">&gt; LAST_SYNC: {formatDate(lastSync)}</div>
                                    <div className="text-secondary">&gt; TRACKED_TITLES: {trackedCount.toLocaleString()}개</div>
                                    <div className="text-pink-400 font-bold">&gt; USER_WISHLIST: {wishlistCount.toLocaleString()}회 찜 등록</div>
                                    <div className="text-secondary">&gt; REGION: KR (PlayStation Store)</div>

                                    <div className="mt-2 pt-2 border-t border-divider/60 flex flex-col gap-1.5 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-muted">CRAWLER_HEALTH:</span>
                                            <span className="text-emerald-400 font-bold">100% OPERATIONAL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">SYNC_INTERVAL:</span>
                                            <span className="text-primary font-bold">AUTO_HOURLY</span>
                                        </div>
                                    </div>

                                    <div className="mt-1 animate-pulse text-teal-400">&gt; _</div>
                                </div>

                                {/* 누적 찜 횟수 하이라이트 뱃지 & 서버 후원 */}
                                <div className="flex flex-col gap-2.5">
                                    {/* 누적 찜 횟수 카드 */}
                                    <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shrink-0">
                                                <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-extrabold uppercase text-secondary">User Activity</p>
                                                <p className="text-xs font-black text-primary">우리 사이트 누적 찜 횟수</p>
                                            </div>
                                        </div>
                                        <div className="text-base sm:text-lg font-black text-pink-500 tracking-tight">
                                            {wishlistCount.toLocaleString()}
                                            <span className="text-xs text-secondary font-medium ml-1">번</span>
                                        </div>
                                    </div>

                                    {/* 감자 서버 후원하기 버튼 */}
                                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                                <Server className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-amber-500">감자 서버 밥 주기</p>
                                                <p className="text-[10px] text-secondary font-medium">게임값을 아끼셨다면 후원을!</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsDonationOpen(true)}
                                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs transition-colors shrink-0"
                                        >
                                            후원하기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* =========================================================================
                        Section 2: Playtime Profiles (볼륨 분포도 인포그래픽 차트)
                    ========================================================================= */}
                    <section className="animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                        <div className="flex items-center justify-between mb-3.5">
                            <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-secondary dark:text-zinc-400 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-ps-blue" /> Playtime Profiles (HLTB)
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'PLAYTIME' }); }}
                                className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-divider"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {/* ⚡ 0-10h 주말 컷 */}
                            <div
                                onClick={() => navigate('/games?minPlayTime=0&maxPlayTime=10')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-extrabold uppercase">0-10h</span>
                                            <h3 className="text-sm font-black text-primary">주말 컷</h3>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">
                                        {stats.ptShortCount?.toLocaleString()}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                    {ptTotal > 0 && (
                                        <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                            <div
                                                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-700"
                                                style={{ width: `${Math.round((stats.ptShortCount || 0) / ptTotal * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 🎮 10-30h 정주행 */}
                            <div
                                onClick={() => navigate('/games?minPlayTime=10&maxPlayTime=30')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-blue-500/10 text-ps-blue border border-blue-500/20">
                                            <Gamepad2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase">10-30h</span>
                                            <h3 className="text-sm font-black text-primary">정주행</h3>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">
                                        {stats.ptMediumCount?.toLocaleString()}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                    {ptTotal > 0 && (
                                        <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                                                style={{ width: `${Math.round((stats.ptMediumCount || 0) / ptTotal * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 📚 30-100h 각 잡고 */}
                            <div
                                onClick={() => navigate('/games?minPlayTime=30&maxPlayTime=100')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase">30-100h</span>
                                            <h3 className="text-sm font-black text-primary">각 잡고</h3>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">
                                        {stats.ptLongCount?.toLocaleString()}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                    {ptTotal > 0 && (
                                        <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-700"
                                                style={{ width: `${Math.round((stats.ptLongCount || 0) / ptTotal * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 🏆 100h+ 타임머신 */}
                            <div
                                onClick={() => navigate('/games?minPlayTime=100')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.15)] transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                            <Trophy className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold uppercase">100h+</span>
                                            <h3 className="text-sm font-black text-primary">타임머신</h3>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">
                                        {stats.ptEpicCount?.toLocaleString()}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                    {ptTotal > 0 && (
                                        <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-700"
                                                style={{ width: `${Math.round((stats.ptEpicCount || 0) / ptTotal * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* =========================================================================
                        Section 3: PlayStation Charts (랭킹 보드)
                    ========================================================================= */}
                    <section className="animate-fadeIn" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
                        <div className="flex items-center justify-between mb-3.5">
                            <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-secondary dark:text-zinc-400 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-ps-blue" /> PlayStation Charts
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'CHARTS' }); }}
                                className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-divider"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* 갓겜 레이더 */}
                            <div
                                onClick={() => navigate('/games?minMetaScore=85&minDiscountRate=50')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 cursor-pointer group hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all duration-300 flex flex-col justify-between min-h-[140px]"
                            >
                                <Square className="absolute -right-4 -bottom-4 w-28 h-28 stroke-[2px] opacity-[0.03] text-primary rotate-12 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Star className="w-4 h-4 text-purple-500 fill-purple-500/30" />
                                            <span className="text-purple-500 font-black text-[10px] tracking-wider uppercase">Must Play</span>
                                        </div>
                                        <span className="text-[10px] font-extrabold text-secondary px-2 py-0.5 rounded-full bg-base border border-divider">
                                            메타 85+ &amp; 50%+ 할인
                                        </span>
                                    </div>
                                    <h3 className="text-base font-black text-primary">망설일 필요 없는 인증된 갓겜</h3>
                                </div>
                                <div className="flex items-end justify-between mt-4 pt-2 border-t border-divider/40">
                                    <div className="text-3xl font-black text-primary tracking-tighter">
                                        {stats.mustPlayCount?.toLocaleString()}
                                        <span className="text-xs text-secondary font-medium ml-1">개</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* 베스트셀러 */}
                            <div
                                onClick={() => navigate('/games?isBestSeller=true')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 cursor-pointer group hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all duration-300 flex flex-col justify-between min-h-[140px]"
                            >
                                <Triangle className="absolute -right-4 -bottom-4 w-28 h-28 stroke-[2px] opacity-[0.03] text-primary rotate-12 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Trophy className="w-4 h-4 text-amber-500" />
                                            <span className="text-amber-500 font-black text-[10px] tracking-wider uppercase">Top Sellers</span>
                                        </div>
                                        <span className="text-[10px] font-extrabold text-secondary px-2 py-0.5 rounded-full bg-base border border-divider">
                                            PS Store 공식
                                        </span>
                                    </div>
                                    <h3 className="text-base font-black text-primary">지갑이 열리는 중! 베스트셀러</h3>
                                </div>
                                <div className="flex items-end justify-between mt-4 pt-2 border-t border-divider/40">
                                    <span className="text-xs font-bold text-secondary">실시간 판매량 상위</span>
                                    <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* 최다 다운로드 */}
                            <div
                                onClick={() => navigate('/games?isMostDownloaded=true')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-5 cursor-pointer group hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] transition-all duration-300 flex flex-col justify-between min-h-[140px]"
                            >
                                <Circle className="absolute -right-4 -bottom-4 w-28 h-28 stroke-[2px] opacity-[0.03] text-primary rotate-12 group-hover:scale-110 transition-transform pointer-events-none" />
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Download className="w-4 h-4 text-cyan-500" />
                                            <span className="text-cyan-500 font-black text-[10px] tracking-wider uppercase">Most Downloaded</span>
                                        </div>
                                        <span className="text-[10px] font-extrabold text-secondary px-2 py-0.5 rounded-full bg-base border border-divider">
                                            PS Store 공식
                                        </span>
                                    </div>
                                    <h3 className="text-base font-black text-primary">지금 제일 핫한 최다 다운로드</h3>
                                </div>
                                <div className="flex items-end justify-between mt-4 pt-2 border-t border-divider/40">
                                    <span className="text-xs font-bold text-secondary">다운로드 랭킹 상위</span>
                                    <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* =========================================================================
                        Section 4: PlayStation Ecosystem (생태계 스펙 혜택)
                    ========================================================================= */}
                    <section className="animate-fadeIn" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                        <div className="flex items-center justify-between mb-3.5">
                            <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-secondary dark:text-zinc-400 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-ps-blue" /> PlayStation Ecosystem
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'ECOSYSTEM' }); }}
                                className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-divider"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* ✨ PS5 Pro 향상 꿀딜 (PS5 Pro 메탈릭 실버/플래티넘 아이덴티티) */}
                            <div
                                onClick={() => navigate('/games?isPs5ProEnhanced=true')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-zinc-300 dark:hover:border-zinc-500 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="p-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 group-hover:scale-110 transition-transform shadow-sm">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block mb-0.5">PS5 Pro Enhanced</span>
                                        <h3 className="text-sm font-black text-primary">Pro 향상 꿀딜</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-primary">{(stats.ps5ProCount || 0).toLocaleString()}</span>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* 🎮 스페셜/디럭스 카탈로그 무료 (구독제 무료 혜택) */}
                            <div
                                onClick={() => navigate('/games?inCatalog=true')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] transition-all duration-300 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="p-2.5 rounded-xl bg-base border border-yellow-500/50 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors shadow-sm">
                                        <Gamepad2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-wider block mb-0.5">PS Plus Extra / Deluxe</span>
                                        <h3 className="text-sm font-black text-primary">구독제 무료 혜택</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-primary">{(stats.inCatalogCount || 0).toLocaleString()}</span>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* ➕ PLUS 전용 혜택 */}
                            <div
                                onClick={() => navigate('/games?isPlusExclusive=true')}
                                className="relative overflow-hidden rounded-2xl bg-surface/95 dark:bg-surface/90 border border-divider-strong p-4 sm:p-5 cursor-pointer group hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] transition-all duration-300 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="p-2.5 rounded-xl bg-yellow-500 text-black font-black group-hover:scale-110 transition-transform shadow-sm">
                                        <Plus className="w-5 h-5" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-wider block mb-0.5">PS Plus Exclusive</span>
                                        <h3 className="text-sm font-black text-primary">PLUS 전용 혜택</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-primary">{(stats.plusExclusiveCount || 0).toLocaleString()}</span>
                                    <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* Modals */}
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
            <HelpModal isOpen={helpInfo.isOpen} onClose={() => setHelpInfo({ isOpen: false, type: null })} type={helpInfo.type} />
        </div>
    );
};

export default InsightsPage;
