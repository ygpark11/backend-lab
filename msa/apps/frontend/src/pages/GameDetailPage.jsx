import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import RelatedGameCard from '../components/RelatedGameCard';
import { getGenreBadgeStyle } from '../utils/uiUtils';
import { getTrafficLight } from '../utils/priceUtils';
import TargetPriceModal from '../components/TargetPriceModal';
import DefenseTrophyCard from '../components/DefenseTrophyCard';
import StealthPanel from '../components/StealthPanel';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import HelpModal from '../components/common/HelpModal';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Building2,
    Calendar,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronUp,
    Circle,
    Clock,
    Crosshair,
    ExternalLink,
    Flame,
    Gamepad2,
    Gauge,
    Gem,
    Heart,
    HelpCircle,
    Languages,
    Layers,
    Pickaxe,
    Plus,
    RefreshCw,
    Search,
    Server,
    Share2,
    Sparkles,
    Square,
    Star,
    Timer,
    Trash2,
    TrendingDown,
    TrendingUp,
    Triangle,
    Tv,
    Users,
    X,
    Youtube
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';

import { adminApi } from '../api/adminApi';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DonationModal from '../components/DonationModal';
import { useAuth } from '../contexts/AuthContext';
import { pushRecentGame } from '../utils/recentGames';
import GameShortsCard from '../components/GameShortsCard';
import GameLongformCard from '../components/GameLongformCard';

// ── Shorts 유튜브 설명 자동생성 ──────────────────────────────────────────
function cleanTitleForDesc(title) {
    if (!title) return '';
    const langKeywords = ['한국어', '영어', '일본어', '중국어', '태국어', '독일어', '프랑스어', '스페인어'];
    const indices = langKeywords.map(k => title.indexOf(k)).filter(i => i !== -1);
    if (indices.length > 0) {
        const firstLangIdx = Math.min(...indices);
        const parenIdx = title.lastIndexOf('(', firstLangIdx);
        if (parenIdx > 0) title = title.slice(0, parenIdx).trim();
    }
    return title.replace(/\s+PS[45][™]?\s*(?:[&]\s*PS[45][™]?)?$/, '').trim();
}

function generateShortsDesc(game) {
    const verdictMap = {
        BUY_NOW:    '지금 사세요 ○',
        GOOD_OFFER: '괜찮은 가격 △',
        WAIT:       '기다리세요 ×',
        TRACKING:   '추적 중 □',
    };
    const verdict      = verdictMap[game.priceVerdict] ?? '추적 중 □';
    const isBuy        = game.priceVerdict === 'BUY_NOW' || game.priceVerdict === 'GOOD_OFFER';
    const cleanedTitle = cleanTitleForDesc(game.title);
    const lines        = [];

    lines.push(`${cleanedTitle} 지금 살까요? 🎮`);
    lines.push('');

    if (isBuy) {
        let main = verdict;
        if (game.currentPrice > 0) main += ` | ${game.currentPrice.toLocaleString()}원`;
        if (game.discountRate > 0) main += ` | -${game.discountRate}% 할인`;
        if (game.priceVerdict === 'BUY_NOW')    main += game.isAllTimeLowNew ? ' | 역대최저가 갱신!' : ' | 역대최저가 동률';
        if (game.priceVerdict === 'GOOD_OFFER' && game.lowestPrice > 0) main += ' | 역대최저 근접';
        lines.push(main);
        if (game.saleEndDate && game.discountRate > 0)
            lines.push(`할인 종료: ${game.saleEndDate.replace(/-/g, '.')}`);
    } else {
        let main = verdict;
        if (game.discountRate > 0) main += ` | -${game.discountRate}% 할인 중이나 역대최저 아님`;
        lines.push(main);
        if (game.currentPrice > 0)
            lines.push(`현재가: ${game.currentPrice.toLocaleString()}원`);
        if (game.lowestPrice > 0)
            lines.push(`역대최저가: ${game.lowestPrice.toLocaleString()}원 (더 기다리세요)`);
    }

    const meta = [];
    const score = game.mcMetaScore || game.igdbCriticScore;
    if (score) meta.push(`메타크리틱: ${score}점`);
    const hours = game.hltbMainStory > 0 ? Math.round(game.hltbMainStory) : null;
    if (hours)  meta.push(`플레이타임: ${hours}시간`);
    if (meta.length > 0) lines.push(meta.join(' | '));

    lines.push('');
    lines.push('PS 가격 추적 → ps-signal.com');

    const gameTag      = '#' + cleanedTitle.replace(/[^가-힣a-zA-Z0-9]/g, '').slice(0, 25);
    const platformTags = (game.platforms || []).map(p => '#' + p.replace(/\s/g, '')).join(' ');
    lines.push(`#플스세일 #게임할인 ${platformTags} ${gameTag}`.trim());

    return lines.join('\n');
}

function ShortsToolbar({ game }) {
    const [copied, setCopied] = React.useState(false);
    const desc = generateShortsDesc(game);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(desc);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('클립보드 복사 실패');
        }
    };

    return (
        <div className="bg-[#080810] px-5 py-8 flex flex-col gap-4 min-h-[40vh]">
            <p className="text-white/20 text-[11px] font-black tracking-widest uppercase text-center">
                카드 녹화 후 스크롤 — 유튜브 설명 복사
            </p>
            <pre className="text-white/55 text-[13px] font-bold leading-relaxed bg-white/[0.04] border border-white/10 rounded-xl p-4 whitespace-pre-wrap break-keep">
                {desc}
            </pre>
            <button
                onClick={handleCopy}
                className={`w-full py-4 rounded-2xl font-black text-[17px] tracking-wide transition-all active:scale-95 ${
                    copied
                        ? 'bg-green-500/20 border border-green-400/60 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                        : 'bg-white/[0.08] border border-white/20 text-white hover:bg-white/[0.12]'
                }`}
            >
                {copied ? '✓ 클립보드에 복사됨' : '유튜브 설명 복사'}
            </button>
        </div>
    );
}

