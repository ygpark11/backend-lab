import React, { useEffect, useState } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SkeletonCard from '../components/SkeletonCard';
import { differenceInDays, parseISO } from 'date-fns';
import { Trash2, AlertTriangle, ExternalLink, Timer } from 'lucide-react';

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

const WishlistPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMyWishlist(page);
    }, [page]);

    const fetchMyWishlist = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await client.get('/api/v1/wishlists', {
                params: { page: pageNumber, size: 20, sort: 'createdAt,desc' }
            });
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = (e, gameId, gameName) => {
        e.stopPropagation();
        toast((t) => (
            <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>삭제하시겠습니까?</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">'{gameName}'을(를) 목록에서 제거합니다.</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => { toast.dismiss(t.id); performDelete(gameId); }}
                        className="flex-1 bg-red-500 text-white py-1.5 rounded text-sm font-bold hover:bg-red-600 transition"
                    >
                        네, 삭제
                    </button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm font-bold hover:bg-gray-300 transition">취소</button>
                </div>
            </div>
        ), { duration: 5000, position: 'top-center', style: { background: '#fff', padding: '16px', borderRadius: '12px' } });
    };

    const performDelete = async (gameId) => {
        const toastId = toast.loading('삭제 중...');
        try {
            await client.post(`/api/v1/wishlists/${gameId}`);
            await fetchMyWishlist(page);
            toast.success("삭제되었습니다 🗑️", { id: toastId });
        } catch (error) {
            toast.error("삭제 실패", { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-ps-black text-white">
            <Navbar />
            <div className="p-6 md:p-10 pb-20 max-w-7xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">My <span className="text-red-500">Wishlist</span> ❤️</h1>
                        {!loading && <p className="text-ps-muted text-sm">총 <span className="text-white font-bold">{totalElements}</span>개의 게임을 찜했습니다.</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                    {loading ? Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />) : (
                        games.length > 0 ? games.map((game) => {
                            const realGameId = game.gameId || game.id;
                            const isNew = game.createdAt && differenceInDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                            const isClosing = !isLastCall && daysLeft <= 3;

                            return (
                                <div key={realGameId} onClick={() => navigate(`/games/${realGameId}`)} className="group bg-ps-card rounded-xl overflow-hidden hover:scale-105 transition-transform duration-200 shadow-lg cursor-pointer border border-transparent hover:border-red-500/50 relative">
                                    <div className="aspect-[3/4] overflow-hidden relative">
                                        <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><ExternalLink className="w-8 h-8 text-white drop-shadow-lg" /></div>
                                        {isNew && <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">NEW</span>}
                                        {isLastCall && <span className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 막차!</span>}
                                        {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}
                                        <button onClick={(e) => handleRemove(e, realGameId, game.name)} className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white transition-all transform hover:scale-110 shadow-lg z-20"><Trash2 className="w-4 h-4" /></button>
                                        {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {game.genreIds && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getGenreBadgeStyle(game.genreIds)}`}>{game.genreIds.split(',')[0]}</span>}
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-100 line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-ps-blue transition-colors">{game.name}</h3>
                                        <div className="flex flex-col gap-0.5">
                                            {game.discountRate > 0 && <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>}
                                            <div className="flex justify-between items-end mt-1"><span className="text-lg font-black text-white">{game.currentPrice?.toLocaleString()}원</span></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full text-center py-20 bg-ps-card rounded-xl border border-white/5">
                                <p className="text-xl text-white mb-2">아직 찜한 게임이 없습니다 😢</p>
                                <button onClick={() => navigate('/games')} className="px-6 py-2 bg-ps-blue rounded-full font-bold hover:bg-blue-600 transition shadow-lg">게임 구경하러 가기</button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
export default WishlistPage;