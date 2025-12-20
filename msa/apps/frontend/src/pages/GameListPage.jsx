import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import SkeletonCard from '../components/SkeletonCard';
import { differenceInDays, parseISO } from 'date-fns';
import { getGenreBadgeStyle } from '../utils/uiUtils'; // 유틸 사용
// 아이콘 임포트
import { Timer, Heart, Search } from 'lucide-react';

const GameListPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [filter, setFilter] = useState({
        keyword: '',
        minDiscountRate: '',
        minMetaScore: '',
        platform: '',
        isPlusExclusive: false,
        sort: 'lastUpdated,desc'
    });
    const [showFilter, setShowFilter] = useState(false);

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilter(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (name === 'sort') setPage(0);
    };

    const executeSearch = () => { setPage(0); fetchGames(0); };
    const handleKeyDown = (e) => { if (e.key === 'Enter') executeSearch(); };

    useEffect(() => { fetchGames(page); }, [page, filter.sort]);

    const fetchGames = async (pageNumber) => {
        setLoading(true);
        try {
            const params = {
                page: pageNumber,
                size: 20,
                sort: filter.sort,
                keyword: filter.keyword,
                ...(filter.minDiscountRate && { minDiscountRate: filter.minDiscountRate }),
                ...(filter.minMetaScore && { minMetaScore: filter.minMetaScore }),
                ...(filter.platform && { platform: filter.platform }),
                ...(filter.isPlusExclusive && { isPlusExclusive: true }),
            };
            const response = await client.get('/api/v1/games/search', { params });
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            console.error(error);
            toast.error("데이터 로딩 실패");
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (e, gameId) => {
        e.stopPropagation();
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${gameId}`);
            const message = response.data;
            const isAdded = message.includes("추가");
            setGames(prevGames => prevGames.map(game =>
                game.id === gameId ? { ...game, liked: isAdded } : game
            ));
            toast.success(message, { id: toastId, icon: isAdded ? '❤️' : '💔' });
        } catch (error) {
            toast.error("로그인이 필요합니다.", { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-ps-black text-white">
            <Navbar />

            <div className="p-6 md:p-10 pb-20 max-w-7xl mx-auto">
                {/* 검색 및 필터 UI */}
                <div className="bg-ps-card p-6 rounded-xl border border-white/10 shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="keyword"
                                placeholder="게임 제목 검색..."
                                value={filter.keyword}
                                onChange={handleFilterChange}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        </div>

                        <select
                            name="sort"
                            value={filter.sort}
                            onChange={handleFilterChange}
                            className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-ps-blue outline-none font-bold hover:border-ps-blue transition-colors cursor-pointer"
                        >
                            <option value="lastUpdated,desc">⚡ 최신순</option>
                            <option value="price,asc">💸 낮은 가격순</option>
                            <option value="discountRate,desc">🔥 높은 할인율순</option>
                            <option value="metaScore,desc">🏆 높은 평점순</option>
                        </select>

                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${showFilter ? 'bg-ps-blue border-ps-blue text-white' : 'border-white/20 text-gray-300 hover:bg-white/10'}`}
                        >
                            ⚙️ 필터
                        </button>

                        <button
                            onClick={executeSearch}
                            className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                            검색
                        </button>
                    </div>

                    {showFilter && (
                        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-bold">최소 할인율</label> {/* 한글 */}
                                <select name="minDiscountRate" value={filter.minDiscountRate} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none">
                                    <option value="">전체</option>
                                    <option value="30">30% 이상</option>
                                    <option value="50">50% 이상</option>
                                    <option value="70">70% 이상</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-bold">메타스코어</label> {/* 한글 */}
                                <select name="minMetaScore" value={filter.minMetaScore} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none">
                                    <option value="">전체</option>
                                    <option value="75">75점 이상 (Good)</option>
                                    <option value="80">80점 이상 (Great)</option>
                                    <option value="90">90점 이상 (Must Play)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-bold">플랫폼</label> {/* 한글 */}
                                <select name="platform" value={filter.platform} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none">
                                    <option value="">전체</option>
                                    <option value="PS5">PS5</option>
                                    <option value="PS4">PS4</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5 w-full transition-colors">
                                    <input type="checkbox" name="isPlusExclusive" checked={filter.isPlusExclusive} onChange={handleFilterChange} className="w-4 h-4 rounded bg-gray-700 text-yellow-500 focus:ring-0 border-transparent" />
                                    <span className="text-sm text-yellow-400 font-bold">PS Plus 전용만 보기</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {!loading && (
                    <p className="text-ps-muted text-sm mb-4 text-right">
                        총 <span className="text-white font-bold">{totalElements.toLocaleString()}</span>개의 게임이 검색되었습니다.
                    </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                    {loading ? (
                        Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />)
                    ) : (
                        games.length > 0 ? (
                            games.map((game) => {
                                const isNew = game.createdAt && differenceInDays(new Date(), parseISO(game.createdAt)) <= 3;

                                // 막차 탑승 로직
                                const daysLeft = game.saleEndDate ? differenceInDays(parseISO(game.saleEndDate), new Date()) : 99;
                                const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                                const isClosing = !isLastCall && daysLeft <= 3;

                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => navigate(`/games/${game.id}`)}
                                        className="group bg-ps-card rounded-xl overflow-hidden shadow-lg border border-transparent hover:border-ps-blue/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                                    >
                                        <div className="aspect-[3/4] overflow-hidden relative">
                                            <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                                            {isNew && <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">NEW</span>}

                                            {/* 막차 뱃지 */}
                                            {isLastCall && (
                                                <span className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1">
                                                    <Timer className="w-3 h-3" /> 막차!
                                                </span>
                                            )}
                                            {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}

                                            <button
                                                onClick={(e) => handleLike(e, game.id)}
                                                className={`absolute top-2 right-2 p-2 rounded-full transition-all transform hover:scale-110 z-20 shadow-lg backdrop-blur-sm ${
                                                    game.liked ? 'bg-red-500/20 text-red-500' : 'bg-black/40 text-gray-300 hover:bg-red-500 hover:text-white'
                                                }`}
                                            >
                                                <Heart className={`w-5 h-5 ${game.liked ? 'fill-current' : ''}`} />
                                            </button>

                                            {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}
                                            {game.isPlusExclusive && <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10">PLUS</span>}
                                        </div>

                                        <div className="p-4">
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {game.genreIds && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getGenreBadgeStyle(game.genreIds)}`}>
                                                        {game.genreIds.split(',')[0]}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-100 leading-tight line-clamp-2 min-h-[2.5rem] mb-3 group-hover:text-ps-blue transition-colors">{game.name}</h3>
                                            <div className="flex flex-col gap-0.5">
                                                {game.discountRate > 0 && <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>}
                                                <div className="flex justify-between items-end mt-1">
                                                    <span className="text-lg font-black text-white">{game.price?.toLocaleString()}원</span>
                                                    {game.metaScore > 0 && (
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${game.metaScore >= 80 ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>
                                                            {game.metaScore}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            // 빈 화면 한글화
                            <div className="col-span-full text-center py-20 bg-ps-card rounded-xl border border-white/5">
                                <p className="text-xl text-white mb-2">검색 결과가 없습니다 😢</p>
                                <p className="text-ps-muted">검색어를 변경하거나 필터를 조정해보세요.</p>
                            </div>
                        )
                    )}
                </div>

                {!loading && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        {/* 페이지네이션 버튼 */}
                        <button onClick={() => setPage(0)} disabled={page === 0} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed transition">&lt;&lt; First</button>
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed transition">Prev</button>
                        <span className="text-ps-muted text-sm px-4">Page <span className="text-white font-bold">{page + 1}</span> of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
                        <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed transition">Last &gt;&gt;</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameListPage;