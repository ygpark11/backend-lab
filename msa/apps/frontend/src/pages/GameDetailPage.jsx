import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import Navbar from '../components/Navbar';
import RelatedGameCard from '../components/RelatedGameCard';
import { getGenreBadgeStyle } from '../utils/uiUtils';
import { calculateCombatPower, getTrafficLight } from '../utils/priceUtils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
    Gamepad2, AlertCircle, CalendarDays, Youtube, Search,
    Timer, CheckCircle, XCircle, Info, HelpCircle, TrendingUp,
    Coffee, Flame, Sparkles, ArrowLeft, Share2, Link, Check, Heart
} from 'lucide-react';

const renderVerdictIcon = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW': return <CheckCircle className="w-8 h-8" />;
        case 'GOOD_OFFER': return <Info className="w-8 h-8" />;
        case 'WAIT': return <XCircle className="w-8 h-8" />;
        case 'TRACKING': return <Search className="w-8 h-8" />;
        default: return <HelpCircle className="w-8 h-8" />;
    }
};

export default function GameDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

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
            toast.error("요청 실패", { id: toastId });
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

    const handleGenreClick = (genre) => {
        const cleanGenre = genre.trim();
        navigate(`/games?genre=${encodeURIComponent(cleanGenre)}`);
    };

    if (loading) return <div className="min-h-screen bg-ps-black text-white flex justify-center items-center">Loading...</div>;
    if (!game) return null;

    const traffic = getTrafficLight(game.priceVerdict);
    const combatPower = calculateCombatPower(game.metaScore, game.currentPrice);

    const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
    const isClosingSoon = game.saleEndDate && differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) <= 3;
    const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

    // 상세 설명 데이터 유무 확인 (Full Data Crawler 문자열 제외)
    const hasDescription = game.description && game.description !== "Full Data Crawler";

    return (
        <div className="min-h-screen bg-ps-black text-white relative overflow-hidden">
            {/* Hero Backdrop */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                    style={{
                        backgroundImage: `url(${game.imageUrl})`,
                        filter: 'blur(8px) brightness(0.7)',
                        opacity: 0.6
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ps-black via-ps-black/80 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-ps-black/50 via-transparent to-transparent"></div>
            </div>

            <div className="relative z-10">
                <Navbar />

                <div className="p-6 md:p-10 pb-20 max-w-5xl mx-auto">
                    <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors text-sm font-bold gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </button>

                    <div className="flex flex-col md:flex-row gap-10">
                        {/* 왼쪽: 이미지 & 전투력 */}
                        <div className="w-full md:w-1/3 space-y-6">
                            <div className={`rounded-xl overflow-hidden shadow-2xl border relative group bg-ps-card ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-white/10'}`}>
                                <img src={game.imageUrl} alt={game.title} className="w-full object-cover aspect-[3/4]" />
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

                            <h1 className="text-4xl md:text-5xl font-black mb-2 leading-tight text-white drop-shadow-lg">{game.title}</h1>
                            <p className="text-gray-300 text-sm mb-6 font-medium">{game.publisher}</p>

                            <div className={`p-6 rounded-xl border mb-8 backdrop-blur-md bg-opacity-90 shadow-lg ${traffic.color} bg-opacity-10 border-opacity-30`}>
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 p-2 bg-white/10 rounded-full">
                                        {renderVerdictIcon(game.priceVerdict)}
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black mb-1 ${traffic.text.includes('기회') ? 'text-green-400' : traffic.text.includes('잠깐') ? 'text-red-400' : 'text-yellow-400'}`}>
                                            {traffic.text}
                                        </h3>
                                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                            {traffic.desc}
                                        </p>
                                        {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-sm text-gray-400">
                                                <TrendingUp className="w-4 h-4" />
                                                <span>역대 최저가:</span>
                                                <span className="font-bold text-white underline">{game.lowestPrice.toLocaleString()}원</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-end gap-4 mb-4 border-b border-white/10 pb-8">
                                <div><span className="text-6xl font-black text-white tracking-tighter drop-shadow-xl">{game.currentPrice.toLocaleString()}<span className="text-2xl font-medium text-gray-400 ml-1">원</span></span></div>
                                {game.discountRate > 0 && (
                                    <div className="flex flex-col mb-2 animate-bounce-slow">
                                        <span className="text-gray-400 line-through text-lg font-medium">{game.originalPrice.toLocaleString()}원</span>
                                        <span className="bg-ps-blue text-white px-3 py-1 rounded-lg font-black text-lg text-center shadow-lg transform -rotate-2">-{game.discountRate}%</span>
                                    </div>
                                )}
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
                        <div className="lg:col-span-2 space-y-8">
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
                                {game.metaScore > 0 && <div className="flex items-center justify-between mb-4"><span className="font-bold text-gray-300 flex items-center gap-2">Ⓜ️ Metascore</span><span className={`px-4 py-1.5 rounded-lg font-black text-lg ${game.metaScore >= 80 ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}>{game.metaScore}</span></div>}
                                {game.userScore > 0 && <div className="flex items-center justify-between"><span className="font-bold text-gray-300 flex items-center gap-2">👤 User Score</span><span className={`px-4 py-1.5 rounded-lg font-black text-lg ${game.userScore >= 70 ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'}`}>{Number(game.userScore).toFixed(1)}</span></div>}
                            </div>

                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-white/10 text-center shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                                <Coffee className="w-10 h-10 text-yellow-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold text-white mb-2 text-lg">개발자에게 커피 쏘기 ☕</h4>
                                <p className="text-xs text-gray-400 mb-6 leading-relaxed">이 서비스가 마음에 드셨나요?<br/>작은 후원이 서버 유지와<br/>새로운 기능 개발에 큰 힘이 됩니다!</p>
                                <button onClick={() => toast('마음만 감사히 받겠습니다! 💖 (준비중)', { icon: '☕', style: { borderRadius: '10px', background: '#333', color: '#fff' } })} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95">
                                    후원하기 (준비중)
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
        </div>
    );
}