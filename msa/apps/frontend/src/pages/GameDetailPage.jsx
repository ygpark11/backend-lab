import React, {useEffect, useState} from 'react';
import {useLocation, useParams} from 'react-router-dom';
import {useTransitionNavigate} from '../hooks/useTransitionNavigate';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import RelatedGameCard from '../components/RelatedGameCard';
import {getGenreBadgeStyle} from '../utils/uiUtils';
import {getTrafficLight} from '../utils/priceUtils';
import TargetPriceModal from '../components/TargetPriceModal';
import StealthPanel from '../components/StealthPanel';
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowUpRight,
    Building2,
    Calendar,
    CalendarDays,
    Check,
    Circle,
    Crosshair,
    ExternalLink,
    Gamepad2,
    Heart,
    HelpCircle,
    Layers,
    Link,
    MonitorPlay,
    Pickaxe,
    Plus,
    RefreshCw,
    Search,
    Server,
    ShieldAlert,
    Sparkles,
    Square,
    Timer,
    Trash2,
    TrendingDown,
    TrendingUp,
    Triangle,
    Users,
    X,
    Youtube
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';

import {adminApi} from '../api/adminApi';
import {useCurrentUser} from '../hooks/useCurrentUser';
import DonationModal from '../components/DonationModal';
import {useAuth} from '../contexts/AuthContext';

const renderVerdictIcon = (verdict) => {
    const buttonBase = "w-14 h-14 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-xl transition-all border-divider-strong bg-surface";
    switch (verdict) {
        case 'BUY_NOW':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(34,197,94,0.3)]`}><Circle className="w-8 h-8 text-green-500 fill-green-500/20 stroke-[3px]" /></div>;
        case 'GOOD_OFFER':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(234,179,8,0.3)]`}><Triangle className="w-8 h-8 text-yellow-500 fill-yellow-500/20 stroke-[3px]" /></div>;
        case 'WAIT':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(239,68,68,0.3)]`}><X className="w-8 h-8 text-red-500 stroke-[4px]" /></div>;
        case 'TRACKING':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(59,130,246,0.3)]`}><Square className="w-8 h-8 text-ps-blue fill-blue-500/20 stroke-[3px]" /></div>;
        default:
            return <div className={buttonBase}><HelpCircle className="w-10 h-10 text-muted" /></div>;
    }
};

const renderMiniVerdictIcon = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW': return <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 fill-green-500/20 stroke-[3px] drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />;
        case 'GOOD_OFFER': return <Triangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500/20 stroke-[3px] drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />;
        case 'WAIT': return <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 stroke-[4px] drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />;
        case 'TRACKING': return <Square className="w-4 h-4 sm:w-5 sm:h-5 text-ps-blue fill-blue-500/20 stroke-[3px] drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />;
        default: return null;
    }
};

