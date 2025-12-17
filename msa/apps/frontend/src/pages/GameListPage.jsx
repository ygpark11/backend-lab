import React, { useEffect, useState } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

const GameListPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');

    // 페이지네이션 상태
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    useEffect(() => {
        fetchGames(page);
    }, [page]);

    const fetchGames = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await client.get('/api/v1/games/search', {
                params: {
                    keyword: keyword,
                    page: pageNumber,
                    size: 20,
                    sort: 'lastUpdated,desc'
                }
            });
            // 백엔드에서 초기 'liked' 상태를 안 주기 때문에, 일단은 모두 false(빈 하트)로 시작합니다.
            // (완벽하게 하려면 백엔드 DTO에 'isLiked' 필드가 있어야 합니다.)
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            console.error("게임 목록 로딩 실패:", error);
            toast.error("데이터를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(0);
            fetchGames(0);
        }
    };

    // [Updated] 찜하기 핸들러 (화면 갱신 로직 추가)
    const handleLike = async (e, gameId, gameName) => {
        e.stopPropagation();
        const toastId = toast.loading('처리 중...');

        try {
            const response = await client.post(`/api/v1/wishlists/${gameId}`);
            const message = response.data;

            // 1. 추가됐는지 삭제됐는지 확인
            const isAdded = message.includes("추가");

            // 2. [핵심] 화면의 게임 목록 상태(State)를 즉시 업데이트!
            // 방금 누른 게임만 쏙 골라서 'liked' 상태를 변경해줍니다.
            setGames(prevGames => prevGames.map(game =>
                game.id === gameId ? { ...game, liked: isAdded } : game
            ));

            toast.success(message, {
                id: toastId,
                icon: isAdded ? '❤️' : '💔'
            });

        } catch (error) {
            console.error(error);
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
                {/* 헤더 */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">
                            Latest <span className="text-ps-blue">Deals</span>
                        </h1>
                        {!loading && (
                            <p className="text-ps-muted text-sm mt-1">
                                Total <span className="text-white font-bold">{totalElements.toLocaleString()}</span> games found
                            </p>
                        )}
                    </div>

                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="게임 제목 검색 (Enter)..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full bg-ps-card border border-white/10 rounded-full py-2 px-5 pl-10 text-sm focus:outline-none focus:border-ps-blue transition-colors text-white"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="/wishlist" className="text-sm font-bold text-white bg-ps-blue px-4 py-2 rounded-full hover:bg-blue-600 transition-colors whitespace-nowrap">
                            내 찜 목록 ❤️
                        </a>
                        <button onClick={handleLogout} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
                            로그아웃
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-ps-muted py-20 animate-pulse">Loading games...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                            {games.length > 0 ? (
                                games.map((game) => (
                                    <div key={game.id} className="group bg-ps-card rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 shadow-lg cursor-pointer border border-transparent hover:border-ps-blue/30 relative">

                                        <div className="aspect-[3/4] overflow-hidden relative">
                                            <img
                                                src={game.imageUrl}
                                                alt={game.name}
                                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                            />

                                            {/* [Updated] 하트 버튼 분기 처리 */}
                                            <button
                                                onClick={(e) => handleLike(e, game.id, game.name)}
                                                className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-ps-blue/80 text-white transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title={game.liked ? "찜 해제" : "찜하기"}
                                            >
                                                {/* game.liked 상태에 따라 다른 아이콘 보여주기 */}
                                                {game.liked ? (
                                                    // 꽉 찬 하트 (찜 상태)
                                                    <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24">
                                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3.25 7.5 3.25c1.548 0 3.09.661 4.213 1.76L12 5.383l.287-.288c1.125-1.099 2.667-1.76 4.213-1.76 2.786 0 5.25 2.072 5.25 5.001 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                                    </svg>
                                                ) : (
                                                    // 빈 하트 (미찜 상태)
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                )}
                                            </button>

                                            {game.discountRate > 0 && (
                                                <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md">
                                                    -{game.discountRate}%
                                                </span>
                                            )}
                                            {game.plusExclusive && (
                                                <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span>
                                            )}
                                        </div>
                                        {/* ... (아래 정보 영역 코드는 동일) ... */}
                                        <div className="p-4">
                                            <h3 className="text-sm font-bold text-gray-200 line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-ps-blue transition-colors">{game.name}</h3>
                                            <div className="flex flex-col gap-0.5">
                                                {game.discountRate > 0 && (
                                                    <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>
                                                )}
                                                <div className="flex justify-between items-end mt-1">
                                                    <span className="text-lg font-black text-white">{game.price?.toLocaleString()}원</span>
                                                    {game.metaScore > 0 && (
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${game.metaScore >= 80 ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>{game.metaScore}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-20 text-ps-muted">
                                    검색 결과가 없습니다.
                                </div>
                            )}
                        </div>
                        {/* 페이지네이션 영역 동일 ... */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2">
                                <button onClick={() => setPage(0)} disabled={page === 0} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed">&lt;&lt; First</button>
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                                <span className="text-ps-muted text-sm px-4">Page <span className="text-white font-bold">{page + 1}</span> of {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                                <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed">Last &gt;&gt;</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default GameListPage;