import React, { useState, useEffect } from 'react';
import {
    Flame, Star, TrendingDown, Activity, Database, Clock,
    ChevronRight, Heart, CircleDollarSign, RefreshCw,
    AlertTriangle, Server, Trophy, Download, Timer, Zap,
    Triangle, Circle, X as XIcon, Square, BarChart3, Radio
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import client from '../api/client';
import PSLoader from '../components/PSLoader';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { adminApi } from '../api/adminApi';
import DonationModal from '../components/DonationModal';

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
    if (!dateString || dateString === '기록 없음') return dateString;
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

    const handleRefreshCache = (e) => {
        e.stopPropagation();

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px] bg-surface text-primary p-2 border border-divider rounded-xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-red-600 dark:text-red-500">캐시 강제 초기화</h4>
                        <p className="text-xs text-secondary">인사이트 통계를 즉시 갱신할까요?</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={async () => {
                        toast.dismiss(t.id);
                        setIsRefreshing(true);
                        const loadId = toast.loading('기존 캐시 삭제 및 데이터 재수집 중...');

                        try {
                            await adminApi.clearInsightsCache();
                            const response = await client.get('/api/v1/insights/summary');
                            setStats(response.data);
                            toast.success('최신 데이터로 갱신되었습니다!', { id: loadId });
                        } catch (error) {
                            console.error('Cache clear failed:', error);
                            toast.error('캐시 초기화에 실패했습니다. 관리자 권한을 확인하세요.', { id: loadId });
                        } finally {
                            setIsRefreshing(false);
                        }
                    }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors">
                        네, 갱신합니다
                    </button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-base hover:bg-surface-hover text-secondary hover:text-primary border border-divider py-2 rounded-lg text-xs font-bold transition-colors">
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
                console.error("인사이트 데이터 로딩 실패:", error);
                toast.error("통계 데이터를 불러오지 못했습니다.");
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

    return (
        <div className="min-h-screen bg-base text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors duration-500">
            <div className="hidden md:block absolute top-[10%] left-[5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-cyan-500/10 dark:bg-cyan-500/5 transition-colors duration-500"></div>
            <div className="hidden md:block absolute bottom-[10%] right-[5%] w-[30%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-emerald-500/10 dark:bg-emerald-500/5 transition-colors duration-500"></div>

            <div className="absolute top-20 right-10 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                <Triangle className="w-40 h-40 stroke-[2px]" />
                <Circle className="w-40 h-40 stroke-[2px]" />
                <XIcon className="w-40 h-40 stroke-[2px]" />
                <Square className="w-40 h-40 stroke-[2px]" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                {/* 헤더 영역 */}
                <div className="mb-10 animate-fadeIn">
                    <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-ps-blue" />
                        PS Tracker Insights
                    </h1>
                    <p className="text-secondary font-bold">플레이스테이션 스토어의 흐름을 한눈에 파악하세요.</p>
                </div>

                <div className="space-y-12">

                    {/* ==========================================
                        Section 1: Market Radar (시장 동향)
                    ========================================== */}
                    <section className="animate-fadeIn" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-secondary mb-4 flex items-center gap-2">
                            <Radio className="w-4 h-4 text-ps-blue" /> Market Radar
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 역대 최저가 */}
                            <div onClick={() => navigate('/games?isAllTimeLow=true')} className="col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-6 group hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all duration-300">
                                <Triangle className="absolute -right-4 -bottom-4 w-32 h-32 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-red-500" />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-red-500 to-transparent"></div>

                                <div className="relative z-10 h-full flex flex-col justify-between min-h-[140px]">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                                            <span className="text-red-500 font-bold text-[10px] tracking-wider uppercase">All-Time Low</span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black text-primary leading-tight">역대 최저가 갱신</h3>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="text-5xl font-black text-primary tracking-tighter">
                                            {stats.allTimeLowCount?.toLocaleString()}<span className="text-lg text-red-500 ml-1">개</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-base border border-divider flex items-center justify-center group-hover:bg-red-500 group-hover:border-red-500 group-hover:text-white text-secondary transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 마감 임박 */}
                            <div onClick={() => navigate('/games?isClosingSoon=true')} className={`col-span-1 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-5 group transition-all duration-300 ${hasClosingSoon ? 'hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:border-ps-blue/30'}`}>
                                <Circle className="absolute -right-4 -bottom-4 w-24 h-24 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-orange-500" />
                                <div className={`absolute inset-0 opacity-0 transition-opacity bg-gradient-to-br from-orange-500 to-transparent ${hasClosingSoon ? 'group-hover:opacity-10' : ''}`}></div>

                                <div className="relative z-10 h-full flex flex-col justify-between min-h-[140px]">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Timer className={`w-4 h-4 ${hasClosingSoon ? 'text-orange-500' : 'text-secondary'}`} />
                                            <span className={`font-bold text-[10px] tracking-wider uppercase ${hasClosingSoon ? 'text-orange-500' : 'text-secondary'}`}>Closing Soon</span>
                                        </div>
                                        <h3 className="text-lg font-black text-primary leading-tight">할인 마감 임박</h3>
                                    </div>
                                    <div className="flex items-end justify-between mt-4">
                                        <div className={`text-4xl font-black tracking-tighter ${hasClosingSoon ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500' : 'text-secondary'}`}>
                                            {stats.closingSoonCount?.toLocaleString() || 0}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* 신규 할인 (Zero State 적용) */}
                            <div onClick={() => navigate('/games?isNewDiscount=true')} className={`col-span-1 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-5 group transition-all duration-300 ${hasNewDeals ? 'hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:border-ps-blue/30'}`}>
                                <XIcon className="absolute -right-4 -bottom-4 w-24 h-24 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-blue-500" />
                                <div className={`absolute inset-0 opacity-0 transition-opacity bg-gradient-to-br from-blue-500 to-transparent ${hasNewDeals ? 'group-hover:opacity-10' : ''}`}></div>

                                <div className="relative z-10 h-full flex flex-col justify-between min-h-[140px]">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Zap className={`w-4 h-4 ${hasNewDeals ? 'text-blue-500' : 'text-secondary'}`} />
                                            <span className={`font-bold text-[10px] tracking-wider uppercase ${hasNewDeals ? 'text-blue-500' : 'text-secondary'}`}>New Deals</span>
                                        </div>
                                        <h3 className="text-lg font-black text-primary leading-tight">따끈한 신규 할인</h3>
                                    </div>
                                    <div className="flex items-end justify-between mt-4">
                                        <div className={`text-4xl font-black tracking-tighter ${hasNewDeals ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500' : 'text-secondary'}`}>
                                            {stats.newDiscountCount?.toLocaleString() || 0}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* 총 할인 규모 (통합) */}
                            <div onClick={() => navigate('/games?minDiscountRate=1')} className="col-span-1 md:col-span-2 lg:col-span-4 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-5 group hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-r from-green-500 to-transparent"></div>

                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-base border border-divider flex items-center justify-center group-hover:border-green-500/50 transition-colors">
                                        <TrendingDown className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-0.5">Market Volume</h3>
                                        <p className="text-lg font-black text-primary">진행 중인 스토어 할인 규모</p>
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-center gap-6 md:gap-10 w-full md:w-auto bg-base md:bg-transparent p-4 md:p-0 rounded-xl border border-divider md:border-0">
                                    <div>
                                        <p className="text-[10px] text-secondary font-bold uppercase mb-1">할인 중인 타이틀</p>
                                        <p className="text-2xl font-black text-primary">{stats.totalDiscountedGames?.toLocaleString()}<span className="text-xs text-secondary font-medium ml-1">개</span></p>
                                    </div>
                                    <div className="w-[1px] h-10 bg-divider"></div>
                                    <div>
                                        <p className="text-[10px] text-secondary font-bold uppercase mb-1">쏟아지는 총 할인액</p>
                                        <p className="text-2xl font-black text-primary">{formatCurrency(stats.totalDiscountAmount)}<span className="text-xs text-secondary font-medium ml-1">원</span></p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors ml-auto md:ml-0" />
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* ==========================================
                        Section 2: PlayStation Charts (랭킹 보드)
                    ========================================== */}
                    <section className="animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-secondary mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-ps-blue" /> PlayStation Charts
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* 갓겜 레이더 */}
                            <div onClick={() => navigate('/games?minMetaScore=85&minDiscountRate=50')} className="relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-6 group hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-300">
                                <Square className="absolute -right-4 -bottom-4 w-32 h-32 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-purple-500" />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-purple-500 to-transparent"></div>

                                <div className="relative z-10 flex flex-col justify-between min-h-[140px]">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Star className="w-4 h-4 text-purple-500" />
                                            <span className="text-purple-500 font-bold text-[10px] tracking-wider uppercase">Must Play</span>
                                        </div>
                                        <h3 className="text-lg font-black text-primary leading-tight">망설일 필요 없는<br/>인증된 갓겜</h3>
                                    </div>
                                    <div className="flex items-end justify-between mt-4">
                                        <div className="text-4xl font-black text-primary tracking-tighter">
                                            {stats.mustPlayCount?.toLocaleString()}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* 베스트셀러 */}
                            <div onClick={() => navigate('/games?isBestSeller=true')} className="relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-6 group hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all duration-300">
                                <Triangle className="absolute -right-4 -bottom-4 w-32 h-32 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-amber-500" />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-amber-500 to-transparent"></div>

                                <div className="relative z-10 flex flex-col justify-between min-h-[140px]">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Trophy className="w-4 h-4 text-amber-500" />
                                            <span className="text-amber-500 font-bold text-[10px] tracking-wider uppercase">Top Sellers</span>
                                        </div>
                                        <h3 className="text-lg font-black text-primary leading-tight">지갑이 열리는 중!<br/>베스트셀러</h3>
                                    </div>
                                    <div className="flex items-end justify-end mt-4">
                                        <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* 최다 다운로드 */}
                            <div onClick={() => navigate('/games?isMostDownloaded=true')} className="relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-6 group hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300">
                                <Circle className="absolute -right-4 -bottom-4 w-32 h-32 stroke-[2px] opacity-[0.03] dark:opacity-[0.02] text-primary rotate-12 transition-transform group-hover:scale-110 group-hover:text-cyan-500" />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-cyan-500 to-transparent"></div>

                                <div className="relative z-10 flex flex-col justify-between min-h-[140px]">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Download className="w-4 h-4 text-cyan-500" />
                                            <span className="text-cyan-500 font-bold text-[10px] tracking-wider uppercase">Most Downloaded</span>
                                        </div>
                                        <h3 className="text-lg font-black text-primary leading-tight">지금 제일 핫한<br/>최다 다운로드</h3>
                                    </div>
                                    <div className="flex items-end justify-end mt-4">
                                        <ChevronRight className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* ==========================================
                        Section 3: System Matrix (시스템 현황)
                    ========================================== */}
                    <section className="animate-fadeIn" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-secondary mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-ps-blue" /> System Matrix
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 누적 찜 횟수 */}
                            <div className="relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-6 hover:border-pink-500/30 transition-all duration-300 flex items-center justify-between">
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                                        <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-0.5">User Activity</h3>
                                        <p className="text-sm font-bold text-primary">우리 사이트 누적 찜 횟수</p>
                                    </div>
                                </div>
                                <div className="relative z-10 text-2xl font-black text-primary tracking-tighter">
                                    {stats.totalWishlistCount?.toLocaleString()}<span className="text-xs text-secondary font-medium ml-1">번</span>
                                </div>
                            </div>

                            {/* 시스템 현황 */}
                            <div className="relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-6 hover:border-emerald-500/30 transition-all duration-300 flex items-center justify-between">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                        <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">System Online</h3>
                                    </div>
                                    <p className="text-sm font-bold text-primary">PS Tracker Daemon v2.4.1</p>
                                </div>
                                <div className="relative z-10 text-right">
                                    <p className="text-[10px] text-secondary font-bold uppercase mb-0.5">Tracked Titles</p>
                                    <p className="text-lg font-black text-primary">{stats.totalTrackedCount?.toLocaleString()}</p>
                                    <p className="text-[10px] text-secondary flex items-center justify-end gap-1 mt-1">
                                        <Clock className="w-3 h-3" /> {formatDate(stats.lastSyncTime)}
                                        {isAdmin && (
                                            <button onClick={handleRefreshCache} disabled={isRefreshing} className="p-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors ml-1 border border-emerald-500/20">
                                                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* 감자 서버 후원 (Full Width) */}
                            <div onClick={() => setIsDonationOpen(true)} className="col-span-1 md:col-span-2 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-md border border-divider p-5 group hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 group-hover:-rotate-12 transition-transform">
                                        <Server className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5">Support Potato Server</h3>
                                        <p className="text-sm font-bold text-primary">PS Tracker로 게임값을 아끼셨다면 감자 서버에게 밥을 주세요!</p>
                                    </div>
                                </div>
                                <div className="relative z-10 w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-base border border-divider rounded-xl group-hover:bg-yellow-500 group-hover:border-yellow-500 group-hover:text-black font-bold text-xs transition-colors">
                                    밥 주기 (후원) <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
        </div>
    );
};

export default InsightsPage;