import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import PriceChart from '../components/PriceChart';
import { differenceInDays, parseISO } from 'date-fns';

// 장르 -> 이모지 변환
const getGenreEmoji = (genreName) => {
    const name = genreName.toLowerCase();
    if (name.includes('action')) return '⚔️';
    if (name.includes('rpg')) return '🛡️';
    if (name.includes('adventure')) return '🗺️';
    if (name.includes('shooter') || name.includes('fps')) return '🔫';
    if (name.includes('sport')) return '⚽';
    if (name.includes('racing')) return '🏎️';
    if (name.includes('horror')) return '👻';
    if (name.includes('strategy')) return '🧠';
    return '🎮';
};

// 판정 결과 -> 스타일 변환
const getVerdictStyle = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW': return { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', icon: '🔥' };
        case 'GOOD_OFFER': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: '🤔' };
        case 'WAIT': return { bg: 'bg-gray-500/10', border: 'border-gray-500/40', text: 'text-gray-400', icon: '✋' };
        case 'TRACKING': return { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', icon: '🕵️' };
        default: return { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-300', icon: '❓' };
    }
};

export default function GameDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);

    // [New] 상세 페이지 내부 찜 상태 관리
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await client.get(`/api/v1/games/${id}`);
                setGame(res.data);

                if (res.data.liked !== undefined) {
                    setIsLiked(res.data.liked);
                }
            } catch (err) {
                console.error(err);
                toast.error("게임 정보를 불러오지 못했어요.");
                navigate('/games');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, navigate]);

    // [New] 찜하기 핸들러
    const handleLike = async () => {
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${id}`);
            const message = response.data; // "찜 목록에 추가되었습니다." or "삭제되었습니다."

            const added = message.includes("추가");
            setIsLiked(added);

            toast.success(message, { id: toastId, icon: added ? '❤️' : '💔' });
        } catch (error) {
            console.error(error);
            toast.error("요청 실패", { id: toastId });
        }
    };

    if (loading) return <div className="min-h-screen bg-ps-black text-white flex justify-center items-center">Loading...</div>;
    if (!game) return null;

    const verdictStyle = getVerdictStyle(game.priceVerdict);
    const isNew = game.createdAt && differenceInDays(new Date(), parseISO(game.createdAt)) <= 3;
    const isClosingSoon = game.saleEndDate && differenceInDays(parseISO(game.saleEndDate), new Date()) <= 3;

    return (
        <div className="min-h-screen bg-ps-black text-white p-6 md:p-10 pb-20">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors text-sm font-bold"
                >
                    ← Back to List
                </button>

                <div className="flex flex-col md:flex-row gap-10">
                    <div className="w-full md:w-1/3">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
                            <img src={game.imageUrl} alt={game.title} className="w-full object-cover aspect-[3/4]" />
                            {isNew && <span className="absolute top-2 right-2 bg-green-500 text-black text-xs font-black px-2 py-1 rounded shadow-lg z-10">NEW</span>}
                            {isClosingSoon && <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse">🚨 마감 임박</div>}
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {game.genres.map(g => (
                                <span key={g} className="bg-white/10 px-2 py-1 rounded text-xs font-bold text-gray-300 flex items-center gap-1">
                                    {getGenreEmoji(g)} {g}
                                </span>
                            ))}
                            {game.platforms.map(p => (
                                <span key={p} className="bg-ps-blue/20 text-ps-blue border border-ps-blue/30 px-2 py-1 rounded text-xs font-bold">
                                    {p}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl font-black mb-2 leading-tight">{game.title}</h1>
                        <p className="text-gray-400 text-sm mb-6">{game.publisher}</p>

                        <div className={`p-5 rounded-xl border ${verdictStyle.bg} ${verdictStyle.border} mb-8`}>
                            <div className={`text-lg font-bold ${verdictStyle.text} flex items-center gap-2`}>
                                <span className="text-2xl">{verdictStyle.icon}</span>
                                {game.verdictMessage}
                            </div>
                            {game.lowestPrice > 0 && game.priceVerdict !== 'TRACKING' && (
                                <div className="text-xs text-gray-400 mt-2 pl-9">
                                    👉 역대 최저가: <span className="text-gray-200 font-bold">{game.lowestPrice.toLocaleString()}원</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-end gap-4 mb-2 border-b border-white/10 pb-8">
                            <div>
                                <span className="text-5xl font-black text-white tracking-tighter">
                                    {game.currentPrice.toLocaleString()}<span className="text-2xl font-medium text-gray-400">원</span>
                                </span>
                            </div>
                            {game.discountRate > 0 && (
                                <div className="flex flex-col mb-1">
                                    <span className="text-gray-500 line-through text-sm">
                                        {game.originalPrice.toLocaleString()}원
                                    </span>
                                    <span className="bg-ps-blue text-white px-2 py-0.5 rounded font-bold text-sm text-center">
                                        -{game.discountRate}%
                                    </span>
                                </div>
                            )}
                        </div>

                        {game.saleEndDate && game.discountRate > 0 && (
                            <div className="flex items-center gap-2 mb-8 text-sm">
                                <span className="text-gray-400">📅 할인 종료:</span>
                                <span className="text-white font-bold">
                                    {game.saleEndDate.replace(/-/g, '.')}
                                </span>
                                {(() => {
                                    const daysLeft = differenceInDays(parseISO(game.saleEndDate), new Date());
                                    if (daysLeft < 0) return <span className="text-gray-500">(종료됨)</span>;
                                    if (daysLeft === 0) return <span className="text-red-500 font-bold animate-pulse">(오늘 마감!)</span>;
                                    if (daysLeft <= 3) return <span className="text-red-400 font-bold">({daysLeft}일 남음)</span>;
                                    return <span className="text-gray-400">({daysLeft}일 남음)</span>;
                                })()}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <a
                                href={`https://store.playstation.com/ko-kr/product/${game.psStoreId || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-white text-black hover:bg-gray-200 py-4 rounded-full font-black text-center transition-colors shadow-lg"
                            >
                                PS Store에서 보기
                            </a>

                            {/* [Updated] 찜하기 버튼 이벤트 연결 */}
                            <button
                                onClick={handleLike}
                                className={`px-6 rounded-full border transition-colors font-bold text-white flex items-center gap-2 ${isLiked ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-white/20 hover:bg-white/10'}`}
                            >
                                {isLiked ? '❤️ 찜 완료' : '🤍 찜하기'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
                    <div className="lg:col-span-2">
                        <PriceChart historyData={game.priceHistory} />
                    </div>
                    <div className="bg-ps-card p-6 rounded-xl border border-white/5 mt-8 h-fit">
                        <h3 className="text-lg font-bold text-white mb-4">게임 정보</h3>

                        {/* 게임 설명 부분 외부 검색으로 대체 */}
                        {(() => {
                            // DB에 박힌 임시값 혹은 null 체크
                            const hasValidDescription = game.description &&
                                game.description !== "Full Data Crawler" &&
                                game.description.trim() !== "";

                            if (hasValidDescription) {
                                // 1. 유효한 설명이 있으면 그대로 출력
                                return (
                                    <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                                        {game.description}
                                    </p>
                                );
                            } else {
                                // 2. 설명이 없으면 '외부 링크' 제공 (위기를 기회로!)
                                return (
                                    <div className="flex flex-col gap-3">
                                        <p className="text-gray-500 text-sm mb-2">
                                            상세 설명이 제공되지 않는 게임입니다.<br/>
                                            플레이 영상이나 정보를 직접 확인해보세요! 👇
                                        </p>
                                        <div className="flex gap-2">
                                            {/* 유튜브 검색 링크 (새창) */}
                                            <a
                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' gameplay')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-red-500 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                                            >
                                                📺 유튜브 검색
                                            </a>
                                            {/* 구글 검색 링크 (새창) */}
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent(game.title)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/50 text-blue-500 text-sm font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                                            >
                                                🔍 구글 검색
                                            </a>
                                        </div>
                                    </div>
                                );
                            }
                        })()}

                        {/* 1. 메타크리틱 스코어 (전문가) */}
                        {game.metaScore > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                                <span className="font-bold text-gray-300">Metacritic Score</span>
                                <span className={`px-3 py-1 rounded font-black ${game.metaScore >= 80 ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}>
                                    {game.metaScore}
                                </span>
                            </div>
                        )}

                        {/* [New] 2. 유저 스코어 (게이머) */}
                        {game.userScore > 0 && (
                            <div className="mt-3 flex items-center justify-between">
                                <span className="font-bold text-gray-300 flex items-center gap-2">
                                    👤 User Score
                                </span>
                                {/* 유저 점수는 보통 10점 만점 */}
                                <span className={`px-3 py-1 rounded font-black ${game.userScore >= 70 ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'}`}>
                                    {Number(game.userScore).toFixed(1)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}