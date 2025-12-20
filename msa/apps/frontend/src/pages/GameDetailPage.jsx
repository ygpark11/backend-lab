import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import Navbar from '../components/Navbar';
import { differenceInDays, parseISO } from 'date-fns';
import {
    Gamepad2, AlertCircle, CalendarDays, Youtube, Search,
    Timer, CheckCircle, XCircle, Info, HelpCircle, TrendingUp
} from 'lucide-react';

// 장르 컬러 함수 내부 선언
const getGenreBadgeStyle = (genreString) => {
    if (!genreString) return 'bg-gray-700/50 text-gray-400 border-gray-600';
    const g = genreString;
    if (g.includes('액션') || g.includes('Action')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (g.includes('롤플레잉') || g.includes('RPG')) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (g.includes('공포') || g.includes('Horror')) return 'bg-red-900/40 text-red-400 border-red-500/30';
    if (g.includes('스포츠') || g.includes('레이싱')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (g.includes('슈팅') || g.includes('FPS')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    return 'bg-blue-900/30 text-blue-300 border-blue-500/30';
};

// 아이콘 반환 함수
const renderVerdictIcon = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW': return <CheckCircle className="w-6 h-6" />;
        case 'GOOD_OFFER': return <Info className="w-6 h-6" />;
        case 'WAIT': return <XCircle className="w-6 h-6" />;
        case 'TRACKING': return <Search className="w-6 h-6" />;
        default: return <HelpCircle className="w-6 h-6" />;
    }
};

const getVerdictColor = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW': return 'bg-red-500/10 border-red-500/40 text-red-400';
        case 'GOOD_OFFER': return 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400';
        case 'WAIT': return 'bg-gray-500/10 border-gray-500/40 text-gray-400';
        case 'TRACKING': return 'bg-blue-500/10 border-blue-500/40 text-blue-400';
        default: return 'bg-slate-700 border-slate-600 text-slate-300';
    }
};

