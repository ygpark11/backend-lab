import React, {useCallback, useEffect, useRef, useState} from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import {useLocation} from 'react-router-dom';
import {useTransitionNavigate} from '../hooks/useTransitionNavigate';
import {getGenreBadgeStyle} from "../utils/uiUtils.js";
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {
    AlertTriangle,
    CheckSquare,
    Clock,
    ExternalLink,
    Gamepad2,
    Heart,
    Info,
    Mail,
    Pickaxe,
    PiggyBank,
    Scale,
    Server,
    Sparkles,
    Square,
    Timer,
    Trash2,
    TrendingDown,
    Triangle
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import DonationModal from '../components/DonationModal';
import {useCompareStore} from '../store/useCompareStore';
import CompareModal from '../components/CompareModal';
import HelpModal from '../components/common/HelpModal';

const WishlistPage = () => {
    const navigate = useTransitionNavigate();
    const location = useLocation();

    const { compareList, addToCompare, removeFromCompare, clearCompare } = useCompareStore();

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [onSaleOnly, setOnSaleOnly] = useState(false);

    const [isDonationOpen, setIsDonationOpen] = useState(false);

    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

    const [helpInfo, setHelpInfo] = useState({ isOpen: false, type: null });

    const [isFloatingVisible, setIsFloatingVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    const handleContactClick = useCallback((e) => {
        e.preventDefault();
        const email = 'pstracker.help@gmail.com';

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(email).then(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            }).catch(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            });
        } else {
            toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
        }

        setTimeout(() => {
            window.location.href = `mailto:${email}`;
        }, 500);
    }, []);

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
                params: { page: pageNumber, size: 30, sort: 'createdAt,desc' }
            });
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
                <div className="flex items-center gap-2 font-bold text-primary"><AlertTriangle className="w-5 h-5 text-red-500" /><span>삭제하시겠습니까?</span></div>
                <p className="text-sm text-secondary mb-2">'{gameName}'을(를) 목록에서 제거합니다.</p>
                <div className="flex gap-2">
                    <button onClick={() => { toast.dismiss(t.id); performDelete(gameId); }} className="flex-1 bg-red-500 text-white py-1.5 rounded text-sm font-bold hover:bg-red-600 transition">네, 삭제</button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-surface border border-divider text-secondary py-1.5 rounded text-sm font-bold hover:bg-surface-hover hover:text-primary transition">취소</button>
                </div>
            </div>
        ), {
            duration: 5000,
            position: 'top-center',
            style: { background: 'var(--color-bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }
        });
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

        } catch {
            toast.dismiss(toastId);
            toast.error("삭제 실패", { duration: 3000 });
        }
    };

    const handleToggleCompare = (e, game) => {
        e.stopPropagation();
        const realGameId = game.gameId || game.id;
        const isSelected = compareList.some(item => (item.gameId || item.id) === realGameId);

        if (isSelected) {
            removeFromCompare(realGameId);
        } else {
            const result = addToCompare(game);
            if (result === 'MAX') {
                toast.error("결승전(VS)은 딱 2개까지만 고를 수 있습니다!", {
                    duration: 3000,
                    style: { background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-default)' }
                });
            }
        }
    };


    const onSaleGames = games.filter(g => g.discountRate > 0);
    const displayedGames = onSaleOnly ? onSaleGames : games;

    const totalSavings = games.reduce((acc, game) => {
        if (!game.originalPrice || !game.currentPrice) return acc;
        const saving = game.originalPrice - game.currentPrice;
        return acc + (saving > 0 ? saving : 0);
    }, 0);

    const totalPlayTime = games.reduce((acc, game) => {
        if (!game.hltbMainStory) return acc;
        return acc + game.hltbMainStory;
    }, 0);

    if (loading && page === 0) return <div className="min-h-screen pt-20 flex justify-center bg-base"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-base text-primary relative transition-colors duration-500">
            <SEO title="나의 찜 목록" description="내가 찜한 게임들의 가격 변동을 확인하세요." />

            {/* Aurora 배경 + PS 심볼 워터마크 */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[120px] md:animate-[pulse_9s_ease-in-out_infinite]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-ps-blue/5 rounded-full blur-[100px] md:animate-[pulse_11s_ease-in-out_infinite]" />
                <div className="absolute top-20 right-10 flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                    <Triangle className="w-40 h-40 stroke-[2px]" />
                    <Heart className="w-40 h-40 stroke-[2px]" />
                    <Square className="w-40 h-40 stroke-[2px]" />
                </div>
            </div>

            <div className="pt-24 md:pt-32 px-6 md:px-10 pb-24 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:flex md:flex-row gap-5 mb-10">
                    <div className="relative flex-1 md:flex-none group overflow-hidden bg-surface border border-divider p-5 pr-8 rounded-2xl shadow-sm transition-all hover:border-[color:var(--bento-pink-border-hover)] hover:[box-shadow:var(--bento-pink-shadow)] md:min-w-[280px]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bento-pink-from)] rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:opacity-100 transition-colors"></div>

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="bg-[var(--bento-pink-from)] border border-[color:var(--bento-pink-border)] p-3.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <Heart className="w-7 h-7 text-pink-600 dark:text-pink-500 fill-current animate-pulse-slow drop-shadow-sm" />
                            </div>
                            <div className="flex flex-col">
                                    <span className="text-pink-600 dark:text-pink-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                        <Gamepad2 className="w-3.5 h-3.5" /> My Wishlist
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setHelpInfo({ isOpen: true, type: 'WISH_NOTI' }); }}
                                            className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300 transition-colors p-0.5 ml-1"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                    </span>
                                <div className="flex items-baseline gap-1.5">
                                        <span className="text-primary font-black text-4xl tracking-tight leading-none drop-shadow-md">
                                            {!loading ? totalElements : 0}
                                        </span>
                                    <span className="text-secondary font-bold text-sm ml-1">게임 찜함</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!loading && totalSavings > 0 && (
                        <div className="relative flex-1 md:flex-none group overflow-hidden bg-surface border border-divider p-5 pr-8 rounded-2xl shadow-sm transition-all hover:border-[color:var(--bento-green-border-hover)] hover:[box-shadow:var(--bento-green-shadow)] md:min-w-[280px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bento-green-from)] rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:opacity-100 transition-colors"></div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="bg-[var(--bento-green-from)] border border-[color:var(--bento-green-border)] p-3.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <PiggyBank className="w-7 h-7 text-green-600 dark:text-green-500 drop-shadow-sm" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-green-600 dark:text-green-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                        <TrendingDown className="w-3.5 h-3.5" /> Total Saved
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-green-600 dark:text-green-500 font-black text-2xl tracking-tighter">₩</span>
                                        <span className="text-primary font-black text-4xl tracking-tight leading-none drop-shadow-md">
                                            {totalSavings.toLocaleString()}
                                        </span>
                                        <span className="text-secondary font-bold text-sm ml-1">세이브!</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && totalPlayTime > 0 && (
                        <div className="relative flex-1 md:flex-none group overflow-hidden bg-surface border border-divider p-5 pr-8 rounded-2xl shadow-sm transition-all hover:border-[color:var(--bento-purple-border-hover)] hover:[box-shadow:var(--bento-purple-shadow)] md:min-w-[280px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bento-purple-from)] rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:opacity-100 transition-colors"></div>

                            <div className="flex items-center gap-5 relative z-10">
                                <div className="bg-[var(--bento-purple-from)] border border-[color:var(--bento-purple-border)] p-3.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <Clock className="w-7 h-7 text-purple-600 dark:text-purple-500 drop-shadow-sm" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-purple-600 dark:text-purple-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                        <Timer className="w-3.5 h-3.5" /> Time Required
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-primary font-black text-4xl tracking-tight leading-none drop-shadow-md">
                                            {Math.round(totalPlayTime).toLocaleString()}
                                        </span>
                                        <span className="text-secondary font-bold text-sm ml-1">시간 순삭!</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 필터 토글 */}
                {games.length > 0 && (
                    <div className="flex items-center gap-2 mb-5">
                        <button
                            onClick={() => setOnSaleOnly(prev => !prev)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all active:scale-95 ${
                                onSaleOnly
                                    ? 'bg-green-500 text-white border-green-500 shadow-[0_0_14px_rgba(34,197,94,0.45)]'
                                    : 'bg-[var(--bento-green-from)] text-green-600 dark:text-green-400 border-[color:var(--bento-green-border)] hover:border-[color:var(--bento-green-border-hover)] hover:[box-shadow:var(--bento-green-shadow)]'
                            }`}
                        >
                            <TrendingDown className="w-4 h-4" />
                            할인 중만 보기
                            {onSaleGames.length > 0 && (
                                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                                    onSaleOnly
                                        ? 'bg-white/20 text-white'
                                        : 'bg-green-500/15 text-green-600 dark:text-green-400'
                                }`}>
                                    {onSaleGames.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* 🎮 찜한 게임 카드 리스트 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {displayedGames.length > 0 ? displayedGames.map((game, index) => {
                        const realGameId = game.gameId || game.id;
                        const isLastElement = !onSaleOnly && displayedGames.length === index + 1;
                        const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                        const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                        const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                        const isClosing = !isLastCall && daysLeft <= 3;
                        const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
                        const isSelectedForCompare = compareList.some(item => (item.gameId || item.id) === realGameId);

                        return (
                            <div
                                key={realGameId}
                                ref={isLastElement ? lastGameElementRef : null}
                                onClick={() => navigate(`/games/${realGameId}`, { state: { background: location } })}
                                className={`group bg-surface rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-lg cursor-pointer border relative flex flex-col h-full 
                                    ${isSelectedForCompare ? 'ring-2 ring-ps-blue shadow-[0_0_20px_rgba(0,67,156,0.6)] border-ps-blue' :
                                    isPlatinum ? 'border-[color:var(--bento-yellow-border-hover)] shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'border-divider hover:border-[color:var(--bento-blue-border-hover)] hover:[box-shadow:var(--bento-blue-shadow)]'}`}
                            >
                                <div
                                    className="aspect-[3/4] overflow-hidden relative shrink-0"
                                >
                                    <PSGameImage src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]"><ExternalLink className="w-8 h-8 text-white drop-shadow-lg" /></div>

                                    {isPlatinum && <div className="absolute top-2 left-2 z-20"><Sparkles className="w-5 h-5 text-yellow-300 animate-pulse drop-shadow-md" /></div>}
                                    {isNew && !isPlatinum && <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">NEW</span>}

                                    {isLastCall && <span className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 막차!</span>}
                                    {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}

                                    <button onClick={(e) => handleRemove(e, realGameId, game.name)} className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white transition-all transform hover:scale-110 shadow-lg z-20"><Trash2 className="w-4 h-4" /></button>

                                    <button
                                        onClick={(e) => handleToggleCompare(e, game)}
                                        className={`absolute bottom-10 right-2 p-2 rounded-full transition-all transform hover:scale-110 shadow-lg z-20 backdrop-blur-sm border
                                            ${isSelectedForCompare ? 'bg-ps-blue text-white border-ps-blue shadow-[0_0_15px_rgba(0,67,156,0.8)]' : 'bg-black/60 text-gray-300 border-gray-500/50 hover:bg-ps-blue/80 hover:text-white hover:border-ps-blue'}`}
                                        title="VS 비교함에 담기"
                                    >
                                        {isSelectedForCompare ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    </button>

                                    {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}
                                    {game.inCatalog ? (
                                        <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(250,204,21,0.6)] z-10 flex items-center gap-1 animate-pulse-slow">
                                            <Gamepad2 className="w-3 h-3 fill-black" /> EXTRA
                                        </span>
                                    ) : game.isPlusExclusive ? (
                                        <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow-md">PLUS</span>
                                    ) : null}
                                </div>
                                <div className="p-4 flex flex-col flex-1 bg-transparent relative z-20">

                                    <div className="flex flex-wrap gap-1 mb-2 min-h-[22px] items-center">
                                        {game.isPs5ProEnhanced && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border font-black bg-gradient-to-r from-gray-300 to-white text-black border-white shadow-[0_0_8px_rgba(255,255,255,0.4)] tracking-wider">
                                                PRO
                                            </span>
                                        )}

                                        {game.genres && game.genres.length > 0 ? (
                                            game.genres.map((g, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-colors ${getGenreBadgeStyle(g)}`}>{g}</span>)
                                        ) : (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-surface-hover text-secondary border-divider">미분류</span>
                                        )}
                                    </div>

                                    {game.pioneerName && (
                                        <div className="self-start inline-flex items-center gap-1.5 mb-3 -ml-4 bg-surface border-y border-r border-divider border-l-[4px] border-l-ps-blue py-1 pl-3 pr-4 rounded-r-lg shadow-md">
                                            <Pickaxe className="w-3.5 h-3.5 text-ps-blue drop-shadow-sm" />
                                            <span className="text-[10.5px] sm:text-xs font-black text-ps-blue truncate max-w-[130px] sm:max-w-[160px]">
                                                {game.pioneerName}
                                            </span>
                                        </div>
                                    )}

                                    <h3 className="text-sm font-bold text-primary leading-[1.3] line-clamp-2 h-[2.6em] overflow-hidden mb-3 group-hover:text-ps-blue transition-colors relative z-20">
                                        {game.name.trim()}
                                    </h3>

                                    <div className="mt-auto relative z-20">
                                        {game.discountRate > 0 && <p className="whitespace-nowrap text-xs text-secondary line-through mb-1">{game.originalPrice?.toLocaleString()}원</p>}
                                        <div className="flex justify-between items-end gap-1 sm:gap-2 w-full">
                                            <p className="whitespace-nowrap text-base sm:text-lg font-black text-primary tracking-tight">
                                                {game.currentPrice?.toLocaleString() || game.price?.toLocaleString()}
                                                <span className="text-xs sm:text-sm font-medium ml-0.5">원</span>
                                            </p>

                                            {game.displayScore && (
                                                <div className="shrink-0 flex items-center shadow-sm rounded border border-divider overflow-hidden bg-surface">

                                                    <div className={`px-1.5 py-0.5 text-[10px] font-black flex items-center justify-center
                                                        ${game.scoreSource === 'MC'
                                                        ? 'bg-black text-white dark:bg-white dark:text-black'
                                                        : 'bg-[var(--bento-purple-from)] text-purple-700 dark:text-purple-300'}`}>
                                                        {game.scoreSource === 'MC' ? 'M' : 'I'}
                                                    </div>

                                                    <span className={`px-1.5 py-0.5 text-[11px] font-black tracking-tight
                                                        ${game.scoreSource === 'MC'
                                                        ? (game.displayScore >= 75 ? 'text-green-600 dark:text-green-400 bg-green-500/10'
                                                            : game.displayScore >= 50 ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10'
                                                                : 'text-red-600 dark:text-red-400 bg-red-500/10')
                                                        : 'text-primary'}`}>
                                                        {game.displayScore}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        !loading && (
                            onSaleOnly ? (
                                <div className="col-span-full text-center py-20 flex flex-col items-center gap-4">
                                    <TrendingDown className="w-12 h-12 text-muted" />
                                    <p className="text-secondary font-bold">현재 할인 중인 찜 게임이 없습니다.</p>
                                    <button onClick={() => setOnSaleOnly(false)} className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-divider rounded-xl text-sm font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-all active:scale-95">
                                        전체 보기
                                    </button>
                                </div>
                            ) : (
                                <div className="col-span-full text-center py-24 flex flex-col items-center justify-center gap-4 border border-divider rounded-2xl bg-surface shadow-sm">
                                    <Heart className="w-16 h-16 text-secondary animate-pulse" />
                                    <div>
                                        <p className="text-xl text-primary font-bold mb-2">아직 찜한 게임이 없습니다</p>
                                        <p className="text-secondary text-sm mb-6">마음에 드는 게임을 찾아 하트를 켜주세요!</p>
                                        <button onClick={() => navigate('/games')} className="px-8 py-3 bg-ps-blue text-white rounded-full font-bold hover:bg-blue-600 transition shadow-lg flex items-center gap-2 mx-auto">
                                            <Gamepad2 className="w-4 h-4"/> 게임 구경하러 가기
                                        </button>
                                    </div>
                                </div>
                            )
                        )
                    )}
                </div>

                {!loading && games.length > 0 && page >= totalPages - 1 && (
                    <div className="py-16 text-center flex flex-col items-center gap-3 border-t border-divider mt-10">
                        <Heart className="w-8 h-8 text-secondary opacity-50" />
                        <p className="text-secondary font-bold text-sm opacity-70">모든 찜 목록을 다 보셨습니다 ❤️</p>
                    </div>
                )}

                {loading && page > 0 && (
                    <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ps-blue"></div></div>
                )}

                {/* 하단 플로팅 버튼 영역 */}
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out ${(isFloatingVisible && compareList.length === 0) ? 'translate-y-0' : 'translate-y-32'}`}>
                    <div className="flex items-center gap-2 bg-glass backdrop-blur-md md:backdrop-blur-xl border border-divider p-2 pl-4 rounded-full shadow-glow">

                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-hover transition-all" title="맨 위로">
                            <Triangle className="w-5 h-5 text-green-500 fill-green-500 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] group-hover:-translate-y-1 transition-transform" />
                        </button>

                        <div className="w-[1px] h-6 bg-divider-strong mx-1"></div>

                        {/* 문의 버튼 */}
                        <button
                            onClick={handleContactClick}
                            className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all border border-[color:var(--bento-blue-border)] bg-[var(--bento-blue-from)] hover:border-[color:var(--bento-blue-border-hover)] relative overflow-hidden"
                            title="문의 및 제휴"
                        >
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-ps-blue drop-shadow-sm group-hover:scale-110 transition-transform" />
                        </button>

                        <div className="w-[1px] h-6 bg-divider-strong mx-1"></div>

                        {/* 후원 버튼 */}
                        <button
                            onClick={() => setIsDonationOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all border border-[color:var(--bento-yellow-border)] bg-[var(--bento-yellow-from)] hover:border-[color:var(--bento-yellow-border-hover)] relative overflow-hidden"
                            title="감자 서버 밥 주기"
                        >
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>

                            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] group-hover:scale-110 group-hover:-rotate-12 transition-transform" />
                            <span className="text-xs sm:text-sm font-black text-yellow-600 dark:text-yellow-500 whitespace-nowrap drop-shadow-md">감자 서버 밥 주기</span>
                        </button>

                    </div>
                </div>

                <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-in-out ${compareList.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="bg-base/85 dark:bg-black/70 backdrop-blur-md md:backdrop-blur-xl border-t border-[color:var(--bento-blue-border)] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] pb-safe pt-4 px-6 md:px-10">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-ps-blue animate-pulse" />
                                    <span className="font-black text-primary text-sm tracking-widest uppercase">VS Mode</span>
                                </div>
                                <div className="flex gap-2">
                                    {[0, 1].map((index) => {
                                        const slotGame = compareList[index];
                                        return (
                                            <div key={index} className={`w-12 h-12 rounded-lg border-2 overflow-hidden flex items-center justify-center transition-all ${slotGame ? 'border-ps-blue shadow-[0_0_10px_rgba(0,67,156,0.5)]' : 'border-dashed border-divider-strong bg-surface'}`}>
                                                {slotGame ? (
                                                    <img src={slotGame.imageUrl} alt="slot" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-muted text-xs font-bold">{index + 1}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex w-full md:w-auto gap-3">
                                <button onClick={clearCompare} className="px-4 py-3 bg-surface hover:bg-surface-hover border border-divider text-secondary text-sm font-bold rounded-xl transition-colors">
                                    비우기
                                </button>
                                <button
                                    onClick={() => setIsCompareModalOpen(true)}
                                    disabled={compareList.length < 2}
                                    className={`flex-1 md:w-48 py-3 rounded-xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2
                                        ${compareList.length === 2 ? 'bg-ps-blue text-white hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:-translate-y-1' : 'bg-surface border border-divider text-muted cursor-not-allowed'}`}
                                >
                                    <Scale className="w-4 h-4" />
                                    {compareList.length < 2 ? '1개 더 선택 필요' : `VS 스펙 비교하기`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />

            <CompareModal
                isOpen={isCompareModalOpen}
                onClose={() => setIsCompareModalOpen(false)}
            />

            <HelpModal
                isOpen={helpInfo.isOpen}
                type={helpInfo.type}
                onClose={() => setHelpInfo({ isOpen: false, type: null })}
            />
        </div>
    );
};
export default WishlistPage;