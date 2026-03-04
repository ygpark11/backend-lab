import React, { useState, useEffect } from 'react';
import { Flame, Star, TrendingDown, Activity, Database, Clock, ChevronRight, Heart, CircleDollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import PSLoader from '../components/PSLoader';
import toast from 'react-hot-toast';

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
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

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
                <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-gradient-to-r from-pink-900/20 via-[#1a1a1a] to-[#1a1a1a] border border-pink-500/20 p-6 flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute left-0 top-0 w-32 h-full bg-pink-500/10 blur-2xl group-hover:bg-pink-500/20 transition-colors"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                            <Heart className="w-6 h-6 text-pink-500 fill-pink-500 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-pink-400 font-bold text-xs tracking-wider mb-1">USER ACTIVITY</h2>
                            <h3 className="text-lg md:text-xl font-black text-white">
                                우리 사이트에서 찜한 총 횟수
                            </h3>
                        </div>
                    </div>
                    <div className="relative z-10 text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 drop-shadow-md">
                        {stats.totalWishlistCount?.toLocaleString()} <span className="text-lg text-gray-400 font-bold">번</span>
                    </div>
                </div>

                {/* 6 & 7. 트래커 시스템 현황 (TRACKED TITLES & LAST SYNC) */}
                <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 rounded-3xl bg-black border border-green-500/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between font-mono relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(34,197,94,0.05)_50%,transparent_100%)] bg-[length:100%_4px] opacity-20"></div>

                    <div className="flex items-center gap-4 z-10 mb-4 md:mb-0">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/30">
                            <Database className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <h2 className="text-green-500 font-bold text-xs">SYSTEM ONLINE</h2>
                            </div>
                            <h3 className="text-gray-300 text-sm mt-1">PS Tracker Daemon v2.4.1</h3>
                        </div>
                    </div>

                    <div className="flex gap-8 z-10 w-full md:w-auto">
                        <div>
                            <p className="text-gray-500 text-xs mb-1">TRACKED TITLES</p>
                            <p className="text-green-400 font-bold text-lg">{stats.totalTrackedCount?.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs mb-1">LAST SYNC</p>
                            <p className="text-green-400 font-bold text-lg flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {formatDate(stats.lastSyncTime)}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InsightsPage;