const renderVerdictIcon = (verdict) => {
    const buttonBase = "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg backdrop-blur-xl transition-all border-divider bg-surface";
    switch (verdict) {
        case 'BUY_NOW': return <div className={`${buttonBase} border-green-500/40 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.25)]`}><Circle className="w-6 h-6 text-green-400 fill-green-400/20 stroke-[3px]" /></div>;
        case 'GOOD_OFFER': return <div className={`${buttonBase} border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.25)]`}><Triangle className="w-6 h-6 text-yellow-400 fill-yellow-400/20 stroke-[3px]" /></div>;
        case 'WAIT': return <div className={`${buttonBase} border-red-500/40 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.25)]`}><X className="w-6 h-6 text-red-400 stroke-[4px]" /></div>;
        case 'TRACKING': return <div className={`${buttonBase} border-blue-500/40 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.25)]`}><Square className="w-6 h-6 text-ps-blue fill-blue-500/20 stroke-[3px]" /></div>;
        default: return <div className={buttonBase}><HelpCircle className="w-6 h-6 text-muted" /></div>;
    }
};

const renderMiniVerdictIcon = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW': return <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 fill-green-400/20 stroke-[3px] drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]" />;
        case 'GOOD_OFFER': return <Triangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400/20 stroke-[3px] drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />;
        case 'WAIT': return <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 stroke-[4px] drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]" />;
        case 'TRACKING': return <Square className="w-4 h-4 sm:w-5 sm:h-5 text-ps-blue fill-blue-500/20 stroke-[3px] drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />;
        default: return null;
    }
};

