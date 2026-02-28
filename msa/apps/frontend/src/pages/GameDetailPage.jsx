import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import RelatedGameCard from '../components/RelatedGameCard';
import {getGenreBadgeStyle} from '../utils/uiUtils';
import {calculateCombatPower, getTrafficLight} from '../utils/priceUtils';
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {
    AlertCircle, ArrowLeft, CalendarDays, Check, Circle, Coffee, CreditCard,
    ExternalLink, Flame, Gamepad2, Heart, HelpCircle, Link, Search, Sparkles,
    Square, Timer, TrendingUp, Triangle, Trophy, Users, X, Youtube, Trash2,
    AlertTriangle, RefreshCw, Building2, Calendar, Star
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';

import { adminApi } from '../api/adminApi';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DonationModal from '../components/DonationModal';
import { useAuth } from '../contexts/AuthContext';

const renderVerdictIcon = (verdict) => {
    const buttonBase = "w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg backdrop-blur-md transition-all border-white/40 bg-white/10";
    switch (verdict) {
        case 'BUY_NOW':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}><Circle className="w-8 h-8 text-white fill-white/20 stroke-[3px]" /></div>;
        case 'GOOD_OFFER':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}><Triangle className="w-8 h-8 text-white fill-white/20 stroke-[3px]" /></div>;
        case 'WAIT':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}><X className="w-8 h-8 text-white stroke-[4px]" /></div>;
        case 'TRACKING':
            return <div className={`${buttonBase} shadow-[0_0_15px_rgba(255,255,255,0.3)]`}><Square className="w-8 h-8 text-white fill-white/20 stroke-[3px]" /></div>;
        default:
            return <HelpCircle className="w-10 h-10 text-white/50" />;
    }
};