const BackgroundHero = ({ imageUrl }) => (
    <div className="absolute top-0 left-0 w-full h-[120vh] max-h-[1000px] z-0 pointer-events-none select-none overflow-hidden md:rounded-t-2xl">
        <PSGameImage src={imageUrl} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-25 dark:opacity-45 blur-[10px] dark:brightness-[0.7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-base/40 to-transparent"></div>

        <div className="absolute inset-0 z-20 md:mix-blend-screen md:dark:mix-blend-screen opacity-40 md:opacity-50">
            <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[60px] sm:blur-[120px] md:animate-[pulse_8s_ease-in-out_infinite]"></div>
            <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[60px] sm:blur-[120px] md:animate-[pulse_10s_ease-in-out_infinite]"></div>
        </div>
    </div>
);

export default function GameDetailPage() {
    const { id } = useParams();
    const navigate = useTransitionNavigate();
    const location = useLocation();

    const isModal = Boolean(location.state?.background);

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isDonationOpen, setIsDonationOpen] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

    const { isAdmin } = useCurrentUser();
    const { isAuthenticated, openLoginModal } = useAuth();

    const [voteCounts, setVoteCounts] = useState({ likes: 0, dislikes: 0 });
    const [userVote, setUserVote] = useState(null);

    useEffect(() => {
        if (isModal) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = 'unset'; };
        }
    }, [isModal]);

    const handleClose = () => {
        if (location.state?.background) {
            const bg = location.state.background;
            navigate(`${bg.pathname}${bg.search}`, { replace: true });
        } else {
            navigate('/games', { replace: true });
        }
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await client.get(`/api/v1/games/${id}`);
                setGame(res.data);
                if (res.data.liked !== undefined) setIsLiked(res.data.liked);

                setVoteCounts({
                    likes: res.data.likeCount || 0,
                    dislikes: res.data.dislikeCount || 0
                });
                setUserVote(res.data.userVote || null);

            } catch (err) {
                console.error(err);
                toast.error("정보 로딩 실패");
                navigate('/games');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const handleDeleteGame = () => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px] bg-surface text-primary p-2 border border-divider rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                    <div>
                        <h4 className="font-bold text-sm text-red-500">관리자 삭제 모드</h4>
                        <p className="text-xs text-secondary">정말 이 게임을 영구 삭제하시겠습니까?</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={async () => {
                        toast.dismiss(t.id);
                        const loadId = toast.loading("데이터 파쇄 중...");
                        try {
                            await adminApi.deleteGame(id);
                            toast.success("삭제 완료!", { id: loadId });
                            navigate('/games', { replace: true, state: null });
                            window.location.reload();
                        } catch (err) {
                            toast.error("삭제 실패: 권한을 확인하세요.", { id: loadId });
                        }
                    }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors">
                        네, 삭제합니다
                    </button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-base border border-divider text-secondary hover:bg-surface-hover py-2 rounded-lg text-xs font-bold transition-colors">
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { background: 'transparent', boxShadow: 'none' } });
    };

    const handleTargetSubmit = async (targetPrice = null) => {
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${id}`, { targetPrice });
            const msg = response.data;
            const added = msg.includes("추가") || msg.includes("설정") || msg.includes("완료");

            setIsLiked(added);
            setIsTargetModalOpen(false);
            toast.success(msg, {
                id: toastId,
                icon: added ? <Heart className="w-5 h-5 text-red-500 fill-current animate-bounce" /> : <Heart className="w-5 h-5 text-secondary" />
            });

            window.dispatchEvent(new CustomEvent('ps-wishlist-updated', {
                detail: { gameId: Number(id), liked: added }
            }));

            const res = await client.get(`/api/v1/games/${id}`);
            setGame(res.data);
            return true;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                toast.dismiss(toastId);
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-sm text-primary">로그인이 필요한 기능입니다 🔒</span>
                        <span className="text-xs text-secondary mb-1">로그인하고 찜한 게임의 할인 알림을 받아보세요!</span>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => { toast.dismiss(t.id); openLoginModal(); }} className="bg-ps-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-md flex-1">로그인 하러 가기</button>
                            <button onClick={() => toast.dismiss(t.id)} className="bg-surface text-secondary border border-divider px-4 py-2 rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors flex-1">닫기</button>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-center', style: { background: 'var(--color-bg-base)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-border-default)' } });
            } else {
                const errorMessage = typeof error.response?.data === 'string'
                    ? error.response.data
                    : "요청 처리에 실패했습니다.";
                toast.error(errorMessage, { id: toastId });
            }
            return false;
        }
    };

    const onWishlistClick = async () => {
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }

        if (isLiked) {
            handleTargetSubmit(null);
        } else {
            const success = await handleTargetSubmit(null);
            if (success) setIsTargetModalOpen(true);
        }
    };

    const handleVote = async (type) => {
        const toastId = toast.loading('투표 기록 중...');
        try {
            const response = await client.post(`/api/v1/games/${id}/vote`, { voteType: type });

            setVoteCounts({
                likes: response.data.likeCount,
                dislikes: response.data.dislikeCount
            });

            const finalUserVote = response.data.userVote;
            setUserVote(finalUserVote);

            let toastMessage = '';
            if (finalUserVote === 'LIKE') toastMessage = '추천했습니다!';
            else if (finalUserVote === 'DISLIKE') toastMessage = '비추천했습니다.';
            else toastMessage = '평가를 취소했습니다.';

            toast.success(toastMessage, { id: toastId });
        } catch (error) {
            if (error.response?.status === 401) {
                toast.dismiss(toastId);
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-sm text-primary">로그인이 필요한 기능입니다 🔒</span>
                        <span className="text-xs text-secondary mb-1">로그인하고 커뮤니티 평가에 참여해보세요!</span>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => { toast.dismiss(t.id); openLoginModal(); }} className="bg-ps-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-md flex-1">로그인 하러 가기</button>
                            <button onClick={() => toast.dismiss(t.id)} className="bg-surface text-secondary border border-divider px-4 py-2 rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors flex-1">닫기</button>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-center', style: { background: 'var(--color-bg-base)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-border-default)' } });
            } else {
                const errorMessage = typeof error.response?.data === 'string'
                    ? error.response.data
                    : (error.response?.data?.message || "투표에 실패했습니다.");
                toast.error(errorMessage, { id: toastId });
            }
        }
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('링크가 복사되었습니다!', { style: { borderRadius: '10px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }, icon: <Check className="w-5 h-5 text-green-500" /> });
        } catch (err) {
            toast.error('링크 복사에 실패했습니다.');
        }
    };

    const handleRefresh = async () => {
        const loadId = toast.loading("최신 정보를 수집 요청 중...");
        try {
            await adminApi.refreshGame(id);
            toast.success("수집 요청 완료! 잠시 후 새로고침 됩니다.", { id: loadId });
            setTimeout(() => window.location.reload(), 4000);
        } catch (err) {
            toast.error("수집 요청 실패: 관리자 권한을 확인하세요.", { id: loadId });
        }
    };

    const handleGenreClick = (genre) => {
        const cleanGenre = genre.trim();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        navigate(`/games?genre=${encodeURIComponent(cleanGenre)}`, { state: null });
    };

    if (loading) return <div className="pt-20"><PSLoader /></div>;
    if (!game) return null;

    const traffic = getTrafficLight(game.priceVerdict);
    const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
    const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : null;
    const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
    const hasDescription = game.description && game.description !== "Full Data Crawler";

    const formatCount = (count) => {
        if (!count) return '0';
        return count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count.toLocaleString();
    };

    const mcDiff = (game.mcMetaScore && game.mcUserScore) ? Math.abs(game.mcMetaScore - (game.mcUserScore * 10)) : 0;
    const igdbDiff = (game.igdbCriticScore && game.igdbUserScore) ? Math.abs(game.igdbCriticScore - (game.igdbUserScore * 10)) : 0;
    const isDiscrepancyWarning = mcDiff >= 15 || igdbDiff >= 15;

    // 감성 태그 고유 색상 매핑 (네온 사이버펑크 감성)
    const tagStyles = [
        "text-cyan-400 border-cyan-500/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)]",
        "text-pink-400 border-pink-500/40 hover:shadow-[0_0_15px_rgba(236,72,153,0.6)]",
        "text-purple-400 border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.6)]",
        "text-yellow-400 border-yellow-500/40 hover:shadow-[0_0_15px_rgba(234,179,8,0.6)]",
        "text-green-400 border-green-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]"
    ];

    // 3. 가격 신호등 배경
    const glowStyle = {
        'BUY_NOW': 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]',
        'GOOD_OFFER': 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]',
        'WAIT': 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
    }[game.priceVerdict] || 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]';

    const pageContent = (
        <div className="relative z-10">
            <div className="p-4 sm:p-6 md:p-10 pb-20 max-w-5xl mx-auto">
                <button onClick={handleClose} className="mb-6 flex items-center text-secondary hover:text-primary transition-colors text-sm font-bold gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>

                <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                    <div className="w-full md:w-1/3 shrink-0 space-y-6">
                        <div
                            className={`rounded-xl overflow-hidden shadow-2xl border relative group bg-base ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-divider'}`}
                        >
                            <PSGameImage src={game.imageUrl} alt={game.title} className="w-full object-cover aspect-[3/4]" />
                            {isPlatinum && <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-xl pointer-events-none animate-pulse"></div>}
                            {isNew && <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-black px-2 py-1 rounded shadow-lg z-10">NEW</span>}
                            {isClosingSoon && <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 마감임박</span>}
                        </div>
                        {game.defenseTier && (
                            <div className={`bg-base/90 dark:bg-base/80 backdrop-blur-xl border rounded-xl p-4 text-center transition-colors shadow-lg hidden md:block ${
                                game.defenseTier.includes('S') || game.defenseTier.includes('A')
                                    ? 'border-red-500/30'
                                    : 'border-green-500/30'
                            }`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1 ${
                                    game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    <ShieldAlert className="w-3 h-3" /> 할인 방어력
                                </p>
                                <div className={`text-xl font-black mt-2 transition-all ${
                                    game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    {game.defenseTier}
                                </div>
                                <p className="text-xs text-primary dark:text-gray-200 mt-2 break-keep leading-relaxed font-bold">{game.defenseMessage}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-3 items-center">
                            {game.isPs5ProEnhanced && (
                                <span className="px-3 py-1 rounded-md text-xs font-black border border-divider bg-surface text-primary shadow-sm flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" /> PS5 Pro Enhanced
                                </span>
                            )}

                            {game.genres && game.genres.length > 0 ? game.genres.map(g => (
                                <button key={g} onClick={() => handleGenreClick(g)} className={`px-3 py-1 rounded-md text-xs font-bold border shadow-sm transition-all hover:opacity-80 ${getGenreBadgeStyle(g)}`}>
                                    {g}
                                </button>
                            )) : <span className="px-3 py-1 rounded-md text-xs font-bold border border-divider bg-surface text-secondary shadow-sm">미분류</span>}

                            {game.platforms && game.platforms.map(p => (
                                <span key={p} className="px-2.5 py-1 rounded-md text-xs font-bold border border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm cursor-default">
                                    {p}
                                </span>
                            ))}
                        </div>

                        <div className="flex justify-between items-start gap-4 mb-3">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-primary drop-shadow-sm flex-1 break-keep break-words">{game.title}</h1>
                            {isAdmin && (
                                <div className="flex gap-2 shrink-0 pt-1">
                                    <button onClick={handleRefresh} className="p-2 sm:p-3 rounded-full bg-[var(--bento-blue-from)] text-ps-blue hover:bg-[var(--bento-blue-border)] border border-[color:var(--bento-blue-border)] transition-all shadow-sm backdrop-blur-md group" title="정보 갱신"><RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-180 transition-transform duration-700" /></button>
                                    <button onClick={handleDeleteGame} className="p-2 sm:p-3 rounded-full bg-[var(--bento-red-from)] text-red-500 hover:bg-[var(--bento-red-border)] border border-[color:var(--bento-red-border)] transition-all shadow-sm backdrop-blur-md group" title="게임 삭제"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" /></button>
                                </div>
                            )}
                        </div>

                        {game.vibeTags && game.vibeTags.filter(tag => tag && tag.name && tag.color).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6 mt-1">
                                {game.vibeTags.filter(tag => tag && tag.name && tag.color).slice(0, 5).map((tag, idx) => (
                                    <span
                                        key={idx}
                                        style={{ '--tag-color': tag.color }}

                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-surface border border-divider shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_0_10px_var(--tag-color)] cursor-default group"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[color:var(--tag-color)] shadow-[0_0_5px_var(--tag-color)] opacity-80 group-hover:opacity-100 transition-opacity"></span>
                                        <span className="text-secondary group-hover:text-primary transition-colors tracking-wide">
                                            {tag.name}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
                            {game.isPs5ProEnhanced && (
                                <div className="flex items-center gap-2.5 bg-surface border-l-4 border-primary px-3 py-1.5 rounded-r-xl shadow-sm backdrop-blur-md cursor-default w-full sm:w-auto mt-1 sm:mt-0 order-last sm:order-none">
                                    <MonitorPlay className="w-4 h-4 sm:w-5 sm:h-5 text-primary drop-shadow-sm animate-pulse" />
                                    <div>
                                        <p className="text-primary font-black text-[11px] sm:text-xs tracking-wide drop-shadow-md">PS5 Pro 성능 향상</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-divider backdrop-blur-sm shadow-sm hover:bg-surface-hover transition-colors cursor-default">
                                <Building2 className="w-4 h-4 text-secondary" />
                                <span className="text-primary text-xs font-bold tracking-wide">{game.publisher}</span>
                            </div>
                            {game.releaseDate && (
                                <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-divider backdrop-blur-sm shadow-sm hover:bg-surface-hover transition-colors cursor-default">
                                    <Calendar className="w-4 h-4 text-secondary" />
                                    <span className="text-primary text-xs font-bold tracking-wide">{game.releaseDate.replace(/-/g, '. ')} 출시</span>
                                    {differenceInCalendarDays(new Date(), parseISO(game.releaseDate)) <= 180 && <span className="ml-1.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black shadow-sm animate-pulse">NEW</span>}
                                </div>
                            )}

                            {/* 4. 개척자 뱃지 */}
                            {game.pioneerName && (
                                <div className="flex items-center gap-1.5 bg-[rgba(59,130,246,0.12)] px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.3)] backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.15)] cursor-default transition-all hover:bg-[rgba(59,130,246,0.2)]">
                                    <Pickaxe className="w-4 h-4 text-ps-blue" />
                                    <span className="text-ps-blue text-[10px] sm:text-xs font-bold tracking-widest">최초 발굴</span>
                                    <div className="w-[1px] h-3 bg-ps-blue/40 mx-0.5"></div>
                                    <span className="text-primary text-xs sm:text-sm font-black drop-shadow-md">{game.pioneerName}</span>
                                </div>
                            )}
                        </div>

                        {/* 5. 가격 신호등 영역 */}
                        <div className={`p-5 sm:p-6 rounded-xl border-2 backdrop-blur-md md:backdrop-blur-xl mb-8 transition-all duration-300 relative overflow-hidden group bg-base/90 dark:bg-base/80 ${glowStyle}`}>
                            <div className="absolute inset-0 bg-gradient-to-r from-base to-transparent z-0 pointer-events-none"></div>
                            <div className="relative z-10 flex items-start gap-4 sm:gap-5">
                                <div className="shrink-0 scale-100 sm:scale-105">{renderVerdictIcon(game.priceVerdict)}</div>
                                <div className="flex-1">
                                    <h3 className="text-lg sm:text-xl font-black mb-1.5 text-primary drop-shadow-sm flex items-center gap-2">{traffic.text}</h3>
                                    <p className="text-xs sm:text-sm text-primary dark:text-gray-200 font-bold leading-relaxed">{traffic.desc}</p>
                                    {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                        <div className="mt-3 inline-flex items-center gap-2 text-[10px] sm:text-xs bg-surface px-3 py-1.5 rounded-lg border border-divider shadow-sm">
                                            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                                            <span className="text-secondary font-bold">History Low:</span>
                                            <span className="font-black text-primary text-xs sm:text-sm">{game.lowestPrice.toLocaleString()}원</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 가격 영역 */}
                        <div className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b border-divider">
                            <div>
                                {game.isPlusExclusive && <div className="flex items-center gap-1 mb-1 animate-pulse"><span className="bg-yellow-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span><span className="text-yellow-600 dark:text-yellow-500 text-xs font-bold">회원 특별 할인가</span></div>}
                                <span className={`text-5xl sm:text-6xl font-black tracking-tighter drop-shadow-xl break-keep ${game.isPlusExclusive ? 'text-yellow-600 dark:text-yellow-500' : 'text-primary'}`}>
                                    {game.currentPrice.toLocaleString()}<span className="text-xl sm:text-2xl font-medium text-secondary ml-1">원</span>
                                </span>
                            </div>
                            {game.discountRate > 0 && (
                                <div className="flex flex-col mb-1 sm:mb-2 animate-bounce-slow shrink-0">
                                    <span className="text-secondary line-through text-base sm:text-lg font-medium">{game.originalPrice.toLocaleString()}원</span>
                                    <span className={`px-2 sm:px-3 py-1 rounded-lg font-black text-base sm:text-lg text-center shadow-lg transform -rotate-2 ${game.isPlusExclusive ? 'bg-yellow-500 text-white' : 'bg-ps-blue text-white'}`}>-{game.discountRate}%</span>
                                </div>
                            )}
                        </div>

                        {/* 스텔스 브리핑 패널 */}
                        {game.scouterTotalWatchers > 0 && (
                            <div className="mb-6">
                                <StealthPanel
                                    watchersCount={game.scouterTotalWatchers}
                                    averagePrice={game.scouterAverageTargetPrice}
                                    isLiked={isLiked}
                                />
                            </div>
                        )}

                        {/* 에디션(가족 게임) 모아보기 UI */}
                        {game.familyGames && game.familyGames.length > 1 && (
                            <div className="mb-8 animate-fadeIn">
                                <h3 className="text-secondary text-xs font-bold mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                                    <Layers className="w-4 h-4 text-ps-blue" /> 에디션 비교 및 선택
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {game.familyGames.map((edition) => {
                                        const isCurrent = edition.id === game.id;
                                        const priceGap = edition.currentPrice - game.currentPrice;
                                        const isHigherTier = edition.originalPrice > game.originalPrice;
                                        const isLowerTier = edition.originalPrice < game.originalPrice;

                                        return (
                                            <button
                                                key={edition.id}
                                                onClick={() => navigate(`/games/${edition.id}`, { replace: true, state: location.state })}
                                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
                                                    isCurrent
                                                        ? 'bg-blue-50/90 dark:bg-blue-900/40 border-ps-blue ring-1 ring-ps-blue shadow-[0_0_20px_rgba(59,130,246,0.25)] cursor-default'
                                                        : 'bg-surface/50 dark:bg-surface/60 border-divider hover:bg-surface-hover hover:border-divider-strong hover:shadow-md cursor-pointer'
                                                }`}
                                                disabled={isCurrent}
                                            >
                                                <div className="flex-1 pr-4 mb-3 sm:mb-0 break-keep">
                                                    {isCurrent && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-ps-blue px-2.5 py-1 rounded-md mb-2 tracking-widest shadow-md">
                                                            <Check className="w-3 h-3" strokeWidth={3} /> 현재 보고 있는 게임
                                                        </span>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <div className="shrink-0">{renderMiniVerdictIcon(edition.priceVerdict)}</div>
                                                        <p className={`text-sm sm:text-base font-bold leading-tight ${isCurrent ? 'text-primary' : 'text-secondary group-hover:text-primary transition-colors'}`}>
                                                            {edition.name}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-divider pt-2 sm:pt-0">

                                                    {/* 1. 상위판이 더 저렴! */}
                                                    {!isCurrent && isHigherTier && priceGap < 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-green-500 bg-green-500/10 border border-green-500/30 px-1.5 py-1 rounded shadow-[0_0_10px_rgba(34,197,94,0.15)] whitespace-nowrap shrink-0">
                                                            <Sparkles className="w-3 h-3 text-green-500" /> 상위판이 더 저렴!
                                                        </span>
                                                    )}

                                                    {/* 2. 하위판인데 더 비쌈 */}
                                                    {!isCurrent && isLowerTier && priceGap > 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/30 px-1.5 py-1 rounded whitespace-nowrap shrink-0">
                                                            <AlertTriangle className="w-3 h-3 text-red-500" /> 하위판인데 더 비쌈
                                                        </span>
                                                    )}

                                                    {/* 3 & 4. 정상적인 상위 에디션 업그레이드 */}
                                                    {!isCurrent && isHigherTier && priceGap >= 0 && (
                                                        (priceGap <= 15000 && edition.discountRate > 0) ? (
                                                            // 소액 업그레이드 (노란색 쨍하게)
                                                            <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-1 rounded whitespace-nowrap shrink-0">
                                                                <ArrowUpRight className="w-3 h-3 text-yellow-500" /> +{priceGap.toLocaleString()}원 업그레이드
                                                            </span>
                                                        ) : (
                                                            // 일반적인 추가 금액 (차분한 보조색)
                                                            <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-secondary bg-surface border border-divider px-1.5 py-1 rounded whitespace-nowrap shrink-0">
                                                                <Plus className="w-3 h-3 text-muted" /> {priceGap.toLocaleString()}원 추가
                                                            </span>
                                                        )
                                                    )}

                                                    {/* 5. 절약 */}
                                                    {!isCurrent && isLowerTier && priceGap < 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-500 bg-blue-500/10 border border-blue-500/30 px-1.5 py-1 rounded whitespace-nowrap shrink-0">
                                                            <TrendingDown className="w-3 h-3 text-blue-500" /> {Math.abs(priceGap).toLocaleString()}원 절약
                                                        </span>
                                                    )}

                                                    {/* 할인율 표시 */}
                                                    {edition.discountRate > 0 && (
                                                        <span className="text-xs font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap shrink-0">
                                                            -{edition.discountRate}%
                                                        </span>
                                                    )}

                                                    {/* 가격 정보 */}
                                                    <div className="flex flex-col text-right min-w-[50px] sm:min-w-[60px] shrink-0">
                                                        {edition.discountRate > 0 && <span className="text-[10px] text-muted line-through leading-none">{edition.originalPrice.toLocaleString()}원</span>}
                                                        <span className={`font-black ${isCurrent ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}>
                                                            {edition.currentPrice.toLocaleString()}원
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {game.inCatalog && (
                            <div className="mb-8 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/30 flex items-center gap-4 shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                                <div className="bg-yellow-500/10 p-2 sm:p-3 rounded-lg border border-yellow-500/30 shrink-0"><Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" /></div>
                                <div><h4 className="text-yellow-600 dark:text-yellow-500 font-bold text-sm">PS Plus 스페셜 / 디럭스 포함</h4><p className="text-secondary text-xs mt-0.5">구독 회원은 추가 비용 없이 플레이 가능합니다.</p></div>
                            </div>
                        )}

                        {game.saleEndDate && game.discountRate > 0 && (
                            <div className="flex items-center gap-2 mb-8 text-sm bg-base/90 dark:bg-base/80 w-fit px-4 py-2 rounded-lg backdrop-blur-xl border border-divider shadow-sm">
                                <CalendarDays className="w-4 h-4 text-primary" />
                                <span className="text-primary font-bold">할인 종료:</span>
                                <span className="text-primary font-black">{game.saleEndDate.replace(/-/g, '.')}</span>
                                {daysLeft !== null && daysLeft >= 0 ? (
                                    daysLeft <= 1 ?
                                        <span className="text-orange-500 font-bold ml-1">({daysLeft}일 남음 - 막차!)</span> :
                                        <span className="text-primary font-bold ml-1">({daysLeft}일 남음)</span>
                                ) : (
                                    <span className="text-muted ml-1">(할인 종료)</span>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:justify-start gap-3 sm:gap-4 w-full mt-6 p-1 sm:p-0">
                            <a
                                href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-none shrink-0 flex items-center justify-center gap-2 bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 py-3 sm:py-4 px-6 sm:px-8 rounded-xl sm:rounded-full font-black text-sm sm:text-base text-center transition-transform hover:-translate-y-1 shadow-xl whitespace-nowrap group"
                            >
                                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
                                PS Store에서 보기
                            </a>

                            <div className="flex items-stretch gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
                                {game.liked && (
                                    <button
                                        onClick={() => setIsTargetModalOpen(true)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-full border border-[color:var(--bento-blue-border)] bg-[var(--bento-blue-from)] text-ps-blue hover:border-[color:var(--bento-blue-border-hover)] transition-all font-bold text-[11px] sm:text-sm shadow-sm hover:-translate-y-1"
                                    >
                                        <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {game.myTargetPrice ? (
                                                <>
                                                    <span className="sm:hidden">{game.myTargetPrice.toLocaleString()}원</span>
                                                    <span className="hidden sm:inline">{game.myTargetPrice.toLocaleString()}원 설정 중</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="sm:hidden">목표가</span>
                                                    <span className="hidden sm:inline">목표가 설정</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                )}

                                <button
                                    onClick={onWishlistClick}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 rounded-xl sm:rounded-full border transition-all font-bold shadow-lg hover:-translate-y-1 ${
                                        game.liked
                                            ? 'px-2 sm:px-6 bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500 hover:bg-red-500/20 backdrop-blur-xl'
                                            : 'px-4 sm:px-8 bg-base/95 dark:bg-glass border-divider hover:bg-surface-hover text-primary backdrop-blur-2xl'
                                    }`}
                                >
                                    <div className={`transition-transform duration-300 ${game.liked ? 'scale-110' : 'scale-100'}`}>
                                        <Heart className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${game.liked ? 'fill-current' : ''}`} />
                                    </div>
                                    <span className={`whitespace-nowrap text-[11px] sm:text-sm leading-tight ${game.liked ? 'hidden sm:inline' : 'inline'}`}>
                                        {game.liked ? '찜 취소' : '찜하기'}
                                    </span>
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="shrink-0 flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-full border border-divider bg-base/95 dark:bg-glass text-primary hover:bg-surface-hover transition-all font-bold shadow-lg hover:-translate-y-1 backdrop-blur-2xl"
                                >
                                    <Link className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16">
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">
                        <div className="bg-surface backdrop-blur-md p-4 sm:p-6 rounded-xl border border-divider shadow-md">
                            <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-ps-blue" /> 가격 변동 그래프</h3>
                            <PriceChart historyData={game.priceHistory} />
                        </div>
                        <div className="bg-surface backdrop-blur-md p-4 sm:p-6 rounded-xl border border-divider shadow-md">
                            <h3 className="text-lg font-bold text-primary mb-4">게임 정보</h3>
                            {hasDescription ? <p className="text-secondary text-xs sm:text-sm leading-relaxed whitespace-pre-line mb-6">{game.description}</p> : <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6"><AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" /><div><p className="text-yellow-600 dark:text-yellow-500 text-sm font-bold">상세 설명이 제공되지 않는 게임입니다.</p><p className="text-yellow-600/80 dark:text-yellow-500/80 text-xs mt-1">대신 아래 버튼을 통해 게임플레이 영상이나 리뷰를 찾아보세요!</p></div></div>}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[var(--bento-red-from)] hover:bg-[var(--bento-red-border)] border border-[color:var(--bento-red-border)] text-red-600 dark:text-red-500 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"><Youtube className="w-4 h-4" /> 유튜브 검색</a>
                                <a href={`https://www.google.com/search?q=${encodeURIComponent(game.title)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[var(--bento-blue-from)] hover:bg-[var(--bento-blue-border)] border border-[color:var(--bento-blue-border)] text-blue-700 dark:text-blue-500 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"><Search className="w-4 h-4" /> 구글 검색</a>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 sm:space-y-5">

                        {isDiscrepancyWarning && (
                            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                <span className="text-red-500 font-bold text-[11px] sm:text-xs leading-tight">
                                    주의: 전문가와 유저의 평가가 크게 엇갈리는 게임입니다.
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">

                            {/* [카드 1: Metacritic] */}
                            {(game.mcMetaScore > 0 || game.mcUserScore > 0) ? (
                                <div className={`relative group bg-surface border border-divider p-3 sm:p-4 rounded-xl backdrop-blur-md md:backdrop-blur-xl shadow-md transition-all 
                                    ${game.mcMetaScore >= 75 ? 'hover:border-green-500/50' : game.mcMetaScore >= 50 ? 'hover:border-yellow-500/50' : 'hover:border-red-500/50'}`}>

                                    {/* 출처 로고 */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="bg-black dark:bg-white text-white dark:text-black font-black text-[10px] px-1.5 py-0.5 rounded shadow-sm border border-divider">
                                            M
                                        </span>
                                        <span className="text-[10px] font-bold text-secondary">Metacritic</span>
                                    </div>

                                    {/* 전문가 점수 (Main) */}
                                    <div className="mb-2 relative group/tooltip cursor-help">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`font-black text-3xl sm:text-4xl tracking-tight leading-none drop-shadow-md 
                                                ${game.mcMetaScore >= 75 ? 'text-green-600 dark:text-green-400' : game.mcMetaScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {game.mcMetaScore || '-'}
                                            </span>
                                            <span className="text-muted font-bold text-[10px] sm:text-xs">/100</span>
                                            <span className="text-muted text-[9px] sm:hidden ml-1">({formatCount(game.mcMetaCount)})</span>
                                        </div>
                                        {/* Count Tooltip */}
                                        <div className="absolute bottom-full left-0 mb-2 w-max px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg border border-divider">
                                            총 {game.mcMetaCount?.toLocaleString() || 0}명의 전문가 평가
                                        </div>
                                    </div>

                                    {/* 유저 점수 (Sub) */}
                                    <div className="border-t border-divider pt-2 relative group/tooltip cursor-help">
                                        <div className="flex items-center justify-between">
                                            <span className="text-secondary text-[10px] font-bold uppercase">User</span>
                                            <span className={`font-black text-xs sm:text-sm 
                                                ${game.mcUserScore >= 7.5 ? 'text-green-600 dark:text-green-400' : game.mcUserScore >= 5.0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {game.mcUserScore > 0 ? game.mcUserScore.toFixed(1) : '-'}
                                            </span>
                                        </div>
                                        <span className="text-muted text-[9px] sm:hidden block text-right mt-0.5">({formatCount(game.mcUserCount)})</span>
                                        {/* Count Tooltip */}
                                        <div className="absolute top-full left-0 mt-2 w-max px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg border border-divider">
                                            총 {game.mcUserCount?.toLocaleString() || 0}명의 유저 평가
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-surface/30 border-2 border-dashed border-divider p-4 rounded-xl flex items-center justify-center h-full min-h-[100px] transition-colors hover:border-divider-strong overflow-hidden">
                                    <span className="text-[11px] sm:text-xs font-bold text-secondary whitespace-nowrap">메타크리틱 평가 없음</span>
                                </div>
                            )}

                            {/* [카드 2: IGDB] */}
                            {(game.igdbCriticScore > 0 || game.igdbUserScore > 0) ? (
                                <div className="relative group bg-surface border border-divider p-3 sm:p-4 rounded-xl backdrop-blur-md md:backdrop-blur-xl shadow-md transition-all hover:border-[color:var(--bento-purple-border)]">

                                    {/* 출처 로고 */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="bg-[var(--bento-purple-from)] text-purple-700 dark:text-purple-300 font-black text-[10px] px-1.5 py-0.5 rounded border border-[color:var(--bento-purple-border)] shadow-sm">IGDB</span>
                                        <span className="text-[10px] font-bold text-secondary">Community</span>
                                    </div>

                                    {/* 전문가 점수 (Main) */}
                                    <div className="mb-2 relative group/tooltip cursor-help">
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-black text-3xl sm:text-4xl tracking-tight leading-none drop-shadow-md text-purple-400">
                                                {game.igdbCriticScore || '-'}
                                            </span>
                                            <span className="text-muted font-bold text-[10px] sm:text-xs">/100</span>
                                            <span className="text-muted text-[9px] sm:hidden ml-1">({formatCount(game.igdbCriticCount)})</span>
                                        </div>
                                        {/* Count Tooltip (PC Only) */}
                                        <div className="absolute bottom-full left-0 mb-2 w-max px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg border border-divider">
                                            총 {game.igdbCriticCount?.toLocaleString() || 0}명의 전문가 평가
                                        </div>
                                    </div>

                                    {/* 유저 점수 (Sub) */}
                                    <div className="border-t border-divider pt-2 relative group/tooltip cursor-help">
                                        <div className="flex items-center justify-between">
                                            <span className="text-secondary text-[10px] font-bold uppercase">User</span>
                                            <span className="font-black text-primary text-xs sm:text-sm">{game.igdbUserScore > 0 ? (game.igdbUserScore * 10).toFixed(0) : '-'}</span>
                                        </div>
                                        <span className="text-muted text-[9px] sm:hidden block text-right mt-0.5">({formatCount(game.igdbUserCount)})</span>
                                        {/* Count Tooltip (PC Only) */}
                                        <div className="absolute top-full left-0 mt-2 w-max px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg border border-divider">
                                            총 {game.igdbUserCount?.toLocaleString() || 0}명의 유저 평가
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-surface/30 border-2 border-dashed border-divider p-4 rounded-xl flex items-center justify-center h-full min-h-[100px] transition-colors hover:border-divider-strong overflow-hidden">
                                    <span className="text-[11px] sm:text-xs font-bold text-secondary whitespace-nowrap">IGDB 평가 없음</span>
                                </div>
                            )}

                        </div>

                        <div className="bg-surface border border-divider p-5 sm:p-6 rounded-2xl backdrop-blur-md md:backdrop-blur-xl shadow-md relative overflow-hidden group/verdict mt-4">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent blur-[1px]"></div>
                            <h4 className="text-secondary text-xs font-bold mb-5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 uppercase tracking-widest"><Users className="w-3.5 h-3.5"/> Community Verdict</span>
                                <span className="text-primary bg-base px-2.5 py-1 rounded-full text-[10px] shadow-inner border border-divider">
                                    Total {(voteCounts.likes + voteCounts.dislikes).toLocaleString()}
                                </span>
                            </h4>

                            <div className="flex gap-3 sm:gap-4 mb-5">
                                <button
                                    onClick={() => handleVote('LIKE')}
                                    className={`relative flex-1 flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-300 overflow-hidden group ${
                                        userVote === 'LIKE'
                                            ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                                            : 'bg-base border-divider hover:bg-green-500/5 hover:border-green-500/30'
                                    }`}
                                >
                                    {userVote === 'LIKE' && <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent pointer-events-none"></div>}
                                    <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 transition-transform duration-300 group-active:scale-90 ${
                                        userVote === 'LIKE' ? 'bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-transparent'
                                    }`}>
                                        <Circle className={`w-6 h-6 sm:w-7 sm:h-7 stroke-[3.5px] transition-colors ${
                                            userVote === 'LIKE' ? 'text-green-600 dark:text-green-500 fill-green-500/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-secondary group-hover:text-green-600 dark:group-hover:text-green-500'
                                        }`} />
                                    </div>
                                    <span className={`relative z-10 font-black text-lg sm:text-xl leading-none tracking-tight ${
                                        userVote === 'LIKE' ? 'text-green-600 dark:text-green-500 drop-shadow-sm' : 'text-secondary group-hover:text-primary'
                                    }`}>{voteCounts.likes}</span>
                                </button>

                                <button
                                    onClick={() => handleVote('DISLIKE')}
                                    className={`relative flex-1 flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-300 overflow-hidden group ${
                                        userVote === 'DISLIKE'
                                            ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                                            : 'bg-base border-divider hover:bg-red-500/5 hover:border-red-500/30'
                                    }`}
                                >
                                    {userVote === 'DISLIKE' && <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none"></div>}
                                    <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 transition-transform duration-300 group-active:scale-90 ${
                                        userVote === 'DISLIKE' ? 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-transparent'
                                    }`}>
                                        <X className={`w-7 h-7 sm:w-8 sm:h-8 stroke-[4px] transition-colors ${
                                            userVote === 'DISLIKE' ? 'text-red-600 dark:text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-secondary group-hover:text-red-600 dark:group-hover:text-red-500'
                                        }`} />
                                    </div>
                                    <span className={`relative z-10 font-black text-lg sm:text-xl leading-none tracking-tight ${
                                        userVote === 'DISLIKE' ? 'text-red-600 dark:text-red-500 drop-shadow-sm' : 'text-secondary group-hover:text-primary'
                                    }`}>{voteCounts.dislikes}</span>
                                </button>
                            </div>

                            <div className="relative h-2 w-full bg-base rounded-full overflow-hidden border border-divider shadow-inner">
                                {(voteCounts.likes > 0 || voteCounts.dislikes > 0) ? (
                                    <div className="absolute inset-0 flex">
                                        <div className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000 ease-out relative" style={{ width: `${(voteCounts.likes / (voteCounts.likes + voteCounts.dislikes)) * 100}%` }}>
                                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                                        </div>
                                        <div className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-1000 ease-out relative" style={{ width: `${(voteCounts.dislikes / (voteCounts.likes + voteCounts.dislikes)) * 100}%` }}>
                                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--color-border-strong)_10px,var(--color-border-strong)_20px)] animate-[progress_2s_linear_infinite]"></div>
                                )}
                            </div>
                            {(voteCounts.likes === 0 && voteCounts.dislikes === 0) && <p className="text-center text-[10px] text-muted mt-2 font-bold animate-pulse">첫 번째 평가를 남겨주세요!</p>}
                        </div>

                        <div className="bg-surface p-5 sm:p-6 rounded-xl border border-divider text-center shadow-md relative overflow-hidden group mt-4">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>

                            <Server className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 dark:text-yellow-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />

                            <h4 className="font-bold text-primary mb-2 text-sm sm:text-base">감자 서버 밥 주기</h4>

                            <p className="text-[10px] sm:text-xs text-secondary mb-5 leading-relaxed">
                                PS Tracker로 게임값 아끼셨나요?<br/>
                                작은 후원이 무럭무럭 자라나는<br/>
                                감자 서버 유지에 큰 힘이 됩니다!
                            </p>

                            <button onClick={() => setIsDonationOpen(true)} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2.5 sm:py-3 rounded-lg transition-all shadow-md hover:shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm">
                                서버비 보태기 (후원) <ExternalLink className="w-4 h-4"/>
                            </button>

                            <Sparkles className="absolute top-4 right-4 w-4 h-4 text-yellow-500 opacity-20 animate-pulse" />
                        </div>
                    </div>
                </div>

                {game.relatedGames && game.relatedGames.length > 0 && (
                    <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-divider animate-fadeIn">
                        <h3 className="text-lg sm:text-xl font-black text-primary mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500" /><span>이 게임을 좋아한다면 (Recommended)</span></h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {game.relatedGames.map(related => <RelatedGameCard key={related.id} game={related} />)}
                        </div>
                    </div>
                )}
            </div>
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />

            <TargetPriceModal
                isOpen={isTargetModalOpen}
                onClose={() => setIsTargetModalOpen(false)}
                game={game}
                defenseTier={game.defenseTier}
                onSubmit={(price) => handleTargetSubmit(price)}
            />
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-backdrop backdrop-blur-sm animate-fadeIn p-0 md:p-8" onClick={handleClose}>
                <div
                    className="w-full h-full md:h-auto md:max-h-full max-w-6xl overflow-y-auto bg-base md:rounded-2xl shadow-2xl relative border border-divider [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-divider-strong hover:[&::-webkit-scrollbar-thumb]:bg-muted"
                    onClick={e => e.stopPropagation()}
                >
                    <SEO title={game.title} description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원`} image={game.imageUrl} url={`https://ps-signal.com/games/${id}`} />
                    <button onClick={handleClose} className="absolute top-4 right-4 z-[60] p-2 bg-surface hover:bg-red-500/20 rounded-full text-secondary hover:text-red-500 transition-colors border border-divider backdrop-blur-md"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                    <BackgroundHero imageUrl={game.imageUrl} />
                    {pageContent}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base text-primary relative overflow-hidden transition-colors duration-500">
            <SEO title={game.title} description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원`} image={game.imageUrl} url={`https://ps-signal.com/games/${id}`} />
            <BackgroundHero imageUrl={game.imageUrl} />
            {pageContent}
        </div>
    );
}