// 은은하면서도 게임 고유 아트워크 비주얼을 살리는 앰비언트 Hero 배경
const BackgroundHero = ({ imageUrl }) => (
    <div className="absolute top-0 left-0 w-full h-[650px] z-0 pointer-events-none select-none overflow-hidden">
        <PSGameImage
            src={imageUrl}
            priority
            width={640}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 opacity-20 dark:opacity-30 blur-[12px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-base/90 via-base/60 to-transparent" />
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
    const [isDescExpanded, setIsDescExpanded] = useState(false);

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
                pushRecentGame({
                    id: res.data.id,
                    title: res.data.title,
                    thumbnail: res.data.imageUrl,
                    currentPrice: res.data.currentPrice,
                    priceVerdict: res.data.priceVerdict,
                    viewedAt: Date.now(),
                });

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
                        } catch {
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
                        <span className="font-bold text-sm text-primary">로그인이 필요한 기능입니다</span>
                        <span className="text-xs text-secondary mb-1">로그인하고 찜한 게임의 할인 알림을 받아보세요!</span>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => { toast.dismiss(t.id); openLoginModal(); }} className="bg-ps-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-md flex-1">로그인 하러 가기</button>
                            <button onClick={() => toast.dismiss(t.id)} className="bg-surface text-secondary border border-divider px-4 py-2 rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors flex-1">닫기</button>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-center', style: { background: 'var(--color-bg-base)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-border-default)' } });
            } else {
                const errorMessage = error.response?.data?.message || "요청 처리에 실패했습니다.";
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
            const errorMessage = error.response?.data?.message || "투표에 실패했습니다.";
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
            }
        }

        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('링크가 복사되었습니다!', {
                style: { borderRadius: '12px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' },
                icon: <Check className="w-5 h-5 text-green-400" />
            });
        } catch {
            toast.error('링크 복사에 실패했습니다.');
        }
    };

    const handleRefresh = async () => {
        const loadId = toast.loading("최신 정보를 수집 요청 중...");
        try {
            await adminApi.refreshGame(id);
            toast.success("수집 요청 완료! 잠시 후 새로고침 됩니다.", { id: loadId });
            setTimeout(() => window.location.reload(), 4000);
        } catch {
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

    // 🎬 Shorts 촬영용 전체화면 카드 — /games/:id?view=shorts
    if (new URLSearchParams(location.search).get('view') === 'shorts') {
        return (
            <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#080810]">
                <GameShortsCard game={game} />
                <ShortsToolbar game={game} />
            </div>
        );
    }

    // 🎬 롱폼 촬영용 16:9 카드 — /games/:id?view=longform
    if (new URLSearchParams(location.search).get('view') === 'longform') {
        const showOutro = new URLSearchParams(location.search).get('final') === 'true';
        return (
            <div className="fixed inset-0 z-[200] bg-[#080810]">
                <GameLongformCard game={game} showOutro={showOutro} />
            </div>
        );
    }

    const traffic = getTrafficLight(game.priceVerdict, game);
    const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
    const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : null;
    const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
    const hasDescription = game.description && game.description !== "Full Data Crawler";

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

    const myEditionContents = game.familyGames?.find(e => e.id === game.id)?.editionContents ?? [];
    const maxPlayTime = Math.max(game.hltbCompletionist || 0, game.hltbMainExtra || 0, game.hltbMainStory || 0, 1);
    const hasPlayTime = [game.hltbMainStory, game.hltbMainExtra, game.hltbCompletionist].some(v => v > 0);
    const voteTotal = voteCounts.likes + voteCounts.dislikes;
    const likePercent = voteTotal > 0 ? Math.round((voteCounts.likes / voteTotal) * 100) : 0;

    // 가치 트래커 (Value Tracker) 게이지 퍼센트 계산
    const pricePosition = (game.lowestPrice > 0 && game.originalPrice > game.lowestPrice)
        ? Math.min(100, Math.max(0, Math.round((game.originalPrice - game.currentPrice) / (game.originalPrice - game.lowestPrice) * 100)))
        : null;

    // 가격 신호등 테마별 글로우 & 보더 스타일
    const verdictThemeMap = {
        'BUY_NOW': {
            badge: 'BUY NOW',
            badgeBg: 'bg-green-500/15 border-green-500/40 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
            dot: 'bg-green-400 shadow-[0_0_10px_rgba(34,197,94,1)]',
            glowBg: 'bg-green-500',
            border: 'border-green-500/40 shadow-[0_0_25px_rgba(34,197,94,0.12)]',
            buttonBg: 'bg-green-500 hover:bg-green-600 text-black font-black shadow-[0_0_25px_rgba(34,197,94,0.3)]',
            accentText: 'text-green-400',
        },
        'GOOD_OFFER': {
            badge: 'GOOD OFFER',
            badgeBg: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
            dot: 'bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,1)]',
            glowBg: 'bg-yellow-500',
            border: 'border-yellow-500/40 shadow-[0_0_25px_rgba(234,179,8,0.12)]',
            buttonBg: 'bg-yellow-500 hover:bg-yellow-600 text-black font-black shadow-[0_0_25px_rgba(234,179,8,0.3)]',
            accentText: 'text-yellow-400',
        },
        'WAIT': {
            badge: 'WAIT',
            badgeBg: 'bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
            dot: 'bg-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]',
            glowBg: 'bg-red-500',
            border: 'border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.12)]',
            buttonBg: 'bg-ps-blue hover:bg-blue-600 text-white font-bold',
            accentText: 'text-red-400',
        },
        'TRACKING': {
            badge: 'TRACKING',
            badgeBg: 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
            dot: 'bg-ps-blue shadow-[0_0_10px_rgba(59,130,246,1)]',
            glowBg: 'bg-ps-blue',
            border: 'border-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.12)]',
            buttonBg: 'bg-ps-blue hover:bg-blue-600 text-white font-bold',
            accentText: 'text-blue-400',
        }
    };

    const currentTheme = verdictThemeMap[game.priceVerdict] || verdictThemeMap['TRACKING'];

    // 평점 우선순위 로직: 메타크리틱 우선 -> 없으면 IGDB 대체 -> 둘 다 없으면 null
    const hasMetacritic = Boolean(game.mcMetaScore || game.mcUserScore);
    const hasIgdb = Boolean(game.igdbCriticScore || game.igdbUserScore);
    const hasAnyReview = hasMetacritic || hasIgdb;

    const reviewSource = hasMetacritic ? 'METACRITIC' : (hasIgdb ? 'IGDB' : null);
    const mainScore = hasMetacritic ? game.mcMetaScore : (hasIgdb ? game.igdbCriticScore : null);
    const userScore = hasMetacritic ? game.mcUserScore : (hasIgdb ? (game.igdbUserScore ? game.igdbUserScore / 10 : null) : null);
    const isKorean = Boolean(game.title && game.title.includes('한국어'));


    const getMetacriticBadgeColor = (score, scale = 100) => {
        if (score === null || score === undefined) return 'bg-base border border-divider text-muted';
        const normalized = scale === 10 ? score * 10 : score;
        if (normalized >= 75) return 'bg-green-600 text-white font-black shadow-[0_2px_10px_rgba(22,163,74,0.3)]';
        if (normalized >= 50) return 'bg-yellow-500 text-black font-black shadow-[0_2px_10px_rgba(234,179,8,0.3)]';
        return 'bg-red-600 text-white font-black shadow-[0_2px_10px_rgba(220,38,38,0.3)]';
    };

    const getMetacriticVerdict = (score, scale = 100) => {
        if (score === null || score === undefined) return { label: '집계 중', icon: null, color: 'text-muted' };
        const normalized = scale === 10 ? score * 10 : score;
        if (normalized >= 90) return { label: '명작 인증', icon: 'flame', color: 'text-green-500 dark:text-green-400 font-black' };
        if (normalized >= 75) return { label: '호평', icon: 'check', color: 'text-green-600 dark:text-green-400 font-bold' };
        if (normalized >= 50) return { label: '보통', icon: null, color: 'text-secondary dark:text-zinc-400 font-bold' };
        return { label: '혹평', icon: 'alert', color: 'text-red-500 dark:text-red-400 font-bold' };
    };

    const getScoreColor = (score, scale = 100) => {
        if (!score) return 'text-secondary';
        const percentage = scale === 10 ? score * 10 : score;
        if (percentage >= 75) return 'text-green-400';
        if (percentage >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBarBg = (score, scale = 100) => {
        if (!score) return 'bg-divider';
        const pct = scale === 10 ? score * 10 : score;
        if (pct >= 75) return 'bg-green-400';
        if (pct >= 50) return 'bg-yellow-400';
        return 'bg-red-400';
    };

    const pageContent = (
        <div className="relative z-10">
            <div className="p-4 sm:p-6 md:p-8 pb-28 md:pb-20 max-w-[1400px] mx-auto">

                {/* 상단 네비게이션 */}
                <button
                    onClick={handleClose}
                    className="mb-5 flex items-center text-secondary hover:text-primary transition-colors text-sm font-bold gap-2 w-fit px-3.5 py-1.5 rounded-xl bg-surface/95 border border-divider shadow-sm backdrop-blur-md active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
                </button>

                {/* 12-컬럼 몰입형 커맨드 센터 그리드 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">

                    {/* ========================================================================= */}
                    {/* 📱 좌측 컬럼: 콤팩트 포스터 + 액션 버튼 + 할인 방어력 (First Fold 100% 최적화) */}
                    {/* ========================================================================= */}
                    <aside className="lg:col-span-4 xl:col-span-3.5 lg:sticky lg:top-20 flex flex-col gap-3.5 z-20">

                        {/* 1. 반응형 포스터 (모바일: 시원한 와이드 배너 / PC: 콤팩트 세로형으로 First Fold 최적화) */}
                        <div className={`w-full rounded-2xl overflow-hidden shadow-xl border relative group bg-surface ${
                            isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-divider-strong'
                        }`}>
                            <div className="w-full relative h-[50vw] max-h-[260px] sm:max-h-[300px] lg:h-[260px] xl:h-[280px] overflow-hidden bg-base">
                                <PSGameImage
                                    src={game.imageUrl}
                                    alt={game.title}
                                    priority
                                    width={640}
                                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            {isPlatinum && <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-2xl pointer-events-none animate-pulse" />}
                            {isNew && <span className="absolute top-2.5 left-2.5 bg-green-500 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-md z-10">NEW</span>}
                            {isClosingSoon && (
                                <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md animate-pulse z-10 flex items-center gap-1">
                                    <Timer className="w-3 h-3" /> 막차!
                                </span>
                            )}
                        </div>

                        {/* 2. PC 메인 액션 버튼 그룹 */}
                        <div className="hidden lg:flex flex-col gap-2">
                            <a
                                href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full py-3 rounded-xl text-center flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 shadow-md text-sm ${currentTheme.buttonBg}`}
                            >
                                <Gamepad2 className="w-4 h-4" />
                                <span>PS Store로 이동</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                            </a>

                            <div className="flex gap-2">
                                <button
                                    onClick={onWishlistClick}
                                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                        game.liked
                                            ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                                            : 'bg-surface border-divider text-primary hover:bg-surface-hover hover:border-divider-strong'
                                    }`}
                                >
                                    <Heart className={`w-3.5 h-3.5 ${game.liked ? 'fill-current text-red-500' : ''}`} />
                                    <span>{game.liked ? '찜 취소' : '위시리스트 추가'}</span>
                                </button>

                                {game.liked && (
                                    <button
                                        onClick={() => setIsTargetModalOpen(true)}
                                        className="px-3 py-2.5 rounded-xl border border-ps-blue/40 bg-ps-blue/15 text-ps-blue hover:bg-ps-blue/25 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
                                        title="목표가 설정"
                                    >
                                        <Crosshair className="w-3.5 h-3.5" />
                                        <span>
                                            {game.myTargetPrice ? `${game.myTargetPrice.toLocaleString()}원` : '목표가'}
                                        </span>
                                    </button>
                                )}

                                <button
                                    onClick={handleShare}
                                    className="p-2.5 rounded-xl border border-divider bg-surface text-secondary hover:text-primary hover:bg-surface-hover transition-all active:scale-95"
                                    title="공유하기"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* 3. 할인 방어력 & 플래티넘 트로피 정보 (위치 상향 조정 완료) */}
                        <div className="hidden lg:block">
                            <DefenseTrophyCard defenseInfo={game.defenseInfo} />
                        </div>
                    </aside>

                    {/* ========================================================================= */}
                    {/* 💻 우측 메인 영역: 타이틀 + 대형 가격 신호등 + 3-벤토 그리드 + 차트 */}
                    {/* ========================================================================= */}
                    <div className="lg:col-span-8 xl:col-span-8.5 flex flex-col gap-5 min-w-0">

                        {/* 1. 타이틀 & 장르 헤더 (장르와 타이틀에 집중) */}
                        <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-3xl p-6 md:p-7 backdrop-blur-xl relative overflow-hidden shadow-sm">
                            {/* 상단 장르 태그 */}
                            <div className="flex flex-wrap gap-2 mb-3.5 items-center">
                                {game.genres && game.genres.length > 0 ? (
                                    game.genres.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => handleGenreClick(g)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm transition-all hover:opacity-80 ${getGenreBadgeStyle(g)}`}
                                        >
                                            {g}
                                        </button>
                                    ))
                                ) : (
                                    <span className="px-3 py-1 rounded-lg text-xs font-bold border border-divider bg-surface text-secondary">
                                        미분류
                                    </span>
                                )}
                            </div>

                            {/* 게임 제목 & 관리자 도구 */}
                            <div className="flex justify-between items-start gap-4 mb-3">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-primary break-keep drop-shadow-sm">
                                    {cleanTitleForDesc(game.title)}
                                </h1>
                                {isAdmin && (
                                    <div className="flex gap-2 shrink-0 pt-1">
                                        <button
                                            onClick={handleRefresh}
                                            className="p-2.5 rounded-xl bg-surface border border-divider hover:bg-ps-blue/20 text-secondary hover:text-ps-blue transition-all"
                                            title="정보 수집 요청 (관리자)"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleDeleteGame}
                                            className="p-2.5 rounded-xl bg-surface border border-divider hover:bg-red-500/20 text-secondary hover:text-red-400 transition-all"
                                            title="게임 삭제 (관리자)"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 메타 정보 */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-secondary dark:text-zinc-300">
                                {game.publisher && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-muted" /> {game.publisher}
                                    </span>
                                )}
                                {game.releaseDate && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-muted" /> 출시 {game.releaseDate.replace(/-/g, '. ')}
                                    </span>
                                )}
                                {game.pioneerName && (
                                    <span className="flex items-center gap-1.5 text-ps-blue bg-ps-blue/10 border border-ps-blue/20 px-2 py-0.5 rounded-md">
                                        <Pickaxe className="w-3.5 h-3.5" /> {game.pioneerName} 발굴
                                    </span>
                                )}
                            </div>

                            {/* Vibe Tags */}
                            {game.vibeTags && game.vibeTags.filter(tag => tag && tag.name && tag.color).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-divider/60">
                                    {game.vibeTags.filter(tag => tag && tag.name && tag.color).slice(0, 6).map((tag, idx) => (
                                        <span
                                            key={idx}
                                            style={{ '--tag-color': tag.color }}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-base/80 border border-divider shadow-sm transition-all hover:border-[color:var(--tag-color)] cursor-default group"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-[color:var(--tag-color)] shadow-[0_0_6px_var(--tag-color)]" />
                                            <span className="text-secondary dark:text-zinc-300 group-hover:text-primary transition-colors">
                                                {tag.name}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. 대형 가격 신호등 판정 히어로 패널 (Price Hero & Value Tracker) */}
                        <div className={`p-6 md:p-8 rounded-3xl border-2 backdrop-blur-xl relative overflow-hidden transition-all duration-300 bg-surface/95 dark:bg-surface/90 shadow-md transform-gpu ${currentTheme.border}`}>
                            <div className={`absolute -top-20 -right-20 w-48 h-48 ${currentTheme.glowBg} blur-[90px] opacity-15 rounded-full pointer-events-none`} />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                {/* 좌측: 신호등 판정 & 가이드 */}
                                <div className="flex items-center gap-4 bg-base/80 p-4 rounded-2xl border border-divider flex-1 min-w-0">
                                    <div className="shrink-0">{renderVerdictIcon(game.priceVerdict)}</div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg md:text-xl font-black text-primary truncate">{traffic.text}</h3>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${currentTheme.badgeBg}`}>
                                                {currentTheme.badge}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-secondary dark:text-zinc-300 font-medium leading-snug break-keep">{traffic.desc}</p>
                                    </div>
                                </div>

                                {/* 우측: 가격 정보 */}
                                <div className="shrink-0 flex flex-col md:items-end">
                                    {game.isPlusExclusive && (
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span>
                                            <span className="text-yellow-400 text-xs font-bold">특별 할인</span>
                                        </div>
                                    )}

                                    <div className="flex items-baseline gap-2.5 flex-wrap md:justify-end">
                                        <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                                            game.isPlusExclusive ? 'text-yellow-400' : 'text-primary'
                                        }`}>
                                            ₩{game.currentPrice.toLocaleString()}
                                        </span>
                                        {game.discountRate > 0 && (
                                            <span className={`text-sm font-black px-2.5 py-1 rounded-lg shadow-sm ${
                                                game.isPlusExclusive ? 'bg-yellow-500 text-black' : 'bg-green-500/20 border border-green-500/40 text-green-400'
                                            }`}>
                                                -{game.discountRate}%
                                            </span>
                                        )}
                                    </div>

                                    {game.discountRate > 0 && (
                                        <div className="flex items-center gap-2 mt-1.5 md:justify-end">
                                            <span className="text-xs text-muted line-through font-medium">
                                                정가 ₩{game.originalPrice.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 가치 트래커 게이지 바 */}
                            {pricePosition !== null && (
                                <div className="mt-6 pt-5 border-t border-divider/60">
                                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                                        <span className={`flex items-center gap-1.5 ${currentTheme.accentText}`}>
                                            {pricePosition >= 100 ? (
                                                <>
                                                    <Flame className="w-4 h-4" />
                                                    <span>{game.isAllTimeLowNew ? '역대 최저가 갱신!' : '역대 최저가 달성!'}</span>
                                                </>
                                            ) : pricePosition >= 90 ? (
                                                <>
                                                    <TrendingDown className="w-4 h-4" />
                                                    <span>역대 최저 근접!</span>
                                                </>
                                            ) : (
                                                <span>{pricePosition}% 할인 포지션</span>
                                            )}
                                        </span>

                                        {game.saleEndDate && game.discountRate > 0 && (
                                            <div className="flex items-center gap-1.5 text-secondary dark:text-zinc-300 text-xs font-bold">
                                                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                                                <span>할인 종료 {game.saleEndDate.replace(/-/g, '.')}</span>
                                                {daysLeft !== null && daysLeft >= 0 && (
                                                    <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                                                        daysLeft <= 3 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-base text-secondary'
                                                    }`}>
                                                        {daysLeft}일 남음
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative w-full h-2.5 bg-base rounded-full overflow-hidden border border-divider">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                                width: `${Math.max(pricePosition, 4)}%`,
                                                background: pricePosition >= 90
                                                    ? 'linear-gradient(to right, #3b82f6, #22c55e)'
                                                    : 'linear-gradient(to right, #3b82f6, #eab308)'
                                            }}
                                        />
                                    </div>

                                    <div className="flex justify-between mt-2 text-[11px] font-bold text-secondary dark:text-zinc-400">
                                        <span>정가: ₩{game.originalPrice.toLocaleString()}</span>
                                        <span className="text-green-400 font-extrabold">역대최저: ₩{game.lowestPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 모바일 전용 트로피 방어 난이도 카드 */}
                        <div className="lg:hidden">
                            <DefenseTrophyCard defenseInfo={game.defenseInfo} compact />
                        </div>

                        {/* 3. 3-구역 Bento Grid (모바일: 평점+플레이타임 2열 나란히 + 하단 스펙 / PC: 3열 나란히) */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

                            {/* Bento 1: 평점 카드 (메타크리틱 시그니처 듀얼 뱃지 스타일) */}
                            <div className="col-span-1 bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-md relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                                    <span className="text-[10px] sm:text-[11px] font-black text-secondary dark:text-zinc-300 tracking-wider uppercase flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                        <span>{reviewSource ? (reviewSource === 'METACRITIC' ? '메타크리틱 평점' : 'IGDB 평점') : '평가 지표'}</span>
                                    </span>
                                    {reviewSource && (
                                        <span className="bg-black text-white font-black text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded border border-white/20">
                                            {reviewSource}
                                        </span>
                                    )}
                                </div>

                                {hasAnyReview ? (
                                    <div className="flex flex-col gap-2 sm:gap-2.5 my-auto">
                                        {/* 1. 메타스코어 (전문가 - 사각 뱃지) */}
                                        <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-base/80 border border-divider hover:border-divider-strong transition-colors">
                                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-sm sm:text-lg font-black shrink-0 ${getMetacriticBadgeColor(mainScore, 100)}`}>
                                                {mainScore ?? '-'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="block text-[11px] font-extrabold text-secondary dark:text-zinc-400">
                                                    {reviewSource === 'METACRITIC' ? '메타스코어' : '전문가 평점'}
                                                </span>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {(() => {
                                                        const verdict = getMetacriticVerdict(mainScore, 100);
                                                        return (
                                                            <>
                                                                {verdict.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />}
                                                                {verdict.icon === 'check' && <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                                                                {verdict.icon === 'alert' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                                                                <span className={`text-xs font-bold whitespace-nowrap ${verdict.color}`}>
                                                                    {verdict.label}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. 유저 스코어 (원형 뱃지) */}
                                        <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-base/80 border border-divider hover:border-divider-strong transition-colors">
                                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-lg font-black shrink-0 ${getMetacriticBadgeColor(userScore, 10)}`}>
                                                {userScore !== null ? Number(userScore).toFixed(1) : '-'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="block text-[11px] font-extrabold text-secondary dark:text-zinc-400">
                                                    유저 스코어
                                                </span>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {(() => {
                                                        const verdict = getMetacriticVerdict(userScore, 10);
                                                        return (
                                                            <>
                                                                {verdict.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />}
                                                                {verdict.icon === 'check' && <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                                                                {verdict.icon === 'alert' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                                                                <span className={`text-xs font-bold whitespace-nowrap ${verdict.color}`}>
                                                                    {verdict.label}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="my-auto text-center py-4">
                                        <p className="text-xs text-secondary font-bold">등록된 공식 평점이 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            {/* Bento 2: 플레이타임 Radar 카드 (모바일: 우측 1열 / PC: 1열) */}
                            <div className="col-span-1 bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-md relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <span className="text-[10px] sm:text-[11px] font-black text-secondary dark:text-zinc-300 tracking-wider uppercase flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ps-blue" /> 플레이타임
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-black text-secondary dark:text-zinc-300 bg-base px-1.5 py-0.5 rounded border border-divider">
                                        HLTB
                                    </span>
                                </div>

                                {hasPlayTime ? (
                                    <div className="space-y-2 sm:space-y-3 my-auto">
                                        <div>
                                            <div className="flex justify-between text-[11px] sm:text-xs font-bold mb-0.5 sm:mb-1">
                                                <span className="text-secondary dark:text-zinc-300 truncate">메인 스토리</span>
                                                <span className="text-primary font-black ml-1">{formatPlayTime(game.hltbMainStory)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.round(((game.hltbMainStory || 0) / maxPlayTime) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[11px] sm:text-xs font-bold mb-0.5 sm:mb-1">
                                                <span className="text-secondary dark:text-zinc-300 truncate">메인 + 엑스트라</span>
                                                <span className="text-primary font-black ml-1">{formatPlayTime(game.hltbMainExtra)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.round(((game.hltbMainExtra || 0) / maxPlayTime) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[11px] sm:text-xs font-bold mb-0.5 sm:mb-1">
                                                <span className="text-secondary dark:text-zinc-300 truncate">완전 정복 (100%)</span>
                                                <span className="text-primary font-black ml-1">{formatPlayTime(game.hltbCompletionist)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.round(((game.hltbCompletionist || 0) / maxPlayTime) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="my-auto text-center py-4">
                                        <p className="text-xs text-secondary font-bold">플레이타임 집계 중</p>
                                    </div>
                                )}
                            </div>

                            {/* Bento 3: 플랫폼 & 하드웨어 스펙 (모바일: 2열 전체 차지(col-span-2) / PC: 1열) */}
                            <div className="col-span-2 lg:col-span-1 bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-md">
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                                    <span className="text-[10px] sm:text-[11px] font-black text-secondary dark:text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                                        <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ps-blue" /> 플랫폼 & 스펙
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-2.5 my-auto">
                                    {/* 1. 지원 기종 */}
                                    <div className="p-2 sm:p-2.5 bg-base/80 rounded-xl border border-divider flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:justify-between lg:text-left hover:border-divider-strong transition-colors">
                                        <div className="flex flex-col items-center lg:flex-row lg:items-center gap-1 lg:gap-2 mb-1 lg:mb-0">
                                            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ps-blue shrink-0" />
                                            <span className="text-[10px] sm:text-[11px] text-secondary dark:text-zinc-400 font-extrabold whitespace-nowrap">지원 기종</span>
                                        </div>
                                        <span className="text-xs sm:text-xs font-black text-primary px-1.5 py-0.5 rounded bg-surface/80 border border-divider truncate max-w-full">
                                            {game.platforms && game.platforms.length > 0 ? game.platforms.join(' / ') : 'PS5 / PS4'}
                                        </span>
                                    </div>

                                    {/* 2. PS5 Pro 지원/미지원 */}
                                    <div className="p-2 sm:p-2.5 bg-base/80 rounded-xl border border-divider flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:justify-between lg:text-left hover:border-divider-strong transition-colors">
                                        <div className="flex flex-col items-center lg:flex-row lg:items-center gap-1 lg:gap-2 mb-1 lg:mb-0">
                                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 dark:text-zinc-200 shrink-0" />
                                            <span className="text-[10px] sm:text-[11px] text-secondary dark:text-zinc-400 font-extrabold whitespace-nowrap">PS5 Pro</span>
                                        </div>
                                        {game.isPs5ProEnhanced ? (
                                            <span className="text-[11px] sm:text-xs font-black text-zinc-800 dark:text-zinc-100 bg-zinc-200/90 dark:bg-zinc-700/90 px-1.5 sm:px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-500 shadow-sm whitespace-nowrap flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-zinc-600 dark:text-zinc-300" /> Pro 향상
                                            </span>
                                        ) : (
                                            <span className="text-[11px] sm:text-xs font-bold text-muted dark:text-zinc-500 whitespace-nowrap">
                                                기본 구동
                                            </span>
                                        )}
                                    </div>

                                    {/* 3. 한국어 지원 (원본 제목 기반 판정) */}
                                    <div className="p-2 sm:p-2.5 bg-base/80 rounded-xl border border-divider flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:justify-between lg:text-left hover:border-divider-strong transition-colors">
                                        <div className="flex flex-col items-center lg:flex-row lg:items-center gap-1 lg:gap-2 mb-1 lg:mb-0">
                                            <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                                            <span className="text-[10px] sm:text-[11px] text-secondary dark:text-zinc-400 font-extrabold whitespace-nowrap">한국어</span>
                                        </div>
                                        {isKorean ? (
                                            <span className="text-[11px] sm:text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 rounded shadow-sm whitespace-nowrap flex items-center gap-1">
                                                <Check className="w-3 h-3" /> 공식 지원
                                            </span>
                                        ) : (
                                            <span className="text-[11px] sm:text-xs font-bold text-muted dark:text-zinc-500 whitespace-nowrap">
                                                미지원 (외국어)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. 스카우터 주시자 패널 (StealthPanel 레이더 애니메이션) */}
                        {game.scouterTotalWatchers > 0 && (
                            <StealthPanel
                                watchersCount={game.scouterTotalWatchers}
                                averagePrice={game.scouterAverageTargetPrice}
                                isLiked={isLiked}
                            />
                        )}

                        {/* 5. 평가 엇갈림 주의 경고 (Discrepancy Warning) */}
                        {isDiscrepancyWarning && (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-5 py-4 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-fadeIn">
                                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
                                <div>
                                    <span className="block text-red-400 font-black text-sm leading-tight mb-1">
                                        요주의 게임! (평가 엇갈림 주의)
                                    </span>
                                    <span className="block text-red-300 text-xs font-medium leading-relaxed">
                                        전문가(Critic) 점수와 실플레이 유저(User) 평점이 크게 차이나고 있습니다. 구매 전 상세 플레이 리뷰를 꼭 확인하세요.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 6. PS Plus 카탈로그 포함 골든 배너 */}
                        {game.inCatalog && (
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-yellow-500/5 to-transparent border border-yellow-500/30 flex items-center gap-4 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                                <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30 shrink-0">
                                    <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-yellow-400 font-black text-sm sm:text-base mb-0.5">
                                        PS Plus 스페셜 / 디럭스 게임 카탈로그 포함
                                    </h4>
                                    <p className="text-secondary dark:text-zinc-300 text-xs font-medium">
                                        PS Plus 구독 회원은 추가 결제 없이 지금 바로 무료로 다운로드 및 플레이할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 7. 가격 변동 추이 차트 */}
                        <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                            <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                                <h3 className="text-base font-black text-primary flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-ps-blue" />
                                    <span>가격 변동 추이</span>
                                </h3>
                            </div>
                            <div className="relative">
                                <PriceChart historyData={game.priceHistory} lowestPrice={game.lowestPrice} />
                            </div>
                        </div>

                        {/* 8. 현재 에디션 구성품 & 에디션 비교 선택 */}
                        {myEditionContents.length > 0 && (
                            <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-5 shadow-md">
                                <h3 className="text-sm font-black text-primary mb-3 flex items-center gap-1.5">
                                    <Gem className="w-4 h-4 text-ps-blue" /> 이 에디션에 포함된 항목
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {myEditionContents.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5 bg-base/80 border border-divider rounded-xl px-3.5 py-2.5">
                                            <Gem className="w-3.5 h-3.5 text-ps-blue shrink-0" />
                                            <span className="text-xs font-bold text-secondary dark:text-zinc-200 break-keep leading-tight">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 에디션 비교 패널 (상위판/하위판 가격 역전 탐지 100% 보존) */}
                        {game.familyGames && game.familyGames.length > 1 && (
                            <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-6 shadow-md">
                                <h3 className="text-base font-black text-primary mb-4 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-ps-blue" /> 에디션 비교 및 선택
                                </h3>
                                <div className="space-y-3">
                                    {game.familyGames.map((edition) => {
                                        const isCurrent = edition.id === game.id;
                                        const priceGap = edition.currentPrice - game.currentPrice;
                                        const isHigherTier = edition.originalPrice > game.originalPrice;
                                        const isLowerTier = edition.originalPrice < game.originalPrice;
                                        const hasContents = edition.editionContents?.length > 0;

                                        return (
                                            <button
                                                key={edition.id}
                                                onClick={() => navigate(`/games/${edition.id}`, { replace: true, state: location.state })}
                                                className={`w-full flex flex-col p-4 rounded-xl border transition-all text-left ${
                                                    isCurrent
                                                        ? 'bg-ps-blue/15 border-ps-blue ring-2 ring-ps-blue/40 shadow-sm cursor-default'
                                                        : 'bg-base/80 border-divider hover:border-divider-strong hover:bg-surface-hover active:scale-[0.99] cursor-pointer'
                                                }`}
                                                disabled={isCurrent}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                                                    <div className="flex-1 min-w-0">
                                                        {isCurrent && (
                                                            <span className="inline-block text-[9px] font-black text-white bg-ps-blue px-2 py-0.5 rounded mb-1 shadow-sm">
                                                                CURRENT EDITION
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="shrink-0">{renderMiniVerdictIcon(edition.priceVerdict)}</div>
                                                            <p className={`text-sm font-bold truncate flex-1 min-w-0 ${isCurrent ? 'text-primary' : 'text-secondary dark:text-zinc-200'}`}>
                                                                {edition.name}
                                                            </p>
                                                            {!isCurrent && isHigherTier && hasContents && (
                                                                <span className="shrink-0 text-[10px] font-black text-ps-blue bg-ps-blue/15 border border-ps-blue/30 px-2 py-0.5 rounded-full">
                                                                    +{edition.editionContents.length}개 추가
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap justify-end sm:shrink-0">
                                                        {/* 상위판인데 더 저렴한 가격 역전 알림 */}
                                                        {!isCurrent && isHigherTier && priceGap < 0 && (
                                                            <span className="flex items-center gap-1 text-[11px] font-black text-green-400 bg-green-500/15 border border-green-500/40 px-2 py-0.5 rounded-lg shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                                                <Sparkles className="w-3.5 h-3.5 text-green-400" /> 상위판이 더 저렴!
                                                            </span>
                                                        )}
                                                        {/* 하위판인데 더 비싼 경우 */}
                                                        {!isCurrent && isLowerTier && priceGap > 0 && (
                                                            <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-lg">
                                                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> 하위판인데 더 비쌈
                                                            </span>
                                                        )}
                                                        {/* 일반 업그레이드 차액 */}
                                                        {!isCurrent && isHigherTier && priceGap >= 0 && (
                                                            <span className="text-[11px] font-bold text-secondary dark:text-zinc-300 bg-base border border-divider px-2 py-0.5 rounded-lg">
                                                                +{priceGap.toLocaleString()}원 업그레이드
                                                            </span>
                                                        )}
                                                        {/* 하위판 절약 차액 */}
                                                        {!isCurrent && isLowerTier && priceGap < 0 && (
                                                            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-lg">
                                                                <TrendingDown className="w-3.5 h-3.5 text-blue-400" /> {Math.abs(priceGap).toLocaleString()}원 절약
                                                            </span>
                                                        )}
                                                        {edition.discountRate > 0 && (
                                                            <span className="text-xs font-black text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-md">
                                                                -{edition.discountRate}%
                                                            </span>
                                                        )}
                                                        <div className="text-right">
                                                            {edition.discountRate > 0 && (
                                                                <div className="text-[10px] text-muted line-through">
                                                                    ₩{edition.originalPrice.toLocaleString()}
                                                                </div>
                                                            )}
                                                            <div className={`text-sm font-black ${isCurrent ? 'text-primary' : 'text-secondary dark:text-zinc-200'}`}>
                                                                ₩{edition.currentPrice.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {hasContents && (
                                                    <div className="w-full mt-3 pt-3 border-t border-divider/50 flex flex-wrap gap-1.5">
                                                        {edition.editionContents.map((item, idx) => (
                                                            <span key={idx} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                                isCurrent ? 'bg-ps-blue/10 border-ps-blue/30 text-ps-blue' : 'bg-surface border-divider text-muted'
                                                            }`}>
                                                                <Check className="w-2.5 h-2.5" />
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 9. 게임 상세 설명 (더보기/접기) */}
                        <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-6 shadow-md">
                            <h3 className="text-base font-black text-primary mb-4">게임 상세 설명</h3>

                            {hasDescription ? (
                                <div>
                                    <p className={`text-sm text-secondary dark:text-zinc-300 leading-relaxed whitespace-pre-line ${
                                        isDescExpanded ? '' : 'line-clamp-4'
                                    }`}>
                                        {game.description}
                                    </p>
                                    <button
                                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                                        className="mt-3 text-xs font-bold text-ps-blue hover:underline flex items-center gap-1"
                                    >
                                        {isDescExpanded ? (
                                            <>간략히 보기 <ChevronUp className="w-3.5 h-3.5" /></>
                                        ) : (
                                            <>전체 설명 더 보기 <ChevronDown className="w-3.5 h-3.5" /></>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-yellow-400 text-sm font-bold mb-0.5">상세 텍스트 설명이 등록되지 않은 게임입니다.</p>
                                        <p className="text-secondary dark:text-zinc-300 text-xs">아래 바로가기 버튼을 통해 실제 플레이 영상이나 리뷰를 바로 탐색해보세요!</p>
                                    </div>
                                </div>
                            )}

                            {/* 외부 탐색 버튼 */}
                            <div className="flex flex-col sm:flex-row gap-3 border-t border-divider pt-5 mt-5">
                                <a
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold py-3 rounded-xl text-center transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Youtube className="w-4 h-4 text-red-400" /> 유튜브에서 게임플레이 영상 보기
                                </a>
                                <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(game.title + ' 리뷰')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-bold py-3 rounded-xl text-center transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Search className="w-4 h-4 text-blue-400" /> 구글에서 게임 리뷰 검색하기
                                </a>
                            </div>
                        </div>

                        {/* 10. 커뮤니티 투표 & 감자 서버 후원 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 추천 / 비추천 투표 */}
                            <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-5 shadow-md flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-black text-secondary dark:text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> 유저 평가 투표
                                    </span>
                                    <span className="text-[11px] font-bold text-muted bg-base px-2 py-0.5 rounded border border-divider">
                                        {voteTotal}명 참여
                                    </span>
                                </div>

                                <div className="flex gap-2.5 my-2">
                                    <button
                                        onClick={() => handleVote('LIKE')}
                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-black text-sm transition-all active:scale-95 ${
                                            userVote === 'LIKE'
                                                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                                : 'bg-base border-divider text-secondary hover:border-green-400/40 hover:text-primary'
                                        }`}
                                    >
                                        <Circle className="w-4 h-4 text-green-400 fill-green-400/20" />
                                        <span>추천 {voteCounts.likes}</span>
                                    </button>

                                    <button
                                        onClick={() => handleVote('DISLIKE')}
                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-black text-sm transition-all active:scale-95 ${
                                            userVote === 'DISLIKE'
                                                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                                : 'bg-base border-divider text-secondary hover:border-red-400/40 hover:text-primary'
                                        }`}
                                    >
                                        <X className="w-4 h-4 text-red-400" />
                                        <span>비추천 {voteCounts.dislikes}</span>
                                    </button>
                                </div>

                                {voteTotal > 0 && (
                                    <div className="mt-2">
                                        <div className="flex justify-between text-[11px] font-black mb-1">
                                            <span className="text-green-400">○ 추천 {likePercent}%</span>
                                            <span className="text-red-400">{100 - likePercent}% ×</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-base rounded-full overflow-hidden border border-divider">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${likePercent}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 감자 서버 후원 카드 */}
                            <div className="bg-surface/95 dark:bg-surface/90 border border-divider-strong rounded-2xl p-5 shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <Server className="w-8 h-8 text-yellow-400 mb-1.5 group-hover:scale-110 transition-transform" />
                                <h4 className="font-black text-sm text-primary mb-1">감자 서버 밥 주기</h4>
                                <p className="text-xs text-secondary dark:text-zinc-300 mb-3">
                                    지속적인 PS 할인 추적과 서버 유지를 응원해 주세요!
                                </p>
                                <button
                                    onClick={() => setIsDonationOpen(true)}
                                    className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <span>후원하기</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* 11. 관련 게임 추천 (Related Games) */}
                        {game.relatedGames && game.relatedGames.length > 0 && (
                            <div className="pt-6 border-t border-divider">
                                <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-yellow-400" /> 이 게임을 좋아한다면
                                </h3>
                                <div className="hidden lg:grid grid-cols-5 gap-3.5">
                                    {game.relatedGames.map(related => (
                                        <RelatedGameCard key={related.id} game={related} />
                                    ))}
                                </div>
                                <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-2 [&::-webkit-scrollbar]:hidden">
                                    {game.relatedGames.map(related => (
                                        <div key={related.id} className="shrink-0 snap-center w-[42vw] sm:w-[30vw]">
                                            <RelatedGameCard game={related} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 📱 모바일 전용 Sticky Floating 액션 바 */}
            <div className={`lg:hidden w-full p-3.5 bg-base/95 backdrop-blur-xl border-t border-divider z-40 ${
                isModal ? 'sticky bottom-0' : 'fixed bottom-0 left-0'
            }`}>
                <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
                    {/* 미니 신호등 & 가격 */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="shrink-0">{renderMiniVerdictIcon(game.priceVerdict)}</div>
                        <div className="min-w-0">
                            <p className="text-xs text-secondary font-bold truncate">{cleanTitleForDesc(game.title)}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <p className="text-base font-black text-primary">
                                    ₩{game.currentPrice.toLocaleString()}
                                </p>
                                {game.discountRate > 0 && (
                                    <span className="text-[10px] font-black text-green-400 bg-green-500/15 border border-green-500/30 px-1.5 py-0.5 rounded">
                                        -{game.discountRate}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 shrink-0">
                        {game.liked && (
                            <button
                                onClick={() => setIsTargetModalOpen(true)}
                                className="p-2.5 rounded-xl border border-ps-blue/40 bg-ps-blue/15 text-ps-blue active:scale-95"
                                aria-label="목표가 설정"
                            >
                                <Crosshair className="w-4 h-4" />
                            </button>
                        )}

                        <button
                            onClick={onWishlistClick}
                            className={`p-2.5 rounded-xl border font-bold active:scale-95 transition-all ${
                                game.liked
                                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                    : 'bg-surface border-divider text-primary'
                            }`}
                            aria-label={game.liked ? '찜 취소' : '위시리스트 추가'}
                        >
                            <Heart className={`w-4 h-4 ${game.liked ? 'fill-current text-red-500' : ''}`} />
                        </button>

                        <a
                            href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black shadow-md active:scale-95 ${currentTheme.buttonBg}`}
                        >
                            <Gamepad2 className="w-3.5 h-3.5" />
                            <span>스토어</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
            {isTargetModalOpen && (
                <TargetPriceModal
                    onClose={() => setIsTargetModalOpen(false)}
                    game={game}
                    defenseTier={game.defenseInfo?.tier}
                    onSubmit={(price) => handleTargetSubmit(price)}
                />
            )}
            <HelpModal isOpen={helpInfo.isOpen} type={helpInfo.type} onClose={() => setHelpInfo({ isOpen: false, type: null })} />
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn p-0 md:p-6" onClick={handleClose}>
                <div
                    className="w-full h-full md:h-auto md:max-h-[92vh] max-w-6xl overflow-y-auto bg-base md:rounded-3xl shadow-2xl relative border border-divider [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-divider-strong animate-in fade-in zoom-in-[98%] duration-200 ease-out"
                    onClick={e => e.stopPropagation()}
                >
                    <SEO title={game.title} description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원`} image={game.imageUrl} url={`https://ps-signal.com/games/${id}`} />
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-[60] p-2 bg-surface hover:bg-red-500/20 rounded-full text-secondary hover:text-red-400 transition-colors border border-divider backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <BackgroundHero imageUrl={game.imageUrl} />
                    {pageContent}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base text-primary relative overflow-hidden">
            <SEO title={game.title} description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원`} image={game.imageUrl} url={`https://ps-signal.com/games/${id}`} />
            <BackgroundHero imageUrl={game.imageUrl} />
            {pageContent}
        </div>
    );
}