export default function GameDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const isModal = Boolean(location.state?.background);

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isDonationOpen, setIsDonationOpen] = useState(false);

    const { isAdmin } = useCurrentUser();
    const { openLoginModal } = useAuth();

    // 🚀 모달 렌더링 시 뒤쪽 배경 스크롤 잠금
    useEffect(() => {
        if (isModal) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = 'unset'; };
        }
    }, [isModal]);

    const handleClose = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/games');
        }
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await client.get(`/api/v1/games/${id}`);
                setGame(res.data);
                if (res.data.liked !== undefined) setIsLiked(res.data.liked);

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
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px] bg-[#1a1a1a] text-white p-2 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                    <div>
                        <h4 className="font-bold text-sm text-red-400">관리자 삭제 모드</h4>
                        <p className="text-xs text-gray-400">정말 이 게임을 영구 삭제하시겠습니까?</p>
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
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors">
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 5000, style: { background: 'transparent', boxShadow: 'none' } });
    };

    const handleLike = async () => {
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${id}`);
            const added = response.data.includes("추가");
            setIsLiked(added);
            toast.success(response.data, {
                id: toastId,
                icon: added ? <Heart className="w-5 h-5 text-red-500 fill-current animate-bounce" /> : <Heart className="w-5 h-5 text-gray-400" />
            });
        } catch (error) {
            if (error.response && error.response.status === 401) {
                toast.dismiss(toastId);
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-sm text-gray-900">로그인이 필요한 기능입니다 🔒</span>
                        <span className="text-xs text-gray-500 mb-1">로그인하고 찜한 게임의 할인 알림을 받아보세요!</span>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => { toast.dismiss(t.id); openLoginModal(); }} className="bg-ps-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-md flex-1">로그인 하러 가기</button>
                            <button onClick={() => toast.dismiss(t.id)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex-1">닫기</button>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-center', style: { background: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' } });
            } else {
                toast.error(error.response?.data || "요청 실패", { id: toastId });
            }
        }
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('링크가 복사되었습니다!', { style: { borderRadius: '10px', background: '#333', color: '#fff' }, icon: <Check className="w-5 h-5 text-green-500" /> });
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
    const combatPower = calculateCombatPower(game.metaScore, game.currentPrice);
    const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
    const isClosingSoon = game.saleEndDate && differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) <= 3;
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
    const hasDescription = game.description && game.description !== "Full Data Crawler";
    const glowStyle = {
        'BUY_NOW': 'border-green-500/60 shadow-[0_0_25px_rgba(34,197,94,0.15)] bg-black/60',
        'GOOD_OFFER': 'border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.15)] bg-black/60',
        'WAIT': 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.15)] bg-black/60'
    }[game.priceVerdict] || 'border-blue-500/60 shadow-[0_0_25px_rgba(59,130,246,0.15)] bg-black/60';

    const pageContent = (
        <div className="relative z-10">
            <div className="p-6 md:p-10 pb-20 max-w-5xl mx-auto">
                {/* 뒤로가기 버튼 */}
                <button onClick={handleClose} className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors text-sm font-bold gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>

                <div className="flex flex-col md:flex-row gap-10">
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

                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {game.genres && game.genres.length > 0 ? game.genres.map(g => (
                                <button
                                    key={g}
                                    onClick={() => handleGenreClick(g)}
                                    className={`px-3 py-1 rounded text-xs font-bold border transition-all hover:scale-105 active:scale-95 bg-black/40 backdrop-blur-sm ${getGenreBadgeStyle(g)}`}
                                >
                                    {g}
                                </button>
                            )) : <span className="px-3 py-1 rounded text-xs font-bold border bg-gray-600/20 text-gray-400 border-gray-500/30 backdrop-blur-sm">미분류</span>}
                            {game.platforms && game.platforms.map(p => <span key={p} className="bg-ps-blue/20 text-ps-blue border border-ps-blue/30 px-2 py-1 rounded text-xs font-bold cursor-default backdrop-blur-sm">{p}</span>)}
                        </div>

                        <div className="flex justify-between items-start gap-4 mb-2">
                            <h1 className="text-3xl md:text-4xl font-black leading-tight text-white drop-shadow-2xl flex-1 break-keep">{game.title}</h1>
                            {isAdmin && (
                                <div className="flex gap-2 shrink-0 pt-1">
                                    <button onClick={handleRefresh} className="p-3 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all shadow-lg backdrop-blur-md group" title="정보 갱신"><RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" /></button>
                                    <button onClick={handleDeleteGame} className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30 transition-all shadow-lg backdrop-blur-md group" title="게임 삭제"><Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" /></button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm shadow-sm hover:bg-white/10 transition-colors cursor-default">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-xs font-bold tracking-wide">{game.publisher}</span>
                            </div>
                            {game.releaseDate && (
                                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm shadow-sm hover:bg-white/10 transition-colors cursor-default">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-300 text-xs font-bold tracking-wide">{game.releaseDate.replace(/-/g, '. ')} 출시</span>
                                    {differenceInCalendarDays(new Date(), parseISO(game.releaseDate)) <= 180 && <span className="ml-1.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black shadow-sm animate-pulse">NEW</span>}
                                </div>
                            )}
                        </div>

                        <div className={`p-6 rounded-xl border-2 backdrop-blur-md mb-8 transition-all duration-300 relative overflow-hidden group ${glowStyle}`}>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent z-0"></div>
                            <div className="relative z-10 flex items-start gap-5">
                                <div className="shrink-0 scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{renderVerdictIcon(game.priceVerdict)}</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black mb-1.5 text-white drop-shadow-md flex items-center gap-2">{traffic.text}</h3>
                                    <p className="text-sm text-gray-200 font-medium leading-relaxed opacity-90">{traffic.desc}</p>
                                    {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                        <div className="mt-3 inline-flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 shadow-sm backdrop-blur-md">
                                            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                            <span className="text-gray-300 font-bold">History Low:</span>
                                            <span className="font-black text-white text-sm">{game.lowestPrice.toLocaleString()}원</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-end gap-4 mb-4 border-b border-white/10 pb-8">
                            <div>
                                {game.isPlusExclusive && <div className="flex items-center gap-1 mb-1 animate-pulse"><span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded">PLUS</span><span className="text-yellow-400 text-xs font-bold">회원 특별 할인가</span></div>}
                                <span className={`text-6xl font-black tracking-tighter drop-shadow-xl ${game.isPlusExclusive ? 'text-yellow-400' : 'text-white'}`}>
                                    {game.currentPrice.toLocaleString()}<span className="text-2xl font-medium text-gray-400 ml-1">원</span>
                                </span>
                            </div>
                            {game.discountRate > 0 && (
                                <div className="flex flex-col mb-2 animate-bounce-slow">
                                    <span className="text-gray-400 line-through text-lg font-medium">{game.originalPrice.toLocaleString()}원</span>
                                    <span className={`px-3 py-1 rounded-lg font-black text-lg text-center shadow-lg transform -rotate-2 ${game.plusExclusive ? 'bg-yellow-400 text-black' : 'bg-ps-blue text-white'}`}>-{game.discountRate}%</span>
                                </div>
                            )}
                        </div>

                        {game.inCatalog && (
                            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-900/40 to-black border border-yellow-500/30 flex items-center gap-4 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <div className="bg-yellow-500/20 p-2 rounded-lg border border-yellow-500/30"><Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" /></div>
                                <div><h4 className="text-yellow-400 font-bold text-sm">PS Plus 스페셜 / 디럭스 카탈로그 포함</h4><p className="text-gray-400 text-xs mt-0.5">구독 회원은 추가 비용 없이 플레이 가능합니다.</p></div>
                            </div>
                        )}

                        <div className="mb-8 mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-center justify-between group hover:border-blue-500/60 transition-colors cursor-pointer shadow-lg" onClick={() => window.open('https://search.shopping.naver.com/search/all?query=PSN+기프트카드', '_blank')}>
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30"><CreditCard className="w-6 h-6 text-blue-300" /></div>
                                <div><h4 className="text-white font-bold text-sm flex items-center gap-2">지갑 충전이 필요하신가요?<span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black animate-pulse">HOT</span></h4><p className="text-blue-200 text-xs mt-1">오픈마켓 최저가 검색으로 <span className="text-white font-bold underline">알뜰하게 충전</span> 하세요!</p></div>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                        </div>

                        {game.saleEndDate && game.discountRate > 0 && (
                            <div className="flex items-center gap-2 mb-8 text-sm bg-black/40 w-fit px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5">
                                <CalendarDays className="w-4 h-4 text-gray-400" /><span className="text-gray-400">할인 종료:</span><span className="text-white font-bold">{game.saleEndDate.replace(/-/g, '.')}</span>
                                {(() => {
                                    const daysLeft = differenceInCalendarDays(parseISO(game.saleEndDate), new Date());
                                    if (daysLeft <= 1 && daysLeft >= 0) return <span className="text-orange-400 font-bold ml-1">({daysLeft}일 남음 - 막차!)</span>;
                                    return <span className="text-gray-400 ml-1">({daysLeft}일 남음)</span>;
                                })()}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white text-black hover:bg-gray-200 py-4 rounded-full font-black text-center transition-transform hover:-translate-y-1 shadow-xl flex items-center justify-center gap-2 group"><Gamepad2 className="w-6 h-6 group-hover:rotate-12 transition-transform" /> PS Store에서 보기</a>
                            <button onClick={handleLike} className={`px-8 py-4 rounded-full border transition-all font-bold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 ${isLiked ? 'bg-red-500/10 border-red-500 text-red-500 shadow-red-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200 hover:text-white backdrop-blur-md'}`}>
                                <div className={`transition-transform duration-300 ${isLiked ? 'scale-110' : 'scale-100'}`}><Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /></div><span>{isLiked ? '찜 목록에 있음' : '찜하기'}</span>
                            </button>
                            <button onClick={handleShare} className="px-6 py-4 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-ps-blue hover:border-ps-blue hover:text-white transition-all font-bold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 backdrop-blur-md group"><Link className="w-5 h-5 group-hover:rotate-45 transition-transform" /></button>
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
                            {hasDescription ? <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line mb-6">{game.description}</p> : <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 mb-6"><AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" /><div><p className="text-yellow-200 text-sm font-bold">상세 설명이 제공되지 않는 게임입니다.</p><p className="text-yellow-500/80 text-xs mt-1">대신 아래 버튼을 통해 게임플레이 영상이나 리뷰를 찾아보세요!</p></div></div>}
                            <div className="flex gap-3">
                                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-red-600/10 hover:bg-red-600/30 border border-red-600/30 text-red-400 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"><Youtube className="w-4 h-4" /> 유튜브 검색</a>
                                <a href={`https://www.google.com/search?q=${encodeURIComponent(game.title)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600/10 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"><Search className="w-4 h-4" /> 구글 검색</a>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-5">

                        {game.metaScore > 0 && (
                            <div className="relative group overflow-hidden bg-black/40 border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-2xl transition-all hover:border-purple-500/50">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-purple-500/30 transition-colors"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3.5 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                        <Star className="w-6 h-6 text-white fill-current animate-pulse-slow drop-shadow-sm" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                            IGDB Score
                                        </span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`font-black text-3xl tracking-tight leading-none drop-shadow-md ${game.metaScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {game.metaScore}
                                            </span>
                                            <span className="text-gray-500 font-bold text-xs ml-0.5">/ 100</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {game.userScore > 0 && (
                            <div className="relative group overflow-hidden bg-black/40 border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-2xl transition-all hover:border-blue-500/50">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-blue-500/30 transition-colors"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3.5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                        <Users className="w-6 h-6 text-white drop-shadow-sm" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                                            User Score
                                        </span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`font-black text-3xl tracking-tight leading-none drop-shadow-md ${game.userScore >= 7.0 ? 'text-blue-400' : 'text-gray-300'}`}>
                                                {Number(game.userScore).toFixed(1)}
                                            </span>
                                            <span className="text-gray-500 font-bold text-xs ml-0.5">/ 10</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-white/10 text-center shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div><Coffee className="w-10 h-10 text-yellow-400 mx-auto mb-3 group-hover:scale-110 transition-transform" /><h4 className="font-bold text-white mb-2 text-lg">개발자에게 커피 쏘기 ☕</h4><p className="text-xs text-gray-400 mb-6 leading-relaxed">이 서비스가 마음에 드셨나요?<br/>작은 후원이 서버 유지와<br/>새로운 기능 개발에 큰 힘이 됩니다!</p>
                            <button onClick={() => setIsDonationOpen(true)} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2">커피 한 잔 사주기 (후원) <ExternalLink className="w-4 h-4"/></button>
                            <Sparkles className="absolute top-4 right-4 w-4 h-4 text-yellow-200 opacity-50 animate-pulse" />
                        </div>
                    </div>
                </div>

                {game.relatedGames && game.relatedGames.length > 0 && (
                    <div className="mt-16 pt-10 border-t border-white/10 animate-fadeIn">
                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400" /><span>이 게임을 좋아한다면 (Recommended)</span></h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {game.relatedGames.map(related => <RelatedGameCard key={related.id} game={related} />)}
                        </div>
                    </div>
                )}
            </div>
            <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fadeIn p-0 md:p-8" onClick={handleClose}>
                <div
                    className="w-full h-full md:h-auto md:max-h-full max-w-6xl overflow-y-auto bg-ps-black md:rounded-2xl shadow-2xl relative border border-white/10 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/40"
                    onClick={e => e.stopPropagation()}
                >
                    <SEO title={game.title} description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원`} image={game.imageUrl} url={`https://ps-signal.com/games/${id}`} />

                    <button onClick={handleClose} className="absolute top-4 right-4 z-[60] p-2 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors border border-white/10 backdrop-blur-md">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="absolute inset-0 z-0 pointer-events-none md:rounded-2xl overflow-hidden">
                        <PSGameImage src={game.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-60 blur-[8px] brightness-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ps-black via-ps-black/80 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-ps-black/50 via-transparent to-transparent"></div>
                    </div>

                    {pageContent}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ps-black text-white relative overflow-hidden">
            <SEO title={game.title} description={`${game.title} 현재 가격: ${game.currentPrice.toLocaleString()}원`} image={game.imageUrl} url={`https://ps-signal.com/games/${id}`} />
            <div className="absolute inset-0 z-0 pointer-events-none">
                <PSGameImage src={game.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-60 blur-[8px] brightness-70" />
                <div className="absolute inset-0 bg-gradient-to-t from-ps-black via-ps-black/80 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-ps-black/50 via-transparent to-transparent"></div>
            </div>
            {pageContent}
        </div>
    );
}