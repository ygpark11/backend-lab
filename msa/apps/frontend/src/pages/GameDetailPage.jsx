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
import HelpModal from '../components/common/HelpModal';
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
    Clock,
    Crosshair,
    ExternalLink,
    Gamepad2,
    Heart,
    HelpCircle,
    Layers,
    Link,
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
    TrendingUp,
    TrendingDown,
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
        case 'BUY_NOW': return <div className={`${buttonBase} shadow-[0_0_15px_rgba(34,197,94,0.3)]`}><Circle className="w-8 h-8 text-green-500 fill-green-500/20 stroke-[3px]" /></div>;
        case 'GOOD_OFFER': return <div className={`${buttonBase} shadow-[0_0_15px_rgba(234,179,8,0.3)]`}><Triangle className="w-8 h-8 text-yellow-500 fill-yellow-500/20 stroke-[3px]" /></div>;
        case 'WAIT': return <div className={`${buttonBase} shadow-[0_0_15px_rgba(239,68,68,0.3)]`}><X className="w-8 h-8 text-red-500 stroke-[4px]" /></div>;
        case 'TRACKING': return <div className={`${buttonBase} shadow-[0_0_15px_rgba(59,130,246,0.3)]`}><Square className="w-8 h-8 text-ps-blue fill-blue-500/20 stroke-[3px]" /></div>;
        default: return <div className={buttonBase}><HelpCircle className="w-10 h-10 text-muted" /></div>;
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

    const [helpInfo, setHelpInfo] = useState({ isOpen: false, type: null });

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
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }

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
            const errorMessage = typeof error.response?.data === 'string'
                ? error.response.data
                : (error.response?.data?.message || "투표에 실패했습니다.");
            toast.error(errorMessage, { id: toastId });
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: game.title,
            text: `${game.title} - ${game.currentPrice.toLocaleString()}원`,
            url: window.location.href,
        };

        if (navigator.share && navigator.canShare?.(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                // 공유 실패 시 클립보드로 폴백
            }
        }

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

    const traffic = getTrafficLight(game.priceVerdict, game);
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
    const igdbDiff = (game.igdbCriticScore && game.igdbUserScore) ? Math.abs(game.igdbCriticScore - game.igdbUserScore) : 0;
    const isDiscrepancyWarning = mcDiff >= 15 || igdbDiff >= 15;

    const formatPlayTime = (hours) => {
        if (!hours) return '-';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const tagStyles = [
        "text-cyan-400 border-cyan-500/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)]",
        "text-pink-400 border-pink-500/40 hover:shadow-[0_0_15px_rgba(236,72,153,0.6)]",
        "text-purple-400 border-purple-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.6)]",
        "text-yellow-400 border-yellow-500/40 hover:shadow-[0_0_15px_rgba(234,179,8,0.6)]",
        "text-green-400 border-green-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]"
    ];

    const glowStyle = {
        'BUY_NOW': 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]',
        'GOOD_OFFER': 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]',
        'WAIT': 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
    }[game.priceVerdict] || 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]';

    // 💡 새로운 공통 점수 색상 부여 함수 (신호등 로직 통일)
    const getScoreColor = (score, scale) => {
        if (!score) return 'text-primary';
        const percentage = scale === 10 ? score * 10 : score;
        if (percentage >= 75) return 'text-green-600 dark:text-green-400';
        if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const pageContent = (
        <div className="relative z-10">
            <div className="p-4 sm:p-6 md:p-8 pb-20 max-w-7xl mx-auto">
                <button onClick={handleClose} className="mb-6 flex items-center text-secondary hover:text-primary transition-colors text-sm font-bold gap-1 w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>

                {/* 💡 새로운 레이아웃 뼈대: 12칸 그리드 시스템 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

                    {/* ========================================== */}
                    {/* 📱 좌측 사이드바 (PC: Sticky 고정 / Mobile: 상단) */}
                    {/* ========================================== */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-5">
                        <div className={`rounded-2xl overflow-hidden shadow-2xl border relative group bg-base ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-divider'}`}>
                            <PSGameImage src={game.imageUrl} alt={game.title} className="w-full object-cover h-[42vh] lg:h-auto lg:aspect-[3/4]" />
                            {isPlatinum && <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-2xl pointer-events-none animate-pulse"></div>}
                            {isNew && <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-black px-2.5 py-1.5 rounded-lg shadow-lg z-10">NEW</span>}
                            {isClosingSoon && <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> 막차!</span>}
                        </div>

                        {/* 모바일에서는 아래로 빠지고, PC에서만 이미지 밑에 액션 버튼 고정 */}
                        <div className="hidden lg:flex flex-col gap-3">
                            <a
                                href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 py-4 rounded-2xl font-black transition-transform hover:-translate-y-1 shadow-xl group"
                            >
                                <Gamepad2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> PS Store 이동
                            </a>
                            <div className="flex gap-3">
                                {game.liked && (
                                    <button onClick={() => setIsTargetModalOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-[color:var(--bento-blue-border)] bg-[var(--bento-blue-from)] text-ps-blue hover:border-[color:var(--bento-blue-border-hover)] transition-all font-bold text-sm shadow-sm hover:-translate-y-1">
                                        <Crosshair className="w-4 h-4 shrink-0" />
                                        <span>{game.myTargetPrice ? `${game.myTargetPrice.toLocaleString()}원` : '목표가 설정'}</span>
                                    </button>
                                )}
                                <button onClick={onWishlistClick} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border transition-all font-bold shadow-md hover:-translate-y-1 ${game.liked ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500 hover:bg-red-500/20' : 'bg-surface border-divider hover:bg-surface-hover text-primary'}`}>
                                    <Heart className={`w-4 h-4 shrink-0 ${game.liked ? 'fill-current' : ''}`} /> {game.liked ? '찜 취소' : '찜하기'}
                                </button>
                                <button onClick={handleShare} className="shrink-0 flex items-center justify-center px-4 rounded-xl border border-divider bg-surface text-primary hover:bg-surface-hover transition-all font-bold shadow-md hover:-translate-y-1">
                                    <Link className="w-4 h-4 shrink-0" />
                                </button>
                            </div>
                        </div>

                        {game.defenseTier && (
                            <div className={`hidden lg:block bg-base/90 backdrop-blur-xl border rounded-2xl p-5 text-center transition-colors shadow-lg ${game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'border-red-500/30' : 'border-green-500/30'}`}>
                                <div className={`flex items-center justify-center gap-1.5 mb-1 ${game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'text-red-500' : 'text-green-500'}`}>
                                    <ShieldAlert className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">할인 방어력</span>
                                </div>
                                <div className={`text-2xl font-black mt-2 ${game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'text-red-500' : 'text-green-500'}`}>{game.defenseTier}</div>
                                <p className="text-xs text-secondary mt-2 font-bold">{game.defenseMessage}</p>
                            </div>
                        )}
                    </div>

                    {/* ========================================== */}
                    {/* 💻 우측 메인 콘텐츠 영역 (Scrollable) */}
                    {/* ========================================== */}
                    <div className="lg:col-span-8 flex flex-col min-w-0">

                        {/* 1. 타이틀 & 메타 태그 헤더 */}
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2 mb-4 items-center">
                                {game.isPs5ProEnhanced && <span className="px-3 py-1 rounded-md text-xs font-black border border-divider bg-surface text-primary shadow-sm flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> PS5 Pro</span>}
                                {game.genres && game.genres.length > 0 ? game.genres.map(g => <button key={g} onClick={() => handleGenreClick(g)} className={`px-3 py-1 rounded-md text-xs font-bold border shadow-sm transition-all hover:opacity-80 ${getGenreBadgeStyle(g)}`}>{g}</button>) : <span className="px-3 py-1 rounded-md text-xs font-bold border border-divider bg-surface text-secondary shadow-sm">미분류</span>}
                                {game.platforms && game.platforms.map(p => <span key={p} className="px-2.5 py-1 rounded-md text-xs font-bold border border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm cursor-default">{p}</span>)}
                            </div>

                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-3xl md:text-5xl font-black leading-tight text-primary drop-shadow-sm flex-1 break-keep break-words">{game.title}</h1>
                                {isAdmin && (
                                    <div className="flex gap-2 shrink-0 pt-2">
                                        <button onClick={handleRefresh} className="p-2.5 rounded-xl bg-surface border border-divider hover:bg-[var(--bento-blue-from)] text-secondary hover:text-ps-blue transition-all"><RefreshCw className="w-4 h-4" /></button>
                                        <button onClick={handleDeleteGame} className="p-2.5 rounded-xl bg-surface border border-divider hover:bg-[var(--bento-red-from)] text-secondary hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs font-bold text-secondary">
                                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {game.publisher}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {game.releaseDate?.replace(/-/g, '. ')}</span>
                                {game.pioneerName && <span className="flex items-center gap-1.5 text-ps-blue bg-blue-500/10 px-2 py-0.5 rounded-md"><Pickaxe className="w-3.5 h-3.5" /> {game.pioneerName} 발굴</span>}
                            </div>

                            {game.vibeTags && game.vibeTags.filter(tag => tag && tag.name && tag.color).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
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
                        </div>

                        {/* 2. 구매 결정 핵심 패널 (가격 + 신호등 통합) */}
                        <div className={`p-6 md:p-8 rounded-3xl border-2 backdrop-blur-xl mb-8 transition-all relative overflow-hidden group ${glowStyle}`}>
                            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8 flex-wrap">

                                {/* 1. 좌측: 가격 신호등 */}
                                <div className="flex-1 flex items-center gap-4 sm:gap-5 bg-base/50 p-4 md:p-5 rounded-2xl border border-divider min-w-0 shadow-sm">
                                    <div className="shrink-0 scale-100 sm:scale-110">{renderVerdictIcon(game.priceVerdict)}</div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg md:text-2xl font-black mb-1.5 text-primary break-keep">{traffic.text}</h3>
                                        <p className="text-xs sm:text-sm text-secondary font-bold leading-tight break-keep">{traffic.desc}</p>
                                    </div>
                                </div>

                                {/* 2. 우측: 가격 상세 */}
                                <div className="shrink-0 flex flex-col xl:items-end w-full xl:w-auto">
                                    {game.isPlusExclusive && (
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="bg-yellow-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span>
                                            <span className="text-yellow-600 dark:text-yellow-500 text-xs font-bold">특별 할인가</span>
                                        </div>
                                    )}

                                    {/* 메인 가격 */}
                                    <div className="flex items-end xl:justify-end gap-3 mb-2 flex-wrap">
                                        <span className={`whitespace-nowrap text-5xl md:text-6xl font-black tracking-tighter drop-shadow-xl ${game.isPlusExclusive ? 'text-yellow-600 dark:text-yellow-500' : 'text-primary'}`}>
                                            {game.currentPrice.toLocaleString()}<span className="text-2xl font-medium text-secondary ml-1">원</span>
                                        </span>
                                        {game.discountRate > 0 && (
                                            <div className="flex flex-col mb-1.5 shrink-0">
                                                <span className="whitespace-nowrap text-secondary line-through text-lg font-medium">{game.originalPrice.toLocaleString()}원</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 태그 영역 (할인율, 최저가) */}
                                    <div className="flex flex-wrap items-center xl:justify-end gap-3 mt-1">
                                        {game.discountRate > 0 && (
                                            <span className={`px-3 py-1 rounded-lg font-black text-base text-center shadow-md ${game.isPlusExclusive ? 'bg-yellow-500 text-white' : 'bg-ps-blue text-white'}`}>
                                                -{game.discountRate}%
                                            </span>
                                        )}
                                        {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 text-xs bg-surface border border-divider px-3 py-1 rounded-lg shadow-sm font-bold text-primary">
                                                <TrendingUp className="w-3.5 h-3.5 text-green-500" /> 최저가: {game.lowestPrice.toLocaleString()}원
                                            </span>
                                        )}
                                    </div>

                                    {/* 3. 할인 종료일 */}
                                    {game.saleEndDate && game.discountRate > 0 && (
                                        <div className="mt-5 flex items-center xl:justify-end gap-2 text-xs w-fit xl:ml-auto">
                                            <CalendarDays className="w-4 h-4 text-secondary" />
                                            <span className="text-secondary font-bold">할인 종료: {game.saleEndDate.replace(/-/g, '.')}</span>
                                            {daysLeft !== null && daysLeft >= 0 ? (
                                                <span className={`px-2 py-0.5 rounded-md border shadow-sm font-black ${
                                                    daysLeft <= 3
                                                        ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse"
                                                        : "bg-surface border-divider text-primary"
                                                }`}>
                                                    {daysLeft}일 남음
                                                </span>
                                            ) : (
                                                <span className="bg-base border border-divider text-muted px-2 py-0.5 rounded-md font-bold">
                                                    종료됨
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 모바일용 CTA 렌더링 */}
                            <div className="lg:hidden flex flex-col gap-2 mt-6 pt-6 border-t border-divider/50">
                                <div className="flex gap-2">
                                    {/* 스토어 이동 버튼 */}
                                    <a href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`} target="_blank" rel="noopener noreferrer"
                                       className="flex-[2] flex items-center justify-center gap-2 bg-primary text-[color:var(--color-bg-base)] py-3.5 rounded-xl font-black text-sm">
                                        <Gamepad2 className="w-5 h-5"/> 스토어
                                    </a>

                                    {/* 찜하기/찜취소 토글 버튼 */}
                                    <button onClick={onWishlistClick}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl border font-bold text-sm ${game.liked ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500' : 'bg-surface border-divider text-primary'}`}>
                                        <Heart className={`w-4 h-4 ${game.liked ? 'fill-current' : ''}`} /> {game.liked ? '찜 취소' : '찜하기'}
                                    </button>
                                </div>

                                {/* 목표가 설정 버튼 (찜한 경우에만 2층으로 렌더링) */}
                                {game.liked && (
                                    <button onClick={() => setIsTargetModalOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[color:var(--bento-blue-border)] bg-[var(--bento-blue-from)] text-ps-blue font-black text-sm transition-all active:scale-95">
                                        <Crosshair className="w-4 h-4" />
                                        {/* 💡 목표가 설정 여부에 따른 텍스트 동적 변화 */}
                                        <span>{game.myTargetPrice ? `${game.myTargetPrice.toLocaleString()}원 목표` : '목표가 설정'}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {game.defenseTier && (
                            <div className={`lg:hidden mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                game.defenseTier.includes('S') || game.defenseTier.includes('A')
                                    ? 'border-red-500/30 bg-red-500/5'
                                    : 'border-green-500/30 bg-green-500/5'
                            }`}>
                                <ShieldAlert className={`w-5 h-5 shrink-0 ${game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'text-red-500' : 'text-green-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-widest text-secondary">할인 방어력</span>
                                        <span className={`text-base font-black ${game.defenseTier.includes('S') || game.defenseTier.includes('A') ? 'text-red-500' : 'text-green-500'}`}>{game.defenseTier}</span>
                                    </div>
                                    <p className="text-xs text-secondary font-bold truncate">{game.defenseMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* 역대 가격 추이 */}
                        <div className="bg-surface p-5 rounded-2xl border border-divider shadow-md mb-8">
                            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-ps-blue" /> 역대 가격 추이</h3>
                            <PriceChart historyData={game.priceHistory} lowestPrice={game.lowestPrice} />
                        </div>

                        {isDiscrepancyWarning && (
                            <div className="mb-4 flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-fadeIn">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
                                <div>
                                    <span className="block text-red-500 font-black text-sm leading-tight mb-0.5">
                                        요주의 게임! (평가 엇갈림)
                                    </span>
                                    <span className="block text-red-400 font-bold text-xs leading-tight">
                                        전문가(Critic)와 일반 유저(User)의 평가가 크게 엇갈리고 있습니다. 구매 전 리뷰를 꼭 확인하세요.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 3. 벤토 그리드 대시보드 (평가/플레이타임) */}
                        <div className="grid grid-cols-2 gap-4 mb-8">

                            <div className="bg-surface border border-divider p-4 md:p-5 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between">
                                <Triangle className="absolute -bottom-4 -right-4 w-24 h-24 text-divider opacity-20 group-hover:text-green-500/20 transition-colors" />

                                <div className="relative z-10 flex justify-between items-center mb-6">
                                    <span className="bg-black dark:bg-white text-white dark:text-black font-black text-xs px-2.5 py-0.5 rounded shadow-sm tracking-wide">M</span>
                                    <span className="text-xs font-bold text-secondary tracking-wide">Metacritic</span>
                                </div>

                                <div className="relative z-10 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-secondary tracking-widest mb-0.5">CRITIC</span>
                                            <span className="text-[11px] text-muted font-bold">{formatCount(game.mcMetaCount)} reviews</span>
                                        </div>
                                        <div className={`text-3xl md:text-4xl font-black tracking-tighter ${getScoreColor(game.mcMetaScore, 100)}`}>
                                            {game.mcMetaScore || '-'}
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-divider/50"></div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-secondary tracking-widest mb-0.5">USER</span>
                                            <span className="text-[11px] text-muted font-bold">{formatCount(game.mcUserCount)} ratings</span>
                                        </div>
                                        <div className={`text-2xl md:text-3xl font-black tracking-tighter ${getScoreColor(game.mcUserScore, 10)}`}>
                                            {game.mcUserScore > 0 ? game.mcUserScore.toFixed(1) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface border border-divider p-4 md:p-5 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between">
                                <Circle className="absolute -bottom-4 -right-4 w-24 h-24 text-divider opacity-20 group-hover:text-purple-500/20 transition-colors" />

                                <div className="relative z-10 flex justify-between items-center mb-6">
                                    <span className="bg-[var(--bento-purple-from)] text-purple-700 dark:text-purple-300 font-black text-xs px-2.5 py-0.5 rounded border border-[color:var(--bento-purple-border)] shadow-sm tracking-wide">IGDB</span>
                                    <span className="text-xs font-bold text-secondary tracking-wide">Community</span>
                                </div>

                                <div className="relative z-10 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-secondary tracking-widest mb-0.5">CRITIC</span>
                                            <span className="text-[11px] text-muted font-bold">{formatCount(game.igdbCriticCount)} reviews</span>
                                        </div>
                                        <div className={`text-3xl md:text-4xl font-black tracking-tighter ${getScoreColor(game.igdbCriticScore, 100)}`}>
                                            {game.igdbCriticScore || '-'}
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-divider/50"></div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-secondary tracking-widest mb-0.5">USER</span>
                                            <span className="text-[11px] text-muted font-bold">{formatCount(game.igdbUserCount)} ratings</span>
                                        </div>
                                        <div className={`text-2xl md:text-3xl font-black tracking-tighter ${getScoreColor(game.igdbUserScore, 100)}`}>
                                            {game.igdbUserScore > 0 ? Math.round(game.igdbUserScore) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 bg-surface border border-divider p-4 md:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-ps-blue/5 rounded-full blur-2xl group-hover:bg-ps-blue/10 transition-colors duration-700 pointer-events-none"></div>
                                <Square className="absolute -bottom-4 -right-4 w-24 h-24 text-divider opacity-20 group-hover:text-ps-blue/20 transition-colors pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 tracking-wider">
                                            <Clock className="w-4 h-4 text-ps-blue" /> Playtime Radar
                                        </h3>
                                        <span className="text-[9px] font-black text-white bg-secondary/80 dark:bg-white/20 px-2 py-0.5 rounded shadow-inner tracking-widest">HLTB Average</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        <div className="flex flex-col items-center justify-center bg-base/50 p-2.5 sm:p-4 rounded-xl border border-divider/50 shadow-inner hover:bg-ps-blue/5 hover:border-ps-blue/30 transition-colors">
                                            <span className="text-[9px] sm:text-[10px] font-black text-secondary tracking-widest mb-1">MAIN</span>
                                            <span className="text-lg sm:text-2xl font-black text-primary drop-shadow-sm">{formatPlayTime(game.hltbMainStory)}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center bg-base/50 p-2.5 sm:p-4 rounded-xl border border-divider/50 shadow-inner hover:bg-purple-500/5 hover:border-purple-500/30 transition-colors">
                                            <span className="text-[9px] sm:text-[10px] font-black text-secondary tracking-widest mb-1">+EXTRA</span>
                                            <span className="text-lg sm:text-2xl font-black text-primary drop-shadow-sm">{formatPlayTime(game.hltbMainExtra)}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center bg-base/50 p-2.5 sm:p-4 rounded-xl border border-divider/50 shadow-inner hover:bg-yellow-500/5 hover:border-yellow-500/30 transition-colors">
                                            <span className="text-[9px] sm:text-[10px] font-black text-secondary tracking-widest mb-1">100%</span>
                                            <span className="text-lg sm:text-2xl font-black text-primary drop-shadow-sm">{formatPlayTime(game.hltbCompletionist)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {game.inCatalog && (
                            <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 flex items-center gap-4 shadow-[0_0_15px_rgba(234,179,8,0.05)] animate-fadeIn">
                                <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30 shrink-0">
                                    <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-500 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-yellow-700 dark:text-yellow-400 font-black text-sm sm:text-base mb-0.5">PS Plus 스페셜 / 디럭스 카탈로그 포함</h4>
                                    <p className="text-secondary text-xs font-bold">구독 회원은 추가 비용 없이 즉시 플레이 가능합니다.</p>
                                </div>
                            </div>
                        )}

                        {/* 4. 에디션 비교 패널 */}
                        {game.familyGames && game.familyGames.length > 1 && (
                            <div className="mb-8 animate-fadeIn">
                                <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5"><Layers className="w-4 h-4 text-ps-blue" /> 에디션 비교 및 선택</h3>
                                <div className="bg-surface border border-divider rounded-2xl p-2 shadow-inner">
                                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-divider-strong hover:[&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full">
                                        {game.familyGames.map((edition) => {
                                            const isCurrent = edition.id === game.id;
                                            const priceGap = edition.currentPrice - game.currentPrice;
                                            const isHigherTier = edition.originalPrice > game.originalPrice;
                                            const isLowerTier = edition.originalPrice < game.originalPrice;

                                            return (
                                                <button
                                                    key={edition.id}
                                                    onClick={() => navigate(`/games/${edition.id}`, { replace: true, state: location.state })}
                                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all text-left group shrink-0 ${
                                                        isCurrent
                                                            ? 'bg-blue-50/90 dark:bg-blue-900/40 border-ps-blue ring-1 ring-ps-blue shadow-sm cursor-default'
                                                            : 'bg-base border-divider hover:border-divider-strong hover:shadow-sm cursor-pointer'
                                                    }`}
                                                    disabled={isCurrent}
                                                >
                                                    <div className="flex-1 pr-4 mb-3 sm:mb-0 min-w-0">
                                                        {isCurrent && (
                                                            <span className="inline-block text-[9px] font-black text-white bg-ps-blue px-2 py-0.5 rounded mb-1.5 shadow-sm">
                                                                CURRENT
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <div className="shrink-0">{renderMiniVerdictIcon(edition.priceVerdict)}</div>
                                                            <p className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}>
                                                                {edition.name}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap sm:flex-nowrap border-t sm:border-t-0 border-divider pt-2 sm:pt-0">

                                                        {!isCurrent && isHigherTier && priceGap < 0 && (
                                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(34,197,94,0.15)] whitespace-nowrap shrink-0">
                                                                <Sparkles className="w-3 h-3 text-green-500" /> 상위판이 더 저렴!
                                                            </span>
                                                        )}

                                                        {!isCurrent && isLowerTier && priceGap > 0 && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                                                <AlertTriangle className="w-3 h-3 text-red-500" /> 하위판인데 더 비쌈
                                                            </span>
                                                        )}

                                                        {!isCurrent && isHigherTier && priceGap >= 0 && (
                                                            (priceGap <= 15000 && edition.discountRate > 0) ? (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                                                    <ArrowUpRight className="w-3 h-3 text-yellow-600 dark:text-yellow-500" /> +{priceGap.toLocaleString()}원 업그레이드
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-secondary bg-surface border border-divider px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                                                    <Plus className="w-3 h-3 text-muted" /> {priceGap.toLocaleString()}원 추가
                                                                </span>
                                                            )
                                                        )}

                                                        {!isCurrent && isLowerTier && priceGap < 0 && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                                                <TrendingDown className="w-3 h-3 text-blue-500" /> {Math.abs(priceGap).toLocaleString()}원 절약
                                                            </span>
                                                        )}

                                                        {/* 할인율 표시 */}
                                                        {edition.discountRate > 0 && (
                                                            <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap shrink-0">
                                                                -{edition.discountRate}%
                                                            </span>
                                                        )}

                                                        {/* 최종 가격 정보 */}
                                                        <div className="flex flex-col text-right min-w-[50px] shrink-0">
                                                            {edition.discountRate > 0 && <span className="text-[9px] text-muted line-through leading-none">{edition.originalPrice.toLocaleString()}원</span>}
                                                            <span className={`text-sm font-black ${isCurrent ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}>
                                                                {edition.currentPrice.toLocaleString()}원
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. 심층 정보 영역 (커뮤니티, 상세설명) */}
                        <div className="space-y-6">
                            {game.scouterTotalWatchers > 0 && <StealthPanel watchersCount={game.scouterTotalWatchers} averagePrice={game.scouterAverageTargetPrice} isLiked={isLiked} />}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-surface p-5 rounded-2xl border border-divider shadow-md flex flex-col">
                                    <h4 className="text-xs font-bold text-secondary mb-4 flex items-center justify-between uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> 유저 평가</span>
                                        <span className="bg-base px-2 py-0.5 rounded shadow-inner border border-divider">{voteCounts.likes + voteCounts.dislikes} Votes</span>
                                    </h4>
                                    <div className="flex gap-3 mb-4">
                                        <button onClick={() => handleVote('LIKE')} className={`flex-1 p-3 rounded-xl border flex flex-col items-center ${userVote === 'LIKE' ? 'bg-green-500/10 border-green-500/50' : 'bg-base border-divider'}`}><Circle className={`w-6 h-6 mb-1 ${userVote === 'LIKE' ? 'text-green-500' : 'text-secondary'}`} /><span className="font-black text-lg">{voteCounts.likes}</span></button>
                                        <button onClick={() => handleVote('DISLIKE')} className={`flex-1 p-3 rounded-xl border flex flex-col items-center ${userVote === 'DISLIKE' ? 'bg-red-500/10 border-red-500/50' : 'bg-base border-divider'}`}><X className={`w-6 h-6 mb-1 ${userVote === 'DISLIKE' ? 'text-red-500' : 'text-secondary'}`} /><span className="font-black text-lg">{voteCounts.dislikes}</span></button>
                                    </div>
                                </div>
                                <div className="bg-surface p-5 rounded-2xl border border-divider text-center shadow-md flex flex-col items-center justify-center relative overflow-hidden group">
                                    <Server className="w-8 h-8 text-yellow-600 dark:text-yellow-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <h4 className="font-bold text-primary mb-1">감자 서버 밥 주기</h4>
                                    <p className="text-[10px] text-secondary mb-3">할인을 놓치지 않고 잡아낸<br/>서버 유지에 힘을 보태주세요!</p>
                                    <button onClick={() => setIsDonationOpen(true)} className="w-full bg-yellow-500 text-black font-black py-2 rounded-lg text-xs shadow-md">후원하기 <ExternalLink className="w-3 h-3 inline"/></button>
                                </div>
                            </div>

                            <div className="bg-surface p-5 rounded-2xl border border-divider shadow-md">
                                <h3 className="text-lg font-bold text-primary mb-4">게임 설명</h3>

                                {hasDescription ? (
                                    <p className="text-sm text-secondary leading-relaxed whitespace-pre-line mb-6">
                                        {game.description}
                                    </p>
                                ) : (
                                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                                        <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-yellow-600 dark:text-yellow-500 text-sm font-bold mb-1">상세 설명이 제공되지 않는 게임입니다.</p>
                                            <p className="text-secondary text-xs font-bold">대신 아래 버튼을 통해 게임플레이 영상이나 리뷰를 바로 찾아보세요!</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 border-t border-divider pt-6">
                                    <a
                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-500 text-sm font-bold py-3.5 rounded-xl text-center transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                    >
                                        <Youtube className="w-4 h-4" /> 유튜브에서 게임플레이 보기
                                    </a>
                                    <a
                                        href={`https://www.google.com/search?q=${encodeURIComponent(game.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-500 text-sm font-bold py-3.5 rounded-xl text-center transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                    >
                                        <Search className="w-4 h-4" /> 구글에서 리뷰 검색하기
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 관련 게임 추천 */}
                {game.relatedGames && game.relatedGames.length > 0 && (
                    <div className="mt-16 pt-10 border-t border-divider">
                        <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500" />이 게임을 좋아한다면</h3>
                        <div className="hidden lg:grid grid-cols-5 gap-4">
                            {game.relatedGames.map(related => <RelatedGameCard key={related.id} game={related} />)}
                        </div>
                        <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {game.relatedGames.map(related => (
                                <div key={related.id} className="shrink-0 snap-center w-[42vw] sm:w-[32vw]">
                                    <RelatedGameCard game={related} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:hidden fixed bottom-0 left-0 w-full p-3 sm:p-4 bg-base/90 backdrop-blur-xl border-t border-divider z-[60] animate-slideUp">
                <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
                    {/* 가격 정보 요약 */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs text-secondary font-bold truncate">{game.title}</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <p className={`text-base sm:text-lg font-black leading-none ${game.isPlusExclusive ? 'text-yellow-600 dark:text-yellow-500' : 'text-primary'}`}>
                                {game.currentPrice.toLocaleString()}원
                            </p>
                            {game.discountRate > 0 && (
                                <span className="text-[10px] sm:text-[11px] font-black text-white bg-ps-blue px-1.5 py-0.5 rounded shadow-sm">
                                    -{game.discountRate}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 핵심 액션 버튼들 (찜하기, 찜취소, 목표가, 스토어) */}
                    <div className="flex gap-2 shrink-0">
                        {game.liked && (
                            <button
                                onClick={() => setIsTargetModalOpen(true)}
                                className="p-2.5 sm:p-3 rounded-xl border border-[color:var(--bento-blue-border)] bg-[var(--bento-blue-from)] text-ps-blue shadow-md active:scale-95 transition-transform"
                                aria-label="목표가 설정"
                            >
                                <Crosshair className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={onWishlistClick}
                            className={`p-2.5 sm:p-3 rounded-xl border font-bold shadow-md active:scale-95 transition-all ${
                                game.liked
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                    : 'bg-surface border-divider text-primary'
                            }`}
                            aria-label={game.liked ? '찜 취소' : '찜하기'}
                        >
                            <Heart className={`w-5 h-5 ${game.liked ? 'fill-current scale-110 transition-transform' : ''}`} />
                        </button>

                        <a
                            href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-primary text-[color:var(--color-bg-base)] font-black text-sm shadow-lg active:scale-95 transition-transform"
                        >
                            <Gamepad2 className="w-4 h-4" />
                            <span className="whitespace-nowrap hidden sm:inline">스토어</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Modal Components */}
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
            <TargetPriceModal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} game={game} defenseTier={game.defenseTier} onSubmit={(price) => handleTargetSubmit(price)} />
            <HelpModal isOpen={helpInfo.isOpen} type={helpInfo.type} onClose={() => setHelpInfo({ isOpen: false, type: null })} />
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-backdrop backdrop-blur-sm animate-fadeIn p-0 md:p-8" onClick={handleClose}>
                <div
                    className="w-full h-full md:h-auto md:max-h-full max-w-6xl overflow-y-auto bg-base md:rounded-2xl shadow-2xl relative border border-divider [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-divider-strong hover:[&::-webkit-scrollbar-thumb]:bg-muted animate-in fade-in zoom-in-[97%] slide-in-from-bottom-4 duration-300 ease-out"
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