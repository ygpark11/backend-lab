import React, { useState, useEffect } from 'react';
import {
    Flame, Star, TrendingDown, Activity, Database, Clock,
    ChevronRight, Heart, CircleDollarSign, RefreshCw,
    AlertTriangle, Server, Trophy, Download
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

    return (
        <div className="min-h-screen bg-base text-primary pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-ps-blue selection:text-white transition-colors duration-500">

            {/* 헤더 영역 */}
            <div className="max-w-6xl mx-auto mb-8 animate-fadeIn">
                <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-ps-blue" />
                    PS Tracker Insights
                </h1>
                <p className="text-secondary font-bold">실시간으로 수집되는 PlayStation 스토어의 숨겨진 데이터들</p>
            </div>

            {/* 벤토 박스 UI (Grid) */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-flow-dense gap-4 md:gap-6 auto-rows-[160px]">

                {/* 1. 역대 최저가 갱신 (RED) */}
                <div
                    onClick={() => navigate('/games?isAllTimeLow=true')}
                    className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-red-border)] p-8 cursor-pointer group hover:-translate-y-1 hover:border-[color:var(--bento-red-border-hover)] hover:[box-shadow:var(--bento-red-shadow)] transition-all duration-300 flex flex-col justify-between"
                >
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to bottom right, var(--bento-red-from), transparent 70%)' }}></div>
                    <div className="hidden md:block absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-110 pointer-events-none" style={{ backgroundColor: 'var(--bento-red-border-hover)', opacity: 0.15 }}></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-6 h-6 text-red-600 dark:text-red-500 animate-pulse" />
                            <h2 className="text-red-600 dark:text-red-500 font-bold text-sm tracking-wider">ALL-TIME LOW</h2>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-primary leading-tight mt-2">
                            지금 안 사면 손해!<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-500">역대 최저가</span> 갱신
                        </h3>
                    </div>
                    <div className="flex items-end justify-between relative z-10">
                        <div className="text-6xl md:text-7xl font-black text-primary tracking-tighter drop-shadow-sm">
                            {stats.allTimeLowCount?.toLocaleString()}<span className="text-2xl text-red-600 dark:text-red-500 ml-1">개</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[var(--bento-card-bg)] border border-[color:var(--bento-red-border)] flex items-center justify-center group-hover:bg-red-500 group-hover:border-red-500 transition-colors shadow-sm">
                            <ChevronRight className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                        </div>
                    </div>
                </div>

                {/* 2. 갓겜 할인 레이더 (PURPLE) */}
                <div
                    onClick={() => navigate('/games?minMetaScore=85&minDiscountRate=50')}
                    className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-purple-border)] p-6 cursor-pointer group hover:-translate-y-1 hover:border-[color:var(--bento-purple-border-hover)] hover:[box-shadow:var(--bento-purple-shadow)] transition-all duration-300 flex items-center justify-between"
                >
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to right, var(--bento-purple-from), transparent 80%)' }}></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                            <h2 className="text-purple-600 dark:text-purple-500 font-bold text-xs tracking-wider">MUST PLAY (IGDB 85+ & 50%↓)</h2>
                        </div>
                        <h3 className="text-xl font-black text-primary mt-1">인증된 명작 갓겜</h3>
                    </div>
                    <div className="relative z-10 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 drop-shadow-sm">
                        {stats.mustPlayCount?.toLocaleString()}
                    </div>
                </div>

                {/* 3. 진행 중인 총 할인 (GREEN) */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-green-border)] p-6 flex flex-col justify-center cursor-pointer group hover:-translate-y-1 hover:border-[color:var(--bento-green-border-hover)] hover:[box-shadow:var(--bento-green-shadow)] transition-all duration-300 relative overflow-hidden"
                     onClick={() => navigate('/games?minDiscountRate=1')}
                >
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to bottom right, var(--bento-green-from), transparent 70%)' }}></div>
                    <div className="relative z-10">
                        <h2 className="text-secondary font-bold text-xs flex items-center gap-2 mb-2 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
                            <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-500" /> 진행 중인 총 할인
                        </h2>
                        <div className="text-3xl font-black text-primary">
                            {stats.totalDiscountedGames?.toLocaleString()}<span className="text-sm text-secondary ml-1">개</span>
                        </div>
                    </div>
                </div>

                {/* 4. 쏟아지는 총 할인액 (BLUE) */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-blue-border)] p-6 flex flex-col justify-center group hover:-translate-y-1 hover:border-[color:var(--bento-blue-border-hover)] hover:[box-shadow:var(--bento-blue-shadow)] transition-all duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to bottom right, var(--bento-blue-from), transparent 70%)' }}></div>
                    <div className="relative z-10">
                        <h2 className="text-secondary font-bold text-xs flex items-center gap-2 mb-2 group-hover:text-ps-blue transition-colors">
                            <CircleDollarSign className="w-4 h-4 text-ps-blue"/> 쏟아지는 총 할인액
                        </h2>
                        <div className="text-2xl font-black text-primary truncate">
                            {formatCurrency(stats.totalDiscountAmount)}<span className="text-sm text-secondary ml-1">원</span>
                        </div>
                    </div>
                </div>

                {/* 베스트셀러 랭킹 진입점 (AMBER) */}
                <div
                    onClick={() => navigate('/games?isBestSeller=true')}
                    className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-amber-border)] p-6 md:p-8 cursor-pointer group hover:-translate-y-1 hover:border-[color:var(--bento-amber-border-hover)] hover:[box-shadow:var(--bento-amber-shadow)] transition-all duration-300"
                >
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to bottom right, var(--bento-amber-from), transparent 70%)' }}></div>
                    <div className="hidden md:block absolute right-0 bottom-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mb-20 transition-transform group-hover:scale-110 pointer-events-none" style={{ backgroundColor: 'var(--bento-amber-border-hover)', opacity: 0.15 }}></div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                    <h2 className="text-amber-600 dark:text-amber-500 font-bold text-sm tracking-wider uppercase">TOP SELLERS</h2>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-primary leading-tight mt-1 drop-shadow-sm">
                                    지갑이 열리는 중!<br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-500 dark:to-yellow-500">실시간 베스트셀러</span>
                                </h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[var(--bento-card-bg)] border border-[color:var(--bento-amber-border)] flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-500 transition-colors shrink-0 shadow-sm">
                                <ChevronRight className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 최다 다운로드 랭킹 진입점 (CYAN) */}
                <div
                    onClick={() => navigate('/games?isMostDownloaded=true')}
                    className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-cyan-border)] p-6 md:p-8 cursor-pointer group hover:-translate-y-1 hover:border-[color:var(--bento-cyan-border-hover)] hover:[box-shadow:var(--bento-cyan-shadow)] transition-all duration-300"
                >
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to bottom right, var(--bento-cyan-from), transparent 70%)' }}></div>
                    <div className="hidden md:block absolute right-0 bottom-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mb-20 transition-transform group-hover:scale-110 pointer-events-none" style={{ backgroundColor: 'var(--bento-cyan-border-hover)', opacity: 0.15 }}></div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Download className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                    <h2 className="text-cyan-600 dark:text-cyan-400 font-bold text-sm tracking-wider uppercase">MOST DOWNLOADED</h2>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-primary leading-tight mt-1 drop-shadow-sm">
                                    지금 제일 핫한 게임<br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500">실시간 최다 다운로드</span>
                                </h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[var(--bento-card-bg)] border border-[color:var(--bento-cyan-border)] flex items-center justify-center group-hover:bg-cyan-500 group-hover:border-cyan-500 transition-colors shrink-0 shadow-sm">
                                <ChevronRight className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. 누적 찜 횟수 (PINK) */}
                <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-pink-border)] hover:border-[color:var(--bento-pink-border-hover)] hover:[box-shadow:var(--bento-pink-shadow)] p-5 md:p-6 flex items-center justify-between relative overflow-hidden group transition-all duration-300">
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to right, var(--bento-pink-from), transparent 60%)' }}></div>
                    <div className="hidden md:block absolute left-0 top-0 w-48 h-full rounded-full blur-3xl transition-transform group-hover:scale-110 pointer-events-none" style={{ backgroundColor: 'var(--bento-pink-border-hover)', opacity: 0.1 }}></div>

                    <div className="flex items-center gap-3 md:gap-4 relative z-10 flex-1 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                            <Heart className="w-5 h-5 md:w-6 md:h-6 text-pink-600 dark:text-pink-500 fill-pink-600 dark:fill-pink-500 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-pink-600 dark:text-pink-500 font-bold text-[10px] md:text-xs tracking-wider mb-0.5 md:mb-1 uppercase">USER ACTIVITY</h2>
                            <h3 className="text-sm md:text-xl font-black text-primary truncate leading-tight">
                                우리 사이트에서 찜한 총 횟수
                            </h3>
                        </div>
                    </div>
                    <div className="relative z-10 text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-500 dark:to-purple-500 drop-shadow-sm shrink-0 ml-2">
                        {stats.totalWishlistCount?.toLocaleString()} <span className="text-xs md:text-lg text-secondary font-bold uppercase">번</span>
                    </div>
                </div>

                {/* 6 & 7. 트래커 시스템 현황 (EMERALD) */}
                <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-emerald-border)] hover:border-[color:var(--bento-emerald-border-hover)] hover:[box-shadow:var(--bento-emerald-shadow)] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group transition-all duration-300">
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to right, var(--bento-emerald-from), transparent 60%)' }}></div>
                    <div className="hidden md:block absolute left-1/2 top-0 w-48 h-full rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'var(--bento-emerald-border-hover)', opacity: 0.1 }}></div>

                    <div className="flex items-center gap-3 md:gap-4 relative z-10 mb-4 md:mb-0 w-full md:w-auto">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Database className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse shadow-sm"></span>
                                <h2 className="text-emerald-600 dark:text-emerald-500 font-bold text-[10px] md:text-xs tracking-wider uppercase">SYSTEM ONLINE</h2>
                            </div>
                            <h3 className="text-primary font-black text-xs md:text-base tracking-wide truncate">PS Tracker Daemon v2.4.1</h3>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-3 sm:gap-10 relative z-10 w-full md:w-auto bg-surface md:bg-transparent p-3.5 md:p-0 rounded-2xl md:rounded-none border md:border-0 border-divider">
                        <div className="flex-1 sm:flex-none">
                            <p className="text-secondary text-[9px] md:text-xs font-bold tracking-wider mb-0.5 md:mb-1 uppercase">TRACKED TITLES</p>
                            <p className="text-primary font-black text-lg md:text-2xl drop-shadow-sm">
                                {stats.totalTrackedCount?.toLocaleString()}<span className="text-xs text-secondary ml-1 font-bold">개</span>
                            </p>
                        </div>

                        <div className="w-[1px] h-8 bg-divider hidden sm:block"></div>

                        <div className="flex-1 sm:flex-none text-right sm:text-left">
                            <p className="text-secondary text-[9px] md:text-xs font-bold tracking-wider mb-0.5 md:mb-1 uppercase">LAST SYNC</p>
                            <div className="flex items-center justify-end sm:justify-start gap-1.5 md:gap-2">
                                <p className="text-primary font-black text-xs md:text-lg flex items-center gap-1 md:gap-1.5 drop-shadow-sm">
                                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-500" /> {formatDate(stats.lastSyncTime)}
                                </p>
                                {isAdmin && (
                                    <button onClick={handleRefreshCache} disabled={isRefreshing} className="p-1 md:p-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 transition-colors border border-emerald-600/30 dark:border-emerald-500/30 ml-1">
                                        <RefreshCw className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 서버 밥주기 후원 (YELLOW) */}
                <div
                    onClick={() => setIsDonationOpen(true)}
                    className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-yellow-border)] hover:border-[color:var(--bento-yellow-border-hover)] hover:[box-shadow:var(--bento-yellow-shadow)] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group cursor-pointer transition-all duration-300"
                >
                    <div className="absolute inset-0 pointer-events-none transition-colors duration-500" style={{ background: 'linear-gradient(to right, var(--bento-yellow-from), transparent 60%)' }}></div>
                    <div className="hidden md:block absolute right-0 top-0 w-48 h-full rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'var(--bento-yellow-border-hover)', opacity: 0.1 }}></div>

                    <div className="flex items-center gap-3 md:gap-4 relative z-10 w-full md:w-auto flex-1">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 group-hover:scale-110 group-hover:-rotate-12 transition-transform">
                            <Server className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-500 drop-shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-yellow-600 dark:text-yellow-500 font-bold text-[10px] md:text-xs tracking-wider mb-0.5 md:mb-1 uppercase">SUPPORT POTATO SERVER</h2>
                            <h3 className="text-primary font-black text-sm md:text-lg lg:text-xl leading-tight truncate md:whitespace-normal">
                                PS Tracker로 게임값 아끼셨나요? <br className="hidden md:block" />
                                <span className="text-yellow-600 dark:text-yellow-500">열일하는 감자 서버에게 밥주기</span>
                            </h3>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto md:min-w-[140px] justify-between md:justify-center items-center gap-2 mt-4 md:mt-0 relative z-10 bg-[var(--bento-card-bg)] px-4 py-2.5 md:py-2.5 md:px-6 rounded-xl md:rounded-full border border-[color:var(--bento-yellow-border)] group-hover:bg-yellow-500 group-hover:border-yellow-500 transition-all shrink-0">
                        <span className="text-xs font-bold text-secondary group-hover:text-black whitespace-nowrap transition-colors">밥 주기 (후원)</span>
                        <ChevronRight className="w-4 h-4 text-secondary group-hover:text-black group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>

            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
        </div>
    );
};

export default InsightsPage;