export default function GameDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await client.get(`/api/v1/games/${id}`);
                setGame(res.data);
                if (res.data.liked !== undefined) setIsLiked(res.data.liked);
            } catch (err) {
                console.error(err);
                toast.error("정보 로딩 실패");
                navigate('/games');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, navigate]);

    const handleLike = async () => {
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${id}`);
            const message = response.data;
            const added = message.includes("추가");
            setIsLiked(added);
            toast.success(message, { id: toastId, icon: added ? '❤️' : '💔' });
        } catch (error) {
            toast.error("요청 실패", { id: toastId });
        }
    };

    if (loading) return <div className="min-h-screen bg-ps-black text-white flex justify-center items-center">Loading...</div>;
    if (!game) return null;

    const verdictColorClass = getVerdictColor(game.priceVerdict);
    const isNew = game.createdAt && differenceInDays(new Date(), parseISO(game.createdAt)) <= 3;
    const isClosingSoon = game.saleEndDate && differenceInDays(parseISO(game.saleEndDate), new Date()) <= 3;

    return (
        <div className="min-h-screen bg-ps-black text-white">
            <Navbar />
            <div className="p-6 md:p-10 pb-20 max-w-5xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors text-sm font-bold">← Back to List</button>

                <div className="flex flex-col md:flex-row gap-10">
                    {/* 이미지 영역 */}
                    <div className="w-full md:w-1/3">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group">
                            <img src={game.imageUrl} alt={game.title} className="w-full object-cover aspect-[3/4]" />
                            {isNew && <span className="absolute top-2 left-2 bg-green-500 text-black text-xs font-black px-2 py-1 rounded shadow-lg z-10">NEW</span>}
                            {isClosingSoon && (
                                <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse z-10 flex items-center gap-1">
                                    <Timer className="w-3 h-3" /> 마감임박
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 정보 영역 */}
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {game.genres.map(g => (
                                <span key={g} className={`px-3 py-1 rounded text-xs font-bold border ${getGenreBadgeStyle(g)}`}>{g}</span>
                            ))}
                            {game.platforms.map(p => (
                                <span key={p} className="bg-ps-blue/20 text-ps-blue border border-ps-blue/30 px-2 py-1 rounded text-xs font-bold">{p}</span>
                            ))}
                        </div>

                        <h1 className="text-4xl font-black mb-2 leading-tight text-white">{game.title}</h1>
                        <p className="text-gray-400 text-sm mb-6">{game.publisher}</p>

                        {/* 판정 박스 */}
                        <div className={`p-5 rounded-xl border mb-8 ${verdictColorClass}`}>
                            <div className="text-lg font-bold flex items-center gap-2">
                                {renderVerdictIcon(game.priceVerdict)}
                                {game.verdictMessage}
                            </div>
                            {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                <div className="text-xs text-gray-400 mt-2 pl-8 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> 역대 최저가: <span className="text-gray-200 font-bold">{game.lowestPrice.toLocaleString()}원</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-end gap-4 mb-2 border-b border-white/10 pb-8">
                            <div><span className="text-5xl font-black text-white tracking-tighter">{game.currentPrice.toLocaleString()}<span className="text-2xl font-medium text-gray-400">원</span></span></div>
                            {game.discountRate > 0 && (<div className="flex flex-col mb-1"><span className="text-gray-500 line-through text-sm">{game.originalPrice.toLocaleString()}원</span><span className="bg-ps-blue text-white px-2 py-0.5 rounded font-bold text-sm text-center">-{game.discountRate}%</span></div>)}
                        </div>

                        {game.saleEndDate && game.discountRate > 0 && (
                            <div className="flex items-center gap-2 mb-8 text-sm">
                                <span className="text-gray-400 flex items-center gap-1"><CalendarDays className="w-4 h-4" /> 할인 종료:</span>
                                <span className="text-white font-bold">{game.saleEndDate.replace(/-/g, '.')}</span>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <a href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white text-black hover:bg-gray-200 py-4 rounded-full font-black text-center transition-colors shadow-lg flex items-center justify-center gap-2">
                                <Gamepad2 className="w-5 h-5" /> PS Store에서 보기
                            </a>
                            <button onClick={handleLike} className={`px-6 rounded-full border transition-colors font-bold flex items-center gap-2 ${isLiked ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-white/20 hover:bg-white/10 text-white'}`}>
                                {isLiked ? '❤️ 찜 완료' : '🤍 찜하기'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-ps-card p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-ps-blue" /> 가격 변동 그래프</h3>
                            <PriceChart historyData={game.priceHistory} />
                        </div>

                        <div className="bg-ps-card p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">게임 정보</h3>
                            {game.description && game.description !== "Full Data Crawler" ? (
                                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{game.description}</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <p className="text-gray-500 text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> 상세 설명이 없어요. 영상으로 확인해보세요!</p>
                                    <div className="flex gap-2">
                                        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-red-500 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"><Youtube className="w-4 h-4" /> 유튜브 검색</a>
                                        <a href={`https://www.google.com/search?q=${encodeURIComponent(game.title)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/50 text-blue-500 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"><Search className="w-4 h-4" /> 구글 검색</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-ps-card p-6 rounded-xl border border-white/5 h-fit">
                        <h3 className="text-lg font-bold text-white mb-4">Scores</h3>
                        {game.metaScore > 0 && <div className="flex items-center justify-between mb-4"><span className="font-bold text-gray-300">Ⓜ️ Metascore</span><span className={`px-3 py-1 rounded font-black ${game.metaScore >= 80 ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}>{game.metaScore}</span></div>}
                        {game.userScore > 0 && <div className="flex items-center justify-between"><span className="font-bold text-gray-300">👤 User Score</span><span className={`px-3 py-1 rounded font-black ${game.userScore >= 70 ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'}`}>{Number(game.userScore).toFixed(1)}</span></div>}
                    </div>
                </div>
            </div>
        </div>
    );
}