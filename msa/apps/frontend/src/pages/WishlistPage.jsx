import React, {useEffect, useState} from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import {useNavigate} from 'react-router-dom';
import {getGenreBadgeStyle} from "../utils/uiUtils.js";
import SkeletonCard from '../components/SkeletonCard';
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {
    AlertTriangle,
    ExternalLink,
    Gamepad2,
    Heart,
    PiggyBank,
    Sparkles,
    Timer,
    Trash2,
    TrendingDown
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';

const WishlistPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();

    useEffect(() => { fetchMyWishlist(page); }, [page]);

    const fetchMyWishlist = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await client.get('/api/v1/wishlists', {
                params: { page: pageNumber, size: 20, sort: 'createdAt,desc' }
            });
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleRemove = (e, gameId, gameName) => {
        e.stopPropagation();
        toast((t) => (
            <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2 font-bold text-gray-800"><AlertTriangle className="w-5 h-5 text-red-500" /><span>삭제하시겠습니까?</span></div>
                <p className="text-sm text-gray-600 mb-2">'{gameName}'을(를) 목록에서 제거합니다.</p>
                <div className="flex gap-2">
                    <button onClick={() => { toast.dismiss(t.id); performDelete(gameId); }} className="flex-1 bg-red-500 text-white py-1.5 rounded text-sm font-bold hover:bg-red-600 transition">네, 삭제</button>
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
        } catch (error) { toast.error("삭제 실패", { id: toastId }); }
    };

    const handleGenreClick = (e, genre) => {
        e.stopPropagation();
        navigate(`/games?genre=${encodeURIComponent(genre)}`);
    };

    // 총 절약 금액 계산 (return 바로 위에 두세요)
    const totalSavings = games.reduce((acc, game) => {
        if (!game.originalPrice || !game.currentPrice) return acc;
        const saving = game.originalPrice - game.currentPrice;
        return acc + (saving > 0 ? saving : 0);
    }, 0);

    if (loading) return <div className="min-h-screen pt-20 flex justify-center"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-ps-black text-white">

            <SEO title="나의 찜 목록" description="내가 찜한 게임들의 가격 변동을 확인하세요." />

            <div className="p-6 md:p-10 pb-20 max-w-7xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
                            <span>My <span className="text-red-500">Wishlist</span></span>
                            {/* 하트 아이콘 + 네온 효과 */}
                            <Heart className="w-8 h-8 text-red-500 fill-current animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        </h1>
                        {!loading && (
                            <div className="flex flex-col gap-1">
                                <p className="text-ps-muted text-sm">총 <span className="text-white font-bold">{totalElements}</span>개의 게임을 찜했습니다.</p>

                                {/* 절약 금액 배너 */}
                                {totalSavings > 0 && (
                                    <div className="mt-4 inline-flex items-center gap-4 bg-gradient-to-r from-green-900/40 to-green-800/20 border border-green-500/30 pl-4 pr-6 py-3 rounded-xl animate-fadeIn shadow-[0_0_15px_rgba(34,197,94,0.15)] backdrop-blur-md">
                                        {/* 아이콘 영역: 원형 배경 + 아이콘 */}
                                        <div className="bg-green-500/20 p-2 rounded-full border border-green-500/30">
                                            <PiggyBank className="w-6 h-6 text-green-400" />
                                        </div>

                                        {/* 텍스트 영역 */}
                                        <div className="flex flex-col">
                                            <span className="text-green-400/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                <TrendingDown className="w-3 h-3" /> Total Savings
                                            </span>
                                            <span className="text-white font-black text-xl tracking-tight">
                                                <span className="text-green-400 mr-1">₩</span>
                                                {totalSavings.toLocaleString()}
                                                <span className="text-sm text-gray-400 font-medium ml-1">아꼈다!</span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                    {loading ? Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />) : (
                        games.length > 0 ? games.map((game) => {
                            const realGameId = game.gameId || game.id;
                            const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                            const isClosing = !isLastCall && daysLeft <= 3;

                            const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

                            return (
                                <div key={realGameId} onClick={() => navigate(`/games/${realGameId}`)} className={`group bg-ps-card rounded-xl overflow-hidden hover:scale-105 transition-transform duration-200 shadow-lg cursor-pointer border relative
                                     ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-transparent hover:border-red-500/50'}`}>
                                    <div className="aspect-[3/4] overflow-hidden relative">
                                        <PSGameImage
                                            src={game.imageUrl}
                                            alt={game.name}
                                            className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><ExternalLink className="w-8 h-8 text-white drop-shadow-lg" /></div>

                                        {isPlatinum && <div className="absolute top-2 left-2 z-20"><Sparkles className="w-5 h-5 text-yellow-300 animate-pulse drop-shadow-md" /></div>}
                                        {isNew && !isPlatinum && <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">NEW</span>}

                                        {isLastCall && <span className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 막차!</span>}
                                        {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}

                                        <button onClick={(e) => handleRemove(e, realGameId, game.name)} className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white transition-all transform hover:scale-110 shadow-lg z-20"><Trash2 className="w-4 h-4" /></button>

                                        {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}
                                        {game.inCatalog ? (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(250,204,21,0.6)] z-10 flex items-center gap-1 animate-pulse-slow">
                                                <Gamepad2 className="w-3 h-3 fill-black" /> EXTRA
                                            </span>
                                        ) : game.isPlusExclusive ? (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow-md">
                                                PLUS
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex flex-wrap gap-1 mb-2 min-h-[22px]">
                                            {game.genres && game.genres.length > 0 ? (
                                                // 1. 장르가 있을 때: 기존처럼 클릭 가능한 장르 배지들 출력
                                                game.genres.map((genreName, idx) => (
                                                    <span
                                                        key={idx}
                                                        onClick={(e) => handleGenreClick(e, genreName)}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded border font-bold hover:opacity-80 transition-opacity cursor-pointer ${getGenreBadgeStyle(genreName)}`}
                                                    >
                                                        {genreName}
                                                    </span>
                                                ))
                                            ) : (
                                                // 2. 장르가 없을 때: 클릭 기능이 없는 '미분류' 배지 출력
                                                // (미분류는 검색 조건으로 쓰기 모호하므로 cursor-pointer와 onClick을 뺐습니다)
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-gray-600/20 text-gray-400 border-gray-500/30">
                                                    미분류
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-100 line-clamp-2 min-h-[2.5rem] overflow-hidden mb-2 group-hover:text-ps-blue transition-colors">
                                            {game.name}
                                        </h3>
                                        <div className="flex flex-col gap-0.5">
                                            {game.discountRate > 0 && <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>}
                                            <div className="flex justify-between items-end mt-1">
                                                <span className="text-lg font-black text-white">{game.currentPrice?.toLocaleString()}원</span>

                                                {game.metaScore > 0 && (
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded shadow-sm ${
                                                        game.metaScore >= 80
                                                            ? 'bg-green-900 text-green-300 border border-green-500/30'
                                                            : 'bg-yellow-900 text-yellow-300 border border-yellow-500/30'
                                                    }`}>
                                                        {game.metaScore}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full text-center py-20 bg-ps-card rounded-xl border border-white/5 flex flex-col items-center justify-center gap-4">
                                <div className="bg-gray-800/50 p-6 rounded-full">
                                    {/* 혹은 찜 아이콘 */}
                                    <Heart className="w-12 h-12 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-xl text-white font-bold mb-2">아직 찜한 게임이 없습니다</p>
                                    <p className="text-gray-400 text-sm mb-6">마음에 드는 게임을 찾아보세요!</p>
                                    <button onClick={() => navigate('/games')} className="px-8 py-3 bg-ps-blue rounded-full font-bold hover:bg-blue-600 transition shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 mx-auto">
                                        <Gamepad2 className="w-4 h-4"/> 게임 구경하러 가기
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        {/* First 버튼 추가 */}
                        <button
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                            className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            &lt;&lt; First
                        </button>

                        {/* Prev 버튼 */}
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Prev
                        </button>

                        {/* 페이지 정보 표시 (스타일 통일) */}
                        <span className="text-ps-muted text-sm px-4">
                            Page <span className="text-white font-bold">{page + 1}</span> of {totalPages}
                        </span>

                        {/* Next 버튼 */}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Next
                        </button>

                        {/* Last 버튼 추가 */}
                        <button
                            onClick={() => setPage(totalPages - 1)}
                            disabled={page === totalPages - 1}
                            className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            Last &gt;&gt;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default WishlistPage;