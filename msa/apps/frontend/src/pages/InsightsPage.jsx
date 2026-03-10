import React, { useState, useEffect } from 'react';
import {
    Flame, Star, TrendingDown, Activity, Database, Clock,
    ChevronRight, Heart, CircleDollarSign, RefreshCw,
    AlertTriangle, Server
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    }); // 예: "2월 28일 03:44"
};

const InsightsPage = () => {
    const navigate = useNavigate();
    const { isAdmin } = useCurrentUser();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isDonationOpen, setIsDonationOpen] = useState(false);

    const handleRefreshCache = (e) => {
        e.stopPropagation();

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px] bg-[#1a1a1a] text-white p-2 border border-white/10 rounded-xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-red-400">캐시 강제 초기화</h4>
                        <p className="text-xs text-gray-400">인사이트 통계를 즉시 갱신할까요?</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={async () => {
                        toast.dismiss(t.id);
                        setIsRefreshing(true);
                        const loadId = toast.loading('기존 캐시 삭제 및 데이터 재수집 중...');

                        try {
                            // 🚀 adminApi 사용
                            await adminApi.clearInsightsCache();

                            // 최신 데이터 다시 불러오기
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
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors">
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { background: 'transparent', boxShadow: 'none', padding: 0 } });
    };

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                // 🚀 방금 만든 백엔드 API 호출!
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

    // 데이터를 받아오기 전에는 로더 표시
    if (loading || !stats) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pt-24 flex justify-center">
                <PSLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-ps-blue selection:text-white">

            {/* 헤더 영역 */}
            <div className="max-w-6xl mx-auto mb-8 animate-fadeIn">
                <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-ps-blue" />
                    PS Tracker Insights
                </h1>
                <p className="text-gray-400 font-bold">실시간으로 수집되는 PlayStation 스토어의 숨겨진 데이터들</p>
            </div>

            {/* 벤토 박스 UI (Grid) */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[160px]">

                {/* 1. 역대 최저가 갱신 */}
                <div
                    onClick={() => navigate('/games?isAllTimeLow=true')}
                    className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-900/40 to-black border border-red-500/20 p-8 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(239,68,68,0.2)] transition-all duration-300 flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-110"></div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-6 h-6 text-red-500 animate-pulse" />
                            <h2 className="text-red-400 font-bold text-sm tracking-wider">ALL-TIME LOW</h2>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mt-2">
                            지금 안 사면 손해!<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">역대 최저가</span> 갱신
                        </h3>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                            {stats.allTimeLowCount?.toLocaleString()}<span className="text-2xl text-red-400 ml-1">개</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-red-500 transition-colors">
                            <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* 2. 갓겜 할인 레이더 */}
                <div
                    onClick={() => navigate('/games?minMetaScore=85&minDiscountRate=50')}
                    className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/20 p-6 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)] transition-all duration-300 flex items-center justify-between"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <h2 className="text-purple-300 font-bold text-xs tracking-wider">MUST PLAY (IGDB 85+ & 50%↓)</h2>
                        </div>
                        <h3 className="text-xl font-black text-white mt-1">인증된 명작 갓겜</h3>
                    </div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        {stats.mustPlayCount?.toLocaleString()}
                    </div>
                </div>

                {/* 3. 진행 중인 총 할인 */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-3xl bg-[#1a1a1a]/80 border border-white/5 p-6 flex flex-col justify-center hover:bg-[#1f1f1f] transition-colors cursor-pointer group"
                     onClick={() => navigate('/games?minDiscountRate=1')}
                >
                    <h2 className="text-gray-400 font-bold text-xs flex items-center gap-2 mb-2 group-hover:text-green-400 transition-colors">
                        <TrendingDown className="w-4 h-4 text-green-400" /> 진행 중인 총 할인
                    </h2>
                    <div className="text-3xl font-black text-white">
                        {stats.totalDiscountedGames?.toLocaleString()}<span className="text-sm text-gray-500 ml-1">개</span>
                    </div>
                </div>

                {/* 4. 쏟아지는 총 할인액 */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-3xl bg-[#1a1a1a]/80 border border-white/5 p-6 flex flex-col justify-center hover:bg-[#1f1f1f] transition-colors">
                    <h2 className="text-gray-400 font-bold text-xs flex items-center gap-2 mb-2">
                        <CircleDollarSign className="w-4 h-4 text-blue-400"/> 쏟아지는 총 할인액
                    </h2>
                    <div className="text-2xl font-black text-white truncate">
                        {formatCurrency(stats.totalDiscountAmount)}<span className="text-sm text-gray-500 ml-1">원</span>
                    </div>
                </div>

                {/* 5. 누적 찜 횟수 */}
                <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-gradient-to-r from-pink-900/20 via-[#1a1a1a] to-[#1a1a1a] border border-pink-500/20 p-5 md:p-6 flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute left-0 top-0 w-32 h-full bg-pink-500/10 blur-2xl group-hover:bg-pink-500/20 transition-colors"></div>
                    <div className="flex items-center gap-3 md:gap-4 relative z-10 flex-1 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                            <Heart className="w-5 h-5 md:w-6 md:h-6 text-pink-500 fill-pink-500 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-pink-400 font-bold text-[10px] md:text-xs tracking-wider mb-0.5 md:mb-1 uppercase">USER ACTIVITY</h2>
                            <h3 className="text-sm md:text-xl font-black text-white truncate leading-tight">
                                우리 사이트에서 찜한 총 횟수
                            </h3>
                        </div>
                    </div>
                    <div className="relative z-10 text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 drop-shadow-md shrink-0 ml-2">
                        {stats.totalWishlistCount?.toLocaleString()} <span className="text-xs md:text-lg text-gray-500 font-bold uppercase">번</span>
                    </div>
                </div>

                {/* 6 & 7. 트래커 시스템 현황 (TRACKED TITLES & LAST SYNC) */}
                <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-gradient-to-r from-emerald-900/20 via-[#1a1a1a] to-[#1a1a1a] border border-emerald-500/20 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group">
                    <div className="absolute left-1/2 top-0 w-48 h-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>

                    <div className="flex items-center gap-3 md:gap-4 relative z-10 mb-4 md:mb-0 w-full md:w-auto">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Database className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                <h2 className="text-emerald-400 font-bold text-[10px] md:text-xs tracking-wider uppercase">SYSTEM ONLINE</h2>
                            </div>
                            <h3 className="text-gray-200 font-black text-xs md:text-base tracking-wide truncate">PS Tracker Daemon v2.4.1</h3>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-3 sm:gap-10 relative z-10 w-full md:w-auto bg-black/40 md:bg-transparent p-3.5 md:p-0 rounded-2xl md:rounded-none border md:border-0 border-white/5">
                        <div className="flex-1 sm:flex-none">
                            <p className="text-gray-500 text-[9px] md:text-xs font-bold tracking-wider mb-0.5 md:mb-1 uppercase">TRACKED TITLES</p>
                            <p className="text-white font-black text-lg md:text-2xl drop-shadow-md">
                                {stats.totalTrackedCount?.toLocaleString()}<span className="text-xs text-gray-500 ml-1 font-bold">개</span>
                            </p>
                        </div>

                        <div className="w-[1px] h-8 bg-white/10 hidden sm:block"></div>

                        <div className="flex-1 sm:flex-none text-right sm:text-left">
                            <p className="text-gray-500 text-[9px] md:text-xs font-bold tracking-wider mb-0.5 md:mb-1 uppercase">LAST SYNC</p>
                            <div className="flex items-center justify-end sm:justify-start gap-1.5 md:gap-2">
                                <p className="text-white font-black text-xs md:text-lg flex items-center gap-1 md:gap-1.5 drop-shadow-md">
                                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" /> {formatDate(stats.lastSyncTime)}
                                </p>
                                {isAdmin && (
                                    <button onClick={handleRefreshCache} disabled={isRefreshing} className="p-1 md:p-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/30 ml-1">
                                        <RefreshCw className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setIsDonationOpen(true)}
                    className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-gradient-to-r from-yellow-900/20 via-[#1a1a1a] to-[#1a1a1a] border border-yellow-500/20 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group cursor-pointer hover:border-yellow-500/50 transition-all duration-300 shadow-[0_0_0_rgba(250,204,21,0)] hover:shadow-[0_0_30px_rgba(250,204,21,0.15)]"
                >
                    <div className="absolute right-0 top-0 w-48 h-full bg-yellow-500/5 blur-3xl group-hover:bg-yellow-500/10 transition-colors"></div>

                    <div className="flex items-center gap-3 md:gap-4 relative z-10 w-full md:w-auto flex-1">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 group-hover:scale-110 group-hover:-rotate-12 transition-transform">
                            <Server className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-yellow-500 font-bold text-[10px] md:text-xs tracking-wider mb-0.5 md:mb-1 uppercase">SUPPORT POTATO SERVER</h2>
                            <h3 className="text-white font-black text-sm md:text-lg lg:text-xl leading-tight truncate md:whitespace-normal">
                                PS Tracker로 게임값 아끼셨나요? <br className="hidden md:block" />
                                <span className="text-yellow-400">열일하는 감자 서버에게 밥주기</span>
                            </h3>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto md:min-w-[140px] justify-between md:justify-center items-center gap-2 mt-4 md:mt-0 relative z-10 bg-black/40 md:bg-white/5 px-4 py-2.5 md:py-2.5 md:px-6 rounded-xl md:rounded-full border border-white/5 md:border-white/10 group-hover:bg-yellow-500/20 group-hover:border-yellow-500/50 transition-all shrink-0">
                        <span className="text-xs font-bold text-gray-300 group-hover:text-yellow-100 whitespace-nowrap">밥 주기 (후원)</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>

            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
        </div>
    );
};

export default InsightsPage;