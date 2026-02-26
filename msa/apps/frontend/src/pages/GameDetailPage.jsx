import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import RelatedGameCard from '../components/RelatedGameCard';
import {getGenreBadgeStyle} from '../utils/uiUtils';
import {calculateCombatPower, getTrafficLight} from '../utils/priceUtils';
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    Check,
    Circle,
    Coffee,
    CreditCard,
    ExternalLink,
    Flame,
    Gamepad2,
    Heart,
    HelpCircle,
    Link,
    Search,
    Sparkles,
    Square,
    Timer,
    TrendingUp,
    Triangle,
    Trophy,
    Users,
    X,
    Youtube,
    Trash2,
    AlertTriangle,
    RefreshCw,
    Building2,
    Calendar,
    Star
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';

import { adminApi } from '../api/adminApi';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DonationModal from '../components/DonationModal';

const renderVerdictIcon = (verdict) => {
    // 공통 버튼 스타일 (유리 질감 + 둥근 테두리 + 흰색 테마)
    const buttonBase = "w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg backdrop-blur-md transition-all border-white/40 bg-white/10";

    switch (verdict) {
        case 'BUY_NOW': // 강력 추천 -> 흰색 동그라미
            return (
                <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                    <Circle className="w-8 h-8 text-white fill-white/20 stroke-[3px]" />
                </div>
            );
        case 'GOOD_OFFER': // 나쁘지 않음 -> 흰색 세모
            return (
                <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                    <Triangle className="w-8 h-8 text-white fill-white/20 stroke-[3px]" />
                </div>
            );
        case 'WAIT': // 비쌈 -> 흰색 엑스
            return (
                <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                    <X className="w-8 h-8 text-white stroke-[4px]" />
                </div>
            );
        case 'TRACKING': // 수집중 -> 흰색 네모
            return (
                <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                    <Square className="w-8 h-8 text-white fill-white/20 stroke-[3px]" />
                </div>
            );
        default:
            return <HelpCircle className="w-10 h-10 text-white/50" />;
    }
};

export default function GameDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

    const [isDonationOpen, setIsDonationOpen] = useState(false);

    const { isAdmin } = useCurrentUser();

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await client.get(`/api/v1/games/${id}`);
                setGame(res.data);
                if (res.data.liked !== undefined) setIsLiked(res.data.liked);

                const recentGames = JSON.parse(localStorage.getItem('recentGames') || '[]');
                const updatedGames = [
                    {
                        id: res.data.id,
                        title: res.data.title,
                        imageUrl: res.data.imageUrl
                    },
                    ...recentGames.filter(item => item.id !== res.data.id)
                ].slice(0, 7);

                localStorage.setItem('recentGames', JSON.stringify(updatedGames));

            } catch (err) {
                console.error(err);
                toast.error("정보 로딩 실패");
                navigate('/games');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, navigate]);

    const handleDeleteGame = () => {
        // 커스텀 컨펌 UI (Toast)
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px] bg-[#1a1a1a] text-white p-2 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-red-400">관리자 삭제 모드</h4>
                        <p className="text-xs text-gray-400">정말 이 게임을 영구 삭제하시겠습니까?</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            const loadId = toast.loading("데이터 파쇄 중...");
                            try {
                                await adminApi.deleteGame(id);

                                const recentGames = JSON.parse(localStorage.getItem('recentGames') || '[]');
                                const updatedRecent = recentGames.filter(game => game.id !== Number(id));
                                localStorage.setItem('recentGames', JSON.stringify(updatedRecent));

                                toast.success("삭제 완료!", { id: loadId });
                                navigate(-1);
                            } catch (err) {
                                console.error(err);
                                toast.error("삭제 실패: 권한을 확인하세요.", { id: loadId });
                            }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        네, 삭제합니다
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { background: 'transparent', boxShadow: 'none' } });
    };

    // 찜 기능
    const handleLike = async () => {
        // 처리 중이면 중복 클릭 방지
        const toastId = toast.loading('처리 중...');

        try {
            const response = await client.post(`/api/v1/wishlists/${id}`);
            const message = response.data;
            const added = message.includes("추가");

            setIsLiked(added);

            toast.success(message, {
                id: toastId,
                icon: added
                    ? <Heart className="w-5 h-5 text-red-500 fill-current animate-bounce" /> // 찜 추가 시: 빨간 하트 + 통통 튀는 애니메이션
                    : <Heart className="w-5 h-5 text-gray-400" /> // 찜 해제 시: 회색 빈 하트
            });
        } catch (error) {
            if (error.response && error.response.data) {
                toast.error(error.response.data, { id: toastId });
            } else {
                toast.error("요청 실패", { id: toastId });
            }
        }
    };

    // 공유하기 버튼 기능
    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('링크가 복사되었습니다!', {
                style: { borderRadius: '10px', background: '#333', color: '#fff' },
                icon: <Check className="w-5 h-5 text-green-500" />
            });
        } catch (err) {
            toast.error('링크 복사에 실패했습니다.');
        }
    };

    // 관리자 전용: 최신 정보 수집 요청
    const handleRefresh = async () => {
        const loadId = toast.loading("최신 정보를 수집 요청 중...");

        try {
            // ✅ adminApi 사용
            await adminApi.refreshGame(id);

            toast.success("수집 요청 완료! 잠시 후 새로고침 됩니다.", { id: loadId });

            setTimeout(() => {
                window.location.reload();
            }, 4000);

        } catch (err) {
            console.error(err);
            toast.error("수집 요청 실패: 관리자 권한을 확인하세요.", { id: loadId });
        }
    };

    const handleGenreClick = (genre) => {
        const cleanGenre = genre.trim();
        navigate(`/games?genre=${encodeURIComponent(cleanGenre)}`);
    };

    if (loading) return <div className="pt-20"><PSLoader /></div>;

    if (!game) return null;

    const traffic = getTrafficLight(game.priceVerdict);
    const combatPower = calculateCombatPower(game.metaScore, game.currentPrice);

    const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
    const isClosingSoon = game.saleEndDate && differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) <= 3;
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

    // 상세 설명 데이터 유무 확인 (Full Data Crawler 문자열 제외)
    const hasDescription = game.description && game.description !== "Full Data Crawler";

    const getGlowStyles = (verdict) => {
        switch (verdict) {
            case 'BUY_NOW': return 'border-green-500/60 shadow-[0_0_25px_rgba(34,197,94,0.15)] bg-black/60';
            case 'GOOD_OFFER': return 'border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.15)] bg-black/60';
            case 'WAIT': return 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.15)] bg-black/60';
            default: return 'border-blue-500/60 shadow-[0_0_25px_rgba(59,130,246,0.15)] bg-black/60';
        }
    };
    const glowStyle = getGlowStyles(game.priceVerdict);

    return (
        <div className="min-h-screen bg-ps-black text-white relative overflow-hidden">

            {/* SEO 컴포넌트 */}
            <SEO
                title={game.title}
                description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원 (${game.discountRate}% 할인). IGDB스코어: ${game.metaScore}점.`}
                image={game.imageUrl}
                url={`https://ps-signal.com/games/${id}`}
            />

            {/* Hero Backdrop */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <PSGameImage
                    src={game.imageUrl}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-60 blur-[8px] brightness-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ps-black via-ps-black/80 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-ps-black/50 via-transparent to-transparent"></div>
            </div>

            <div className="relative z-10">

                <div className="p-6 md:p-10 pb-20 max-w-5xl mx-auto">
                    <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors text-sm font-bold gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </button>

                    <div className="flex flex-col md:flex-row gap-10">
                        {/* 왼쪽: 이미지 & 전투력 */}
                        <div className="w-full md:w-1/3 space-y-6">
                            <div className={`rounded-xl overflow-hidden shadow-2xl border relative group bg-ps-card ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-white/10'}`}>
                                <PSGameImage src={game.imageUrl} alt={game.title} className="w-full object-cover aspect-[3/4]" />
                                {isPlatinum && <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-xl pointer-events-none animate-pulse"></div>}
                                {isNew && <span className="absolute top-2 left-2 bg-green-500 text-black text-xs font-black px-2 py-1 rounded shadow-lg z-10">NEW</span>}
                                {isClosingSoon && <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 마감임박</span>}
                            </div>

                            {combatPower > 0 && (
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:border-ps-blue/50 transition-colors cursor-help group shadow-lg">
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                        <Flame className="w-3 h-3 text-orange-500" /> Combat Power
                                    </p>
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 group-hover:from-yellow-300 group-hover:to-red-500 transition-all">
                                        {combatPower.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">가성비 전투력</p>
                                </div>
                            )}
                        </div>

                        {/* 오른쪽: 정보 영역 */}
                        <div className="flex-1">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {/* 1. 장르 영역 처리 */}
                                {game.genres && game.genres.length > 0 ? (
                                    // 장르가 있을 때: 클릭 가능한 버튼들 출력
                                    game.genres.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => handleGenreClick(g)}
                                            className={`px-3 py-1 rounded text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer bg-black/40 backdrop-blur-sm ${getGenreBadgeStyle(g)}`}
                                        >
                                            {g}
                                        </button>
                                    ))
                                ) : (
                                    // 장르가 없을 때: 클릭 기능이 없는 '미분류' 배지 출력
                                    <span className="px-3 py-1 rounded text-xs font-bold border bg-gray-600/20 text-gray-400 border-gray-500/30 backdrop-blur-sm">
                                        미분류
                                    </span>
                                )}

                                {/* 2. 플랫폼 영역: 이건 장르 유무와 상관없이 항상 출력됨 */}
                                {game.platforms && game.platforms.map(p => (
                                    <span
                                        key={p}
                                        className="bg-ps-blue/20 text-ps-blue border border-ps-blue/30 px-2 py-1 rounded text-xs font-bold cursor-default backdrop-blur-sm"
                                    >
                                        {p}
                                    </span>
                                ))}
                            </div>

                            <div className="flex justify-between items-start gap-4 mb-2">
                                {/* 제목 */}
                                <h1 className="text-3xl md:text-4xl font-black leading-tight text-white drop-shadow-2xl flex-1 break-keep">
                                    {game.title}
                                </h1>

                                {/* 🔧 관리자 컨트롤 */}
                                {isAdmin && (
                                    <div className="flex gap-2 shrink-0 pt-1">
                                        <button
                                            onClick={handleRefresh}
                                            className="p-3 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all shadow-lg backdrop-blur-md group"
                                            title="정보 갱신"
                                        >
                                            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                                        </button>
                                        <button
                                            onClick={handleDeleteGame}
                                            className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30 transition-all shadow-lg backdrop-blur-md group"
                                            title="게임 삭제"
                                        >
                                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 퍼블리셔 & 출시일 메타데이터 영역 */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
                                {/* 퍼블리셔 칩 */}
                                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm shadow-sm hover:bg-white/10 transition-colors cursor-default">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-300 text-xs font-bold tracking-wide">
                                        {game.publisher}
                                    </span>
                                </div>

                                {/* 출시일 칩 */}
                                {game.releaseDate && (
                                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm shadow-sm hover:bg-white/10 transition-colors cursor-default">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-300 text-xs font-bold tracking-wide">
                                            {game.releaseDate.replace(/-/g, '. ')} 출시
                                        </span>

                                        {/* 🔥 출시 6개월(180일) 이내인 경우 자동으로 'NEW' 배지 부착 */}
                                        {differenceInCalendarDays(new Date(), parseISO(game.releaseDate)) <= 180 && (
                                            <span className="ml-1.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black shadow-sm animate-pulse">
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 판정 박스 */}
                            <div className={`p-6 rounded-xl border-2 backdrop-blur-md mb-8 transition-all duration-300 relative overflow-hidden group ${glowStyle}`}>
                                {/* 배경 그라데이션 */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent z-0"></div>

                                <div className="relative z-10 flex items-start gap-5">
                                    {/* 판정 아이콘 */}
                                    <div className="shrink-0 scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                                        {renderVerdictIcon(game.priceVerdict)}
                                    </div>

                                    <div className="flex-1">
                                        {/* 텍스트: 흰색으로 가독성 확보 */}
                                        <h3 className="text-xl font-black mb-1.5 text-white drop-shadow-md flex items-center gap-2">
                                            {traffic.text}
                                        </h3>

                                        <p className="text-sm text-gray-200 font-medium leading-relaxed opacity-90">
                                            {traffic.desc}
                                        </p>

                                        {/* 역대 최저가 뱃지 */}
                                        {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                            <div className="mt-3 inline-flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 shadow-sm backdrop-blur-md">
                                                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                                <span className="text-gray-300 font-bold">History Low:</span>
                                                <span className="font-black text-white text-sm">
                                                    {game.lowestPrice.toLocaleString()}원
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-end gap-4 mb-4 border-b border-white/10 pb-8">
                                <div>
                                    {game.plusExclusive && (
                                        <div className="flex items-center gap-1 mb-1 animate-pulse">
                                            <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span>
                                            <span className="text-yellow-400 text-xs font-bold">회원 특별 할인가</span>
                                        </div>
                                    )}

                                    {/* 가격 텍스트 색상 변경 (Plus 할인이면 노란색, 아니면 흰색) */}
                                    <span className={`text-6xl font-black tracking-tighter drop-shadow-xl ${game.plusExclusive ? 'text-yellow-400' : 'text-white'}`}>
                                        {game.currentPrice.toLocaleString()}
                                        <span className="text-2xl font-medium text-gray-400 ml-1">원</span>
                                    </span>
                                </div>

                                {game.discountRate > 0 && (
                                    <div className="flex flex-col mb-2 animate-bounce-slow">
                                        <span className="text-gray-400 line-through text-lg font-medium">
                                            {game.originalPrice.toLocaleString()}원
                                        </span>
                                        <span className={`px-3 py-1 rounded-lg font-black text-lg text-center shadow-lg transform -rotate-2 
                                            ${game.plusExclusive ? 'bg-yellow-400 text-black' : 'bg-ps-blue text-white'}`}>
                                            -{game.discountRate}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {game.inCatalog && (
                                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-900/40 to-black border border-yellow-500/30 flex items-center gap-4 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                    <div className="bg-yellow-500/20 p-2 rounded-lg border border-yellow-500/30">
                                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-yellow-400 font-bold text-sm">
                                            PS Plus 스페셜 / 디럭스 카탈로그 포함
                                        </h4>
                                        <p className="text-gray-400 text-xs mt-0.5">
                                            구독 회원은 추가 비용 없이 플레이 가능합니다.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-8 mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-center justify-between group hover:border-blue-500/60 transition-colors cursor-pointer shadow-lg"
                                 onClick={() => window.open('https://search.shopping.naver.com/search/all?query=PSN+기프트카드', '_blank')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
                                        <CreditCard className="w-6 h-6 text-blue-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                            지갑 충전이 필요하신가요?
                                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black animate-pulse">HOT</span>
                                        </h4>
                                        <p className="text-blue-200 text-xs mt-1">
                                            오픈마켓 최저가 검색으로 <span className="text-white font-bold underline">알뜰하게 충전</span> 하세요!
                                        </p>
                                    </div>
                                </div>
                                <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            </div>

                            {game.saleEndDate && game.discountRate > 0 && (
                                <div className="flex items-center gap-2 mb-8 text-sm bg-black/40 w-fit px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5">
                                    <CalendarDays className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">할인 종료:</span>
                                    <span className="text-white font-bold">{game.saleEndDate.replace(/-/g, '.')}</span>
                                    {(() => {
                                        const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                                        if (daysLeft <= 1 && daysLeft >= 0) return <span className="text-orange-400 font-bold ml-1">({daysLeft}일 남음 - 막차!)</span>;
                                        return <span className="text-gray-400 ml-1">({daysLeft}일 남음)</span>;
                                    })()}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4">
                                <a href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white text-black hover:bg-gray-200 py-4 rounded-full font-black text-center transition-transform hover:-translate-y-1 shadow-xl flex items-center justify-center gap-2 group">
                                    <Gamepad2 className="w-6 h-6 group-hover:rotate-12 transition-transform" /> PS Store에서 보기
                                </a>
                                {/* 찜하기 버튼 */}
                                <button
                                    onClick={handleLike}
                                    className={`px-8 py-4 rounded-full border transition-all font-bold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 
                                    ${isLiked
                                        ? 'bg-red-500/10 border-red-500 text-red-500 shadow-red-500/20' // 찜 했을 때: 은은한 빨간 배경 + 빨간 테두리
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200 hover:text-white backdrop-blur-md' // 안 했을 때: 깔끔한 유리 느낌
                                    }`}
                                >
                                    {/* 아이콘: 찜하면 빨갛게 채워짐(fill-current), 아니면 빈 하트 */}
                                    <div className={`transition-transform duration-300 ${isLiked ? 'scale-110' : 'scale-100'}`}>
                                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                    </div>
                                    <span>{isLiked ? '찜 목록에 있음' : '찜하기'}</span>
                                </button>

                                {/* 공유하기 버튼 UI */}
                                <button
                                    onClick={handleShare}
                                    className="px-6 py-4 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-ps-blue hover:border-ps-blue hover:text-white transition-all font-bold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 backdrop-blur-md group"
                                >
                                    <Link className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
                        <div className="lg:col-span-2 space-y-8 min-w-0">
                            <div className="bg-ps-card/80 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-ps-blue" /> 가격 변동 그래프</h3>
                                <PriceChart historyData={game.priceHistory} />
                            </div>

                            <div className="bg-ps-card/80 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-4">게임 정보</h3>

                                {/* 1. 상세 설명 텍스트 영역 */}
                                {hasDescription ? (
                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line mb-6">
                                        {game.description}
                                    </p>
                                ) : (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                                        <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-yellow-200 text-sm font-bold">상세 설명이 제공되지 않는 게임입니다.</p>
                                            <p className="text-yellow-500/80 text-xs mt-1">대신 아래 버튼을 통해 게임플레이 영상이나 리뷰를 찾아보세요!</p>
                                        </div>
                                    </div>
                                )}

                                {/* 2. 외부 검색 버튼 영역 (설명 유무와 상관없이 항상 노출!) */}
                                <div className="flex gap-3">
                                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-red-600/10 hover:bg-red-600/30 border border-red-600/30 text-red-400 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2">
                                        <Youtube className="w-4 h-4" /> 유튜브 검색
                                    </a>
                                    <a href={`https://www.google.com/search?q=${encodeURIComponent(game.title)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600/10 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2">
                                        <Search className="w-4 h-4" /> 구글 검색
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-ps-card/80 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6">Scores</h3>
                                {/* IGDB Score */}
                                {game.metaScore > 0 && (
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-bold text-gray-300 flex items-center gap-2">
                                            <Star className="w-5 h-5 text-purple-400 fill-purple-400/20" /> IGDB Score
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-lg font-black text-lg shadow-inner ${
                                            game.metaScore >= 80
                                                ? 'bg-green-900/80 text-green-400 border border-green-500/50'
                                                : 'bg-yellow-900/80 text-yellow-400 border border-yellow-500/50'
                                        }`}>
                                            {game.metaScore}
                                        </span>
                                    </div>
                                )}

                                {/* User Score: 유저 아이콘 */}
                                {game.userScore > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-300 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-blue-400" /> User Score
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-lg font-black text-lg shadow-inner ${
                                            game.userScore >= 7.0
                                                ? 'bg-blue-900/80 text-blue-400 border border-blue-500/50'
                                                : 'bg-gray-800 text-gray-400 border border-gray-600/50'
                                        }`}>
                                            {Number(game.userScore).toFixed(1)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-white/10 text-center shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                                <Coffee className="w-10 h-10 text-yellow-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold text-white mb-2 text-lg">개발자에게 커피 쏘기 ☕</h4>
                                <p className="text-xs text-gray-400 mb-6 leading-relaxed">이 서비스가 마음에 드셨나요?<br/>작은 후원이 서버 유지와<br/>새로운 기능 개발에 큰 힘이 됩니다!</p>
                                <button
                                    onClick={() => setIsDonationOpen(true)}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    커피 한 잔 사주기 (후원) <ExternalLink className="w-4 h-4"/>
                                </button>
                                <Sparkles className="absolute top-4 right-4 w-4 h-4 text-yellow-200 opacity-50 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* (추천 게임 섹션) */}
                    {game.relatedGames && game.relatedGames.length > 0 && (
                        <div className="mt-16 pt-10 border-t border-white/10 animate-fadeIn">
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-400" />
                                <span>이 게임을 좋아한다면 (Recommended)</span>
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {game.relatedGames.map(related => (
                                    <RelatedGameCard key={related.id} game={related} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DonationModal
                isOpen={isDonationOpen}
                onClose={() => setIsDonationOpen(false)}
            />

        </div>
    );
}