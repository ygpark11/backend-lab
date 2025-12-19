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
    if (firstGenre.includes('adventure')) return '🗺️';
    if (firstGenre.includes('shooter') || genreString.toLowerCase().includes('fps')) return '🔫';
    if (firstGenre.includes('sport')) return '⚽';
    if (firstGenre.includes('racing')) return '🏎️';
    if (firstGenre.includes('horror')) return '👻';
    if (firstGenre.includes('strategy')) return '🧠';
    return '🎮';
};

const WishlistPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    // 페이지네이션 상태
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const navigate = useNavigate();

    // 페이지 변경 시 다시 조회
    useEffect(() => {
        fetchMyWishlist(page);
    }, [page]);

    const fetchMyWishlist = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await client.get('/api/v1/wishlists', {
                params: {
                    page: pageNumber,
                    size: 20,
                    sort: 'createdAt,desc' // 최근 찜한 순
                }
            });
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            console.error(error);
            toast.error("찜 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (e, gameId, gameName) => {
        e.stopPropagation(); // [중요] 상세 페이지 이동 방지

        if (!window.confirm(`'${gameName}'을(를) 찜 목록에서 삭제할까요?`)) return;

        const toastId = toast.loading('삭제 중...');
        try {
            await client.post(`/api/v1/wishlists/${gameId}`);

            // 삭제 후 현재 페이지 새로고침
            await fetchMyWishlist(page);

            toast.success("삭제되었습니다. 💔", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("삭제 실패", { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-ps-black text-white p-6 md:p-10 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">
                            My <span className="text-ps-blue">Wishlist</span> ❤️
                        </h1>
                        {!loading && (
                            <p className="text-ps-muted text-sm mt-1">
                                Total <span className="text-white font-bold">{totalElements}</span> items
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/games')}
                        className="text-sm font-bold text-gray-400 hover:text-white transition-colors"
                    >
                        ← 목록으로 돌아가기
                    </button>
                </div>

                {loading ? (
                    <div className="text-center text-ps-muted py-20 animate-pulse">Loading...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                            {games.length > 0 ? (
                                games.map((game) => {
                                    // DTO 필드 확인 (id는 찜ID, gameId는 게임ID일 수 있음)
                                    // 백엔드 WishlistResponse에서 this.id = wishlist.getId(), this.gameId = game.getId()로 줬다면 gameId 사용
                                    // 안전하게 둘 다 체크
                                    const realGameId = game.gameId || game.id;

                                    // 뱃지 로직 (백엔드에서 날짜 정보를 줘야 함)
                                    const isNew = game.createdAt && differenceInDays(new Date(), parseISO(game.createdAt)) <= 3;
                                    const isClosing = game.saleEndDate && differenceInDays(parseISO(game.saleEndDate), new Date()) <= 3;

                                    return (
                                        <div
                                            key={realGameId}
                                            onClick={() => navigate(`/games/${realGameId}`)}
                                            className="group bg-ps-card rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 shadow-lg cursor-pointer border border-transparent hover:border-red-500/50 relative"
                                        >
                                            <div className="aspect-[3/4] overflow-hidden relative">
                                                <img
                                                    src={game.imageUrl}
                                                    alt={game.name}
                                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                                />

                                                {/* 1. NEW 뱃지 */}
                                                {isNew && (
                                                    <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">
                                                        NEW
                                                    </span>
                                                )}

                                                {/* 2. 마감임박 뱃지 */}
                                                {isClosing && (
                                                    <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse z-10">
                                                        마감임박
                                                    </span>
                                                )}

                                                {/* 3. 삭제 버튼 (오른쪽 상단) */}
                                                <button
                                                    onClick={(e) => handleRemove(e, realGameId, game.name)}
                                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-red-500 hover:text-white transition-all transform hover:scale-110 shadow-lg z-20"
                                                    title="찜 해제"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                                {/* 4. 할인율 뱃지 */}
                                                {game.discountRate > 0 && (
                                                    <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md">
                                                        -{game.discountRate}%
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-4">
                                                {/* 5. 장르 표시 */}
                                                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                                    <span>{getGenreEmoji(game.genreIds)}</span>
                                                    <span className="truncate max-w-[150px]">
                                                        {game.genreIds ? game.genreIds.split(',')[0] : 'Game'}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-bold text-gray-200 line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-ps-blue transition-colors">
                                                    {game.name}
                                                </h3>

                                                <div className="flex flex-col gap-0.5">
                                                    {game.discountRate > 0 && (
                                                        <span className="text-xs text-gray-500 line-through">
                                                            {game.originalPrice?.toLocaleString()}원
                                                        </span>
                                                    )}
                                                    <div className="flex justify-between items-end mt-1">
                                                        <span className="text-lg font-black text-white">
                                                            {game.currentPrice?.toLocaleString()}원
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full text-center py-20 bg-ps-card rounded-xl border border-white/5">
                                    <p className="text-xl text-white mb-2">찜한 게임이 없습니다.</p>
                                    <p className="text-ps-muted mb-6">마음에 드는 게임에 하트(❤️)를 눌러보세요!</p>
                                    <button
                                        onClick={() => navigate('/games')}
                                        className="px-6 py-2 bg-ps-blue rounded-full font-bold hover:bg-blue-600 transition shadow-lg"
                                    >
                                        게임 구경하러 가기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2">
                                <button
                                    onClick={() => setPage(0)}
                                    disabled={page === 0}
                                    className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    &lt;&lt; First
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-ps-muted text-sm px-4">
                                    Page <span className="text-white font-bold">{page + 1}</span> of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page === totalPages - 1}
                                    className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setPage(totalPages - 1)}
                                    disabled={page === totalPages - 1}
                                    className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Last &gt;&gt;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;