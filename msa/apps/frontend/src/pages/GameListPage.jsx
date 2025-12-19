import React, { useEffect, useState } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';

// 장르 -> 이모지 변환 헬퍼
const getGenreEmoji = (genreString) => {
    if (!genreString) return '🎮';
    const firstGenre = genreString.split(',')[0].toLowerCase();
    if (firstGenre.includes('action')) return '⚔️';
    if (firstGenre.includes('rpg')) return '🛡️';
    if (firstGenre.includes('sport')) return '⚽';
    if (firstGenre.includes('racing')) return '🏎️';
    if (firstGenre.includes('shooter')) return '🔫';
    if (firstGenre.includes('adventure')) return '🗺️';
    if (firstGenre.includes('horror')) return '👻';
    if (firstGenre.includes('strategy')) return '🧠';
    return '🎮';
};

const GameListPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 통합된 필터 및 정렬 상태
    const [filter, setFilter] = useState({
        keyword: '',
        minDiscountRate: '',
        minMetaScore: '', // [New] 메타스코어 필터
        platform: '',
        isPlusExclusive: false,
        sort: 'lastUpdated,desc' // [New] 정렬 기본값 (최신순)
    });

    const [showFilter, setShowFilter] = useState(false);

    // 페이지네이션
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 필터/정렬 변경 핸들러
    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilter(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // 정렬이 바뀌면 즉시 검색 실행
        if (name === 'sort') {
            setPage(0); // 페이지 초기화
        }
    };

    // 검색 실행 (키워드 엔터 or 검색 버튼)
    const executeSearch = () => {
        setPage(0);
        fetchGames(0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') executeSearch();
    };

    useEffect(() => {
        fetchGames(page);
    }, [page, filter.sort]); // 정렬 조건이 바뀌면 자동 재로딩

    const fetchGames = async (pageNumber) => {
        setLoading(true);
        try {
            const params = {
                page: pageNumber,
                size: 20,
                sort: filter.sort, // [New] 정렬 파라미터 전송
                keyword: filter.keyword,

                ...(filter.minDiscountRate && { minDiscountRate: filter.minDiscountRate }),
                ...(filter.minMetaScore && { minMetaScore: filter.minMetaScore }), // [New]
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

    const handleLike = async (e, gameId, gameName) => {
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
            if (error.response && error.response.status === 401) {
                toast.error("로그인이 필요합니다.", { id: toastId });
            } else {
                toast.error("요청 실패", { id: toastId });
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-ps-black text-white p-6 md:p-10 pb-20">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 & 검색바 영역 */}
                <div className="flex flex-col gap-6 mb-8">
                    {/* 상단: 타이틀 + 로그아웃 */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black tracking-tight">
                            Latest <span className="text-ps-blue">Deals</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <a href="/wishlist" className="text-sm font-bold bg-ps-blue px-4 py-2 rounded-full hover:bg-blue-600 transition">찜 목록 ❤️</a>
                            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">로그아웃</button>
                        </div>
                    </div>

                    {/* 검색 및 필터 UI */}
                    <div className="bg-ps-card p-4 rounded-xl border border-white/10 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-2">
                            {/* 키워드 검색 */}
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    name="keyword"
                                    placeholder="게임 제목 검색..."
                                    value={filter.keyword}
                                    onChange={handleFilterChange}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-10 text-sm focus:outline-none focus:border-ps-blue text-white"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>

                            {/* 정렬 드롭다운 (PC: 우측, 모바일: 하단) */}
                            <select
                                name="sort"
                                value={filter.sort}
                                onChange={handleFilterChange}
                                className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-ps-blue outline-none font-bold"
                            >
                                <option value="lastUpdated,desc">⚡ 최신순</option>
                                <option value="price,asc">💸 낮은 가격순</option>
                                <option value="discountRate,desc">🔥 높은 할인율순</option>
                                <option value="metaScore,desc">🏆 높은 평점순</option>
                            </select>

                            {/* 필터 토글 버튼 */}
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${showFilter ? 'bg-ps-blue border-ps-blue text-white' : 'border-white/20 text-gray-300 hover:bg-white/10'}`}
                            >
                                ⚙️ 상세 필터
                            </button>

                            {/* 검색 버튼 */}
                            <button
                                onClick={executeSearch}
                                className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                            >
                                검색
                            </button>
                        </div>

                        {/* 상세 필터 영역 (Toggle) */}
                        {showFilter && (
                            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                                {/* 할인율 */}
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">최소 할인율</label>
                                    <select
                                        name="minDiscountRate"
                                        value={filter.minDiscountRate}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none"
                                    >
                                        <option value="">전체</option>
                                        <option value="30">30% 이상</option>
                                        <option value="50">50% 이상</option>
                                        <option value="70">70% 이상</option>
                                    </select>
                                </div>
                                {/* 메타스코어 */}
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">메타스코어</label>
                                    <select
                                        name="minMetaScore"
                                        value={filter.minMetaScore}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none"
                                    >
                                        <option value="">전체</option>
                                        <option value="75">75점 이상 (Good)</option>
                                        <option value="80">80점 이상 (Great)</option>
                                        <option value="90">90점 이상 (Must Play)</option>
                                    </select>
                                </div>
                                {/* 플랫폼 */}
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">플랫폼</label>
                                    <select
                                        name="platform"
                                        value={filter.platform}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none"
                                    >
                                        <option value="">전체</option>
                                        <option value="PS5">PS5</option>
                                        <option value="PS4">PS4</option>
                                    </select>
                                </div>
                                {/* PS Plus */}
                                <div className="flex items-center h-full pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="isPlusExclusive"
                                            checked={filter.isPlusExclusive}
                                            onChange={handleFilterChange}
                                            className="w-4 h-4 rounded bg-black/30 border-white/30 text-ps-blue focus:ring-0"
                                        />
                                        <span className="text-sm text-yellow-400 font-bold">PS Plus 전용만 보기</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 결과 수 표시 */}
                {!loading && (
                    <p className="text-ps-muted text-sm mb-4 text-right">
                        총 <span className="text-white font-bold">{totalElements.toLocaleString()}</span>개의 게임을 찾았습니다.
                    </p>
                )}

                {/* 그리드 영역 */}
                {loading ? (
                    <div className="text-center py-20">Loading...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                        {games.length > 0 ? (
                            games.map((game) => {
                                const isNew = game.createdAt && differenceInDays(new Date(), parseISO(game.createdAt)) <= 3;
                                const isClosing = game.saleEndDate && differenceInDays(parseISO(game.saleEndDate), new Date()) <= 3;

                                return (
                                    <div key={game.id} onClick={() => navigate(`/games/${game.id}`)} className="group bg-ps-card rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 shadow-lg cursor-pointer border border-transparent hover:border-ps-blue/30 relative">

                                        <div className="aspect-[3/4] overflow-hidden relative">
                                            <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />

                                            {/* 뱃지들 */}
                                            {isNew && <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">NEW</span>}
                                            {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse z-10">마감임박</span>}

                                            {/* 하트 버튼 */}
                                            <button
                                                onClick={(e) => handleLike(e, game.id, game.name)}
                                                className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-ps-blue/80 text-white transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 focus:opacity-100 z-20"
                                                title={game.liked ? "찜 해제" : "찜하기"}
                                            >
                                                {game.liked ? (
                                                    <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3.25 7.5 3.25c1.548 0 3.09.661 4.213 1.76L12 5.383l.287-.288c1.125-1.099 2.667-1.76 4.213-1.76 2.786 0 5.25 2.072 5.25 5.001 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                )}
                                            </button>

                                            {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md">-{game.discountRate}%</span>}
                                            {game.isPlusExclusive && <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span>}
                                        </div>

                                        <div className="p-4">
                                            {/* 장르 표시 */}
                                            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                                <span>{getGenreEmoji(game.genreIds)}</span>
                                                <span className="truncate max-w-[150px]">{game.genreIds ? game.genreIds.split(',')[0] : 'Game'}</span>
                                            </div>

                                            <h3 className="text-sm font-bold text-gray-200 line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-ps-blue transition-colors">{game.name}</h3>

                                            <div className="flex flex-col gap-0.5">
                                                {game.discountRate > 0 && <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>}
                                                <div className="flex justify-between items-end mt-1">
                                                    <span className="text-lg font-black text-white">{game.price?.toLocaleString()}원</span>
                                                    {game.metaScore > 0 && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${game.metaScore >= 80 ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>{game.metaScore}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-20 text-ps-muted">검색 결과가 없습니다.</div>
                        )}
                    </div>
                )}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <button onClick={() => setPage(0)} disabled={page === 0} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed">&lt;&lt; First</button>
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                        <span className="text-ps-muted text-sm px-4">Page <span className="text-white font-bold">{page + 1}</span> of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed">Last &gt;&gt;</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameListPage;