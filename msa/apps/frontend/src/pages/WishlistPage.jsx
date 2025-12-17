import React, { useEffect, useState } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

const WishlistPage = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    // [New] 페이지네이션 상태 추가
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 페이지 변경 시 다시 조회
    useEffect(() => {
        fetchMyWishlist(page);
    }, [page]);

    const fetchMyWishlist = async (pageNumber) => {
        setLoading(true);
        try {
            // [New] 파라미터로 페이지 번호 전달
            const response = await client.get('/api/v1/wishlists', {
                params: {
                    page: pageNumber,
                    size: 20, // 20개씩 보기
                    sort: 'createdAt,desc' // 최근 찜한 순서
                }
            });
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            toast.error("찜 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (e, gameId, gameName) => {
        e.stopPropagation();
        const toastId = toast.loading('삭제 중...');
        try {
            await client.post(`/api/v1/wishlists/${gameId}`);

            // 삭제 후 현재 페이지 새로고침
            await fetchMyWishlist(page);

            toast.success(`'${gameName}' 삭제 완료`, { id: toastId, icon: '💔' });
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
                        {/* [New] 전체 찜 개수 */}
                        {!loading && (
                            <p className="text-ps-muted text-sm mt-1">
                                Total <span className="text-white font-bold">{totalElements}</span> items
                            </p>
                        )}
                    </div>
                    <a href="/games" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
                        ← 목록으로 돌아가기
                    </a>
                </div>

                {loading ? (
                    <div className="text-center text-ps-muted py-20">Loading...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                            {games.length > 0 ? (
                                games.map((game) => {
                                    const realGameId = game.id || game.gameId;
                                    return (
                                        <div key={realGameId} className="group bg-ps-card rounded-lg overflow-hidden shadow-lg border border-transparent hover:border-red-500/50 relative">
                                            <div className="aspect-[3/4] overflow-hidden relative">
                                                <img
                                                    src={game.imageUrl}
                                                    alt={game.name}
                                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                                />
                                                <button
                                                    onClick={(e) => handleRemove(e, realGameId, game.name)}
                                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-red-500 hover:text-white transition-all transform hover:scale-110 shadow-lg z-10"
                                                    title="찜 해제"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3.25 7.5 3.25c1.548 0 3.09.661 4.213 1.76L12 5.383l.287-.288c1.125-1.099 2.667-1.76 4.213-1.76 2.786 0 5.25 2.072 5.25 5.001 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                                    </svg>
                                                </button>
                                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-4 pt-10">
                                                    <p className="text-white font-black text-lg text-right">
                                                        {game.currentPrice?.toLocaleString()}원
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-sm font-bold text-gray-200 line-clamp-2">{game.name}</h3>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full text-center py-20 bg-ps-card rounded-xl border border-white/5">
                                    <p className="text-xl text-white mb-2">찜한 게임이 없습니다.</p>
                                    <p className="text-ps-muted">마음에 드는 게임에 하트(❤️)를 눌러보세요!</p>
                                </div>
                            )}
                        </div>

                        {/* [New] 페이지네이션 UI (GameList와 동일 디자인) */}
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