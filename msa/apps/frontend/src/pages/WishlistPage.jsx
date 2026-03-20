import React, { useEffect, useState, useRef, useCallback } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { getGenreBadgeStyle } from "../utils/uiUtils.js";
import SkeletonCard from '../components/SkeletonCard';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
    AlertTriangle, ExternalLink, Gamepad2, Heart, PiggyBank, Sparkles,
    Timer, Trash2, TrendingDown, Triangle, Server, Pickaxe
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import DonationModal from '../components/DonationModal';

const WishlistPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [isDonationOpen, setIsDonationOpen] = useState(false);
    const [isFloatingVisible, setIsFloatingVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollYRef.current && currentScrollY > 150) {
                setIsFloatingVisible(false);
            } else {
                setIsFloatingVisible(true);
            }

            lastScrollYRef.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 🚀 인피니트 스크롤 Observer
    const observer = useRef();
    const lastGameElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages - 1) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, page, totalPages]);

    useEffect(() => { fetchMyWishlist(page); }, [page]);

    useEffect(() => {
        const handleWishlistUpdate = (e) => {
            const { gameId, liked } = e.detail;

            // 찜 상태가 해제(false)되었다면 내 찜 목록 화면에서 날려버림
            if (!liked) {
                setGames(prev => prev.filter(game => Number(game.gameId || game.id) !== Number(gameId)));
                setTotalElements(prev => Math.max(0, prev - 1)); // 음수 방지
            }
        };

        window.addEventListener('ps-wishlist-updated', handleWishlistUpdate);
        return () => window.removeEventListener('ps-wishlist-updated', handleWishlistUpdate);
    }, []);

    const fetchMyWishlist = async (pageNumber) => {
        setLoading(true);
        try {
            const response = await client.get('/api/v1/wishlists', {
                params: { page: pageNumber, size: 20, sort: 'createdAt,desc' }
            });
            // 🚀 Append 방식 (인피니트 스크롤)
            if (pageNumber === 0) {
                setGames(response.data.content);
            } else {
                setGames(prev => {
                    const existingIds = new Set(prev.map(g => g.gameId || g.id));
                    const newGames = response.data.content.filter(g => !existingIds.has(g.gameId || g.id));
                    return [...prev, ...newGames];
                });
            }
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

            setGames(prev => prev.filter(game => Number(game.gameId || game.id) !== Number(gameId)));
            setTotalElements(prev => Math.max(0, prev - 1));

            toast.dismiss(toastId);
            toast.success("삭제되었습니다 🗑️", { duration: 3000 });

            window.dispatchEvent(new CustomEvent('ps-wishlist-updated', {
                detail: { gameId: Number(gameId), liked: false }
            }));

        } catch (error) {
            toast.dismiss(toastId);
            toast.error("삭제 실패", { duration: 3000 });
        }
    };

    const handleGenreClick = (e, genre) => {
        e.stopPropagation();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        navigate(`/games?genre=${encodeURIComponent(genre)}`, { state: null });
    };

    const totalSavings = games.reduce((acc, game) => {
        if (!game.originalPrice || !game.currentPrice) return acc;
        const saving = game.originalPrice - game.currentPrice;
        return acc + (saving > 0 ? saving : 0);
    }, 0);

    if (loading && page === 0) return <div className="min-h-screen pt-20 flex justify-center"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-ps-black text-white relative">
            <SEO title="나의 찜 목록" description="내가 찜한 게임들의 가격 변동을 확인하세요." />

            <div className="pt-24 md:pt-32 px-6 md:px-10 pb-24 max-w-7xl mx-auto">

                <div className="grid grid-cols-1 md:flex md:flex-row gap-5 mb-10">

                    <div className="relative flex-1 md:flex-none group overflow-hidden bg-black/40 border border-white/10 p-5 pr-8 rounded-2xl backdrop-blur-xl shadow-2xl transition-all hover:border-pink-500/50 md:min-w-[280px]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-pink-500/30 transition-colors"></div>

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3.5 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)]">
                                <Heart className="w-7 h-7 text-white fill-current animate-pulse-slow drop-shadow-sm" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                    <Gamepad2 className="w-3.5 h-3.5 text-pink-400" /> My Wishlist
                                </span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-white font-black text-4xl tracking-tight leading-none drop-shadow-md">
                                        {!loading ? totalElements : 0}
                                    </span>
                                    <span className="text-gray-500 font-bold text-sm ml-1">게임 찜함</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!loading && totalSavings > 0 && (
                        <div className="relative flex-1 md:flex-none group overflow-hidden bg-black/40 border border-white/10 p-5 pr-8 rounded-2xl backdrop-blur-xl shadow-2xl transition-all hover:border-green-500/50 md:min-w-[280px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-green-500/30 transition-colors"></div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="bg-gradient-to-br from-green-400 to-green-600 p-3.5 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.4)]">
                                    <PiggyBank className="w-7 h-7 text-black drop-shadow-sm" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                        <TrendingDown className="w-3.5 h-3.5 text-green-400" /> Total Saved
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-green-400 font-black text-2xl tracking-tighter">₩</span>
                                        <span className="text-white font-black text-4xl tracking-tight leading-none drop-shadow-md">
                                            {totalSavings.toLocaleString()}
                                        </span>
                                        <span className="text-gray-500 font-bold text-sm ml-1">세이브!</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {games.length > 0 ? games.map((game, index) => {
                        const realGameId = game.gameId || game.id;
                        const isLastElement = games.length === index + 1; // 🚀 마지막 요소 식별
                        const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                        const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                        const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                        const isClosing = !isLastCall && daysLeft <= 3;
                        const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

                        return (
                            <div
                                key={realGameId}
                                ref={isLastElement ? lastGameElementRef : null}
                                onClick={() => navigate(`/games/${realGameId}`, { state: { background: location } })}
                                className={`group bg-ps-card rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-300 shadow-lg cursor-pointer border relative flex flex-col h-full will-change-transform ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-transparent hover:border-red-500/50'}`}
                            >
                                <div className="aspect-[3/4] overflow-hidden relative shrink-0">
                                    <PSGameImage src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]"><ExternalLink className="w-8 h-8 text-white drop-shadow-lg" /></div>

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
                                        <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow-md">PLUS</span>
                                    ) : null}
                                </div>
                                <div className="p-4 flex flex-col flex-1 bg-[#111] transition-colors duration-300 group-hover:bg-[#181818] relative z-20">

                                    {/* 1. 장르 영역 */}
                                    <div className="flex flex-wrap gap-1 mb-2 min-h-[22px]">
                                        {game.genres && game.genres.length > 0 ? (
                                            game.genres.map((g, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-colors ${getGenreBadgeStyle(g)}`}>{g}</span>)
                                        ) : (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-gray-600/20 text-gray-400 border-gray-500/30">미분류</span>
                                        )}
                                    </div>

                                    {/*  2. 개척자 닉네임 */}
                                    {game.pioneerName && (
                                        <div className="self-start inline-flex items-center gap-1.5 mb-3 -ml-4 bg-gradient-to-r from-blue-600/20 to-transparent border-l-[3px] border-blue-400 pl-3 pr-4 py-0.5 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                                            <Pickaxe className="w-3.5 h-3.5 text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                                            <span className="text-[10.5px] sm:text-xs font-black text-blue-100 truncate max-w-[130px] sm:max-w-[160px] drop-shadow-md">
                                                    {game.pioneerName}
                                                </span>
                                        </div>
                                    )}

                                    {/* 3. 게임 제목 */}
                                    <h3 className="text-sm font-bold text-gray-100 leading-[1.3] line-clamp-2 h-[2.6em] overflow-hidden mb-3 group-hover:text-ps-blue transition-colors relative z-20">
                                        {game.name.trim()}
                                    </h3>

                                    {/* 4. 가격 정보 */}
                                    <div className="mt-auto relative z-20">
                                        {game.discountRate > 0 && <p className="whitespace-nowrap text-xs text-gray-500 line-through mb-1">{game.originalPrice?.toLocaleString()}원</p>}
                                        <div className="flex justify-between items-end gap-1 sm:gap-2 w-full">
                                            <p className="whitespace-nowrap text-base sm:text-lg font-black text-white tracking-tight">
                                                {game.currentPrice?.toLocaleString() || game.price?.toLocaleString()}
                                                <span className="text-xs sm:text-sm font-medium ml-0.5">원</span>
                                            </p>
                                            {game.metaScore > 0 && (
                                                <span className={`shrink-0 text-[10px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2 rounded shadow-sm ${game.metaScore >= 80 ? 'bg-green-900 text-green-300 border border-green-500/30' : 'bg-yellow-900 text-yellow-300 border border-yellow-500/30'}`}>
                                                    {game.metaScore}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        !loading && (
                            <div className="col-span-full text-center py-24 flex flex-col items-center justify-center gap-4 border border-white/5 rounded-2xl bg-white/5">
                                <Heart className="w-16 h-16 text-gray-600 animate-pulse" />
                                <div>
                                    <p className="text-xl text-white font-bold mb-2">아직 찜한 게임이 없습니다</p>
                                    <p className="text-gray-400 text-sm mb-6">마음에 드는 게임을 찾아 하트를 켜주세요!</p>
                                    <button onClick={() => navigate('/games')} className="px-8 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition shadow-lg hover:shadow-red-500/20 flex items-center gap-2 mx-auto">
                                        <Gamepad2 className="w-4 h-4"/> 게임 구경하러 가기
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {!loading && games.length > 0 && page >= totalPages - 1 && (
                    <div className="py-16 text-center flex flex-col items-center gap-3 opacity-50 border-t border-white/5 mt-10">
                        <Heart className="w-8 h-8 text-gray-500" />
                        <p className="text-gray-400 font-bold text-sm">모든 찜 목록을 다 보셨습니다 ❤️</p>
                    </div>
                )}

                {loading && page > 0 && (
                    <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>
                )}

                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out will-change-transform ${isFloatingVisible ? 'translate-y-0' : 'translate-y-24'}`}>
                    <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 p-2 pl-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">

                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all" title="맨 위로">
                            <Triangle className="w-5 h-5 text-green-400 fill-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)] group-hover:-translate-y-1 transition-transform" />
                        </button>

                        <div className="w-[1px] h-6 bg-white/20 mx-1"></div>

                        <button
                            onClick={() => setIsDonationOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all border border-yellow-500/40 bg-yellow-500/15 hover:bg-yellow-500/25 relative overflow-hidden"
                            title="감자 서버 밥 주기"
                        >
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>

                            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] group-hover:scale-110 group-hover:-rotate-12 transition-transform" />
                            <span className="text-xs sm:text-sm font-black text-yellow-500 whitespace-nowrap drop-shadow-md">감자 서버 밥 주기</span>
                        </button>

                    </div>
                </div>

            </div>
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
        </div>
    );
};
export default WishlistPage;