import React, { useEffect, useState } from 'react';
import { X as XIcon, Circle, Square, Triangle, X, Sparkles, TrendingUp } from 'lucide-react';
import { useCompareStore } from '../store/useCompareStore';
import PSGameImage from './common/PSGameImage';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { useLocation } from 'react-router-dom';

export default function CompareModal({ isOpen, onClose }) {
    const { compareList } = useCompareStore();
    const [animateIn, setAnimateIn] = useState(false);

    const navigate = useTransitionNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => setAnimateIn(true), 50);
        } else {
            document.body.style.overflow = 'unset';
            setAnimateIn(false);
        }
    }, [isOpen]);

    if (!isOpen || compareList.length !== 2) return null;

    const [gameA, gameB] = compareList;

    const getCritic = (g) => {
        if (g.mcMetaScore > 0) return { val: g.mcMetaScore, calcVal: g.mcMetaScore, src: 'M', bg: 'bg-black dark:bg-white text-white dark:text-black border border-divider shadow-sm' };
        if (g.igdbCriticScore > 0) return { val: g.igdbCriticScore, calcVal: g.igdbCriticScore, src: 'IGDB', bg: 'bg-[var(--bento-purple-from)] text-purple-700 dark:text-purple-300 border border-[color:var(--bento-purple-border)] shadow-sm' };
        return { val: null, calcVal: null, src: null };
    };

    const getUser = (g) => {
        if (g.mcUserScore > 0) return { val: g.mcUserScore, calcVal: g.mcUserScore * 10, src: 'M', bg: 'bg-black dark:bg-white text-white dark:text-black border border-divider shadow-sm' };
        if (g.igdbUserScore > 0) return { val: g.igdbUserScore, calcVal: g.igdbUserScore, src: 'IGDB', bg: 'bg-[var(--bento-purple-from)] text-purple-700 dark:text-purple-300 border border-[color:var(--bento-purple-border)] shadow-sm' };
        return { val: null, calcVal: null, src: null };
    };

    const criticA = getCritic(gameA);
    const criticB = getCritic(gameB);
    const userA = getUser(gameA);
    const userB = getUser(gameB);

    const calcWinner = (valA, valB, isLowerBetter = false) => {
        if (!valA || !valB) return null;
        if (valA === valB) return 'TIE';
        if (isLowerBetter) return valA < valB ? 'A' : 'B';
        return valA > valB ? 'A' : 'B';
    };

    const winners = {
        price: calcWinner(gameA.currentPrice, gameB.currentPrice, true),
        meta: calcWinner(criticA.calcVal, criticB.calcVal),
        userVote: calcWinner(userA.calcVal, userB.calcVal)
    };

    const getVerdictText = () => {
        let scoreA = 0;
        let scoreB = 0;

        if (winners.price === 'A') scoreA++; else if (winners.price === 'B') scoreB++;
        if (winners.meta === 'A') scoreA++; else if (winners.meta === 'B') scoreB++;
        if (winners.userVote === 'A') scoreA++; else if (winners.userVote === 'B') scoreB++;

        const isALowest = gameA.discountRate > 0 && gameA.lowestPrice > 0 && gameA.currentPrice <= gameA.lowestPrice;
        const isBLowest = gameB.discountRate > 0 && gameB.lowestPrice > 0 && gameB.currentPrice <= gameB.lowestPrice;

        if (isALowest && isBLowest) {
            const priceText = gameA.currentPrice === gameB.currentPrice
                ? "가격이 동일하므로"
                : `예산 차이(${Math.min(gameA.currentPrice, gameB.currentPrice).toLocaleString()}원 vs ${Math.max(gameA.currentPrice, gameB.currentPrice).toLocaleString()}원)와`;

            return (
                <>
                    <span className="text-green-500 font-black drop-shadow-md">양쪽 모두 역대 최저가</span>를 달성한 엄청난 타이밍입니다!
                    {priceText} 장르를 고려하여 기분 좋게 선택하세요.
                </>
            );
        }

        if (scoreA > scoreB) {
            return <><span className="text-blue-500 font-black underline decoration-blue-500/50 decoration-2 underline-offset-4 drop-shadow-md">좌측 게임({gameA.title || gameA.name})</span>이(가) 스펙 지표에서 종합적으로 우세합니다.</>;
        } else if (scoreB > scoreA) {
            return <><span className="text-rose-500 font-black underline decoration-rose-500/50 decoration-2 underline-offset-4 drop-shadow-md">우측 게임({gameB.title || gameB.name})</span>이(가) 스펙 지표에서 종합적으로 우세합니다.</>;
        }

        if (isALowest && !isBLowest) return <><span className="text-blue-500 font-black underline decoration-blue-500/50 decoration-2 underline-offset-4 drop-shadow-md">좌측 게임</span>만 역대 최저가를 달성하여 현재 구매 타이밍이 더 훌륭합니다.</>;
        if (isBLowest && !isALowest) return <><span className="text-rose-500 font-black underline decoration-rose-500/50 decoration-2 underline-offset-4 drop-shadow-md">우측 게임</span>만 역대 최저가를 달성하여 현재 구매 타이밍이 더 훌륭합니다.</>;

        return <>양쪽 모두 장단점이 비등합니다. <span className="text-green-500 font-bold">할인율</span>과 <span className="text-purple-500 font-bold">평가 출처</span>를 고려하여 취향에 맞게 선택하세요.</>;
    };

    // 💡 3번 버그 해결: 텐션 바 내부 비율 계산용 calcA, calcB 프롭스 추가
    const TensionBar = ({ label, valA, valB, calcA, calcB, winner, isLowerBetter = false, psIcon, srcA, srcB, gameAData, gameBData }) => {
        let ratioA = 50, ratioB = 50;
        const hasMissingData = !valA || !valB;

        const formatVal = (val) => {
            if (typeof val !== 'number') return val;
            return Number.isInteger(val) ? val : val.toFixed(1);
        };

        if (!hasMissingData && valA !== valB) {
            const activeCalcA = calcA !== undefined ? calcA : valA;
            const activeCalcB = calcB !== undefined ? calcB : valB;

            if (isLowerBetter) {
                const total = activeCalcA + activeCalcB;
                ratioA = (activeCalcB / total) * 100;
                ratioB = (activeCalcA / total) * 100;
            } else {
                const total = activeCalcA + activeCalcB;
                ratioA = (activeCalcA / total) * 100;
                ratioB = (activeCalcB / total) * 100;
            }
        }

        const renderPriceBadges = (game) => {
            if (!game) return null;
            const isLowest = game.discountRate > 0 && game.lowestPrice > 0 && game.currentPrice <= game.lowestPrice;
            return (
                <div className="flex items-center gap-1.5 mt-1">
                    {game.discountRate > 0 && (
                        <span className="text-[10px] font-black text-white bg-ps-blue px-1.5 py-0.5 rounded shadow-sm transform -rotate-2">
                            -{game.discountRate}%
                        </span>
                    )}
                    {isLowest && (
                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
                            <TrendingUp className="w-3 h-3" /> 최저가
                        </span>
                    )}
                </div>
            );
        };

        return (
            <div className="mb-10">
                <h4 className="text-center text-xs sm:text-sm font-black text-primary mb-5 uppercase tracking-widest drop-shadow-md flex items-center justify-center gap-2">
                    <span className="w-4 h-[1px] bg-divider-strong"></span>
                    {label}
                    <span className="w-4 h-[1px] bg-divider-strong"></span>
                </h4>

                <div className="flex items-start justify-between px-2 sm:px-6 mb-3">
                    <div className={`flex flex-col items-start transition-all duration-700 ${winner === 'A' ? 'scale-110 drop-shadow-md z-10' : 'scale-95'}`}>
                        <div className="flex items-center gap-2">
                            {winner === 'A' && psIcon}
                            <span className={`font-black text-xl sm:text-3xl tracking-tight ${winner === 'A' ? 'text-primary' : (!valA ? 'text-muted' : 'text-secondary')}`}>
                                {valA ? (isLowerBetter ? `${valA.toLocaleString()}원` : formatVal(valA)) : '-'}
                            </span>
                            {srcA && <span className={`text-[9px] px-1.5 py-0.5 font-black rounded ${srcA.bg}`}>{srcA.src}</span>}
                        </div>
                        {isLowerBetter && renderPriceBadges(gameAData)}
                    </div>

                    <div className={`flex flex-col items-end transition-all duration-700 ${winner === 'B' ? 'scale-110 drop-shadow-md z-10' : 'scale-95'}`}>
                        <div className="flex items-center gap-2">
                            {srcB && <span className={`text-[9px] px-1.5 py-0.5 font-black rounded ${srcB.bg}`}>{srcB.src}</span>}
                            <span className={`font-black text-xl sm:text-3xl tracking-tight ${winner === 'B' ? 'text-primary' : (!valB ? 'text-muted' : 'text-secondary')}`}>
                                {valB ? (isLowerBetter ? `${valB.toLocaleString()}원` : formatVal(valB)) : '-'}
                            </span>
                            {winner === 'B' && psIcon}
                        </div>
                        {isLowerBetter && renderPriceBadges(gameBData)}
                    </div>
                </div>

                {hasMissingData ? (
                    <div className="relative h-4 sm:h-5 w-full bg-surface/40 rounded-lg border-2 border-dashed border-divider mx-auto max-w-[90%] flex items-center justify-center shadow-inner">
                        <span className="text-[10px] font-bold text-muted tracking-widest">데이터 부족 (비교 불가)</span>
                    </div>
                ) : (
                    <div className="relative h-3 sm:h-4 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner mx-auto max-w-[90%]">
                        <div className="absolute inset-0 flex transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]">
                            <div className="h-full bg-gradient-to-r from-blue-800 to-blue-500 transition-all duration-1000 relative" style={{ width: `${ratioA}%` }}>
                                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/40 blur-[2px]"></div>
                            </div>
                            <div className="h-full bg-gradient-to-l from-rose-800 to-rose-500 transition-all duration-1000 relative" style={{ width: `${ratioB}%` }}>
                                <div className="absolute left-0 top-0 bottom-0 w-4 bg-white/40 blur-[2px]"></div>
                            </div>
                        </div>
                        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white -translate-x-1/2 z-10 shadow-[0_0_8px_rgba(255,255,255,0.9)]"></div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-6 md:p-10">
            <div className={`absolute inset-0 bg-backdrop/90 backdrop-blur-xl transition-opacity duration-500 ${animateIn ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>

            <div className={`relative w-full h-full sm:h-auto max-w-5xl bg-base border-x-0 sm:border border-divider sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${animateIn ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>

                <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 sm:top-6 flex flex-col items-center">
                        <span className="text-3xl sm:text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">V S</span>
                        <div className="w-1 h-8 sm:h-12 bg-gradient-to-b from-white to-transparent mt-2 opacity-30"></div>
                    </div>
                    <div className="w-full flex justify-end pointer-events-auto">
                        <button onClick={onClose} className="p-2 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors border border-white/20 backdrop-blur-md shadow-lg">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="relative w-full h-48 sm:h-64 flex overflow-hidden bg-black shrink-0">
                    <div className={`w-1/2 h-full relative transition-transform duration-1000 ease-[cubic-bezier(0.2,1.2,0.3,1)] ${animateIn ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-transparent z-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-20"></div>
                        <PSGameImage src={gameA.imageUrl} className="w-full h-full object-cover object-top opacity-60" />
                        <div className="absolute bottom-4 left-4 right-6 z-30">
                            <h2 className="text-base sm:text-2xl font-black text-white leading-tight break-keep drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-2 max-w-[85%]">{gameA.title || gameA.name}</h2>
                        </div>
                    </div>

                    <div className={`w-1/2 h-full relative transition-transform duration-1000 ease-[cubic-bezier(0.2,1.2,0.3,1)] ${animateIn ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="absolute inset-0 bg-gradient-to-l from-rose-900/60 to-transparent z-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-20"></div>
                        <PSGameImage src={gameB.imageUrl} className="w-full h-full object-cover object-top opacity-60" />
                        <div className="absolute bottom-4 left-6 right-4 z-30 flex justify-end">
                            <h2 className="text-base sm:text-2xl font-black text-white leading-tight break-keep drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-2 text-right max-w-[85%]">{gameB.title || gameB.name}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-surface/90 backdrop-blur-2xl custom-scrollbar relative z-30 border-t border-divider">
                    <TensionBar label="현재 결제가 (최저가)" valA={gameA.currentPrice} valB={gameB.currentPrice} winner={winners.price} isLowerBetter={true} gameAData={gameA} gameBData={gameB} psIcon={<Triangle className="w-5 h-5 sm:w-6 sm:h-6 text-[#00A39D] stroke-[3px] animate-[bounce_1s_infinite_-0.3s] drop-shadow-[0_0_8px_rgba(0,163,157,0.5)]" />} />
                    <TensionBar label="전문가 평점 (MC/IGDB)" valA={criticA.val} valB={criticB.val} calcA={criticA.calcVal} calcB={criticB.calcVal} srcA={criticA} srcB={criticB} winner={winners.meta} psIcon={<Circle className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF3E3E] stroke-[3px] animate-[bounce_1s_infinite_-0.15s] drop-shadow-[0_0_8px_rgba(255,62,62,0.5)]" />} />
                    <TensionBar label="유저 평점 (MC/IGDB)" valA={userA.val} valB={userB.val} calcA={userA.calcVal} calcB={userB.calcVal} srcA={userA} srcB={userB} winner={winners.userVote} psIcon={<X className="w-5 h-5 sm:w-6 sm:h-6 text-[#4E6CBB] stroke-[4px] animate-[bounce_1s_infinite_0s] drop-shadow-[0_0_8px_rgba(78,108,187,0.5)]" />} />
                </div>

                <div className="p-4 sm:p-6 bg-surface border-t border-divider shrink-0 z-40 relative backdrop-blur-xl">
                    <Square className="absolute top-4 right-6 w-12 h-12 text-[#E8789C] stroke-[2px] opacity-10 animate-[spin_10s_linear_infinite]" />

                    <div className="text-center text-xs sm:text-sm text-secondary font-bold mb-5 leading-relaxed bg-base/50 p-3 rounded-xl border border-divider-strong inline-block w-full shadow-inner">
                        <Sparkles className="w-4 h-4 text-yellow-500 inline-block mr-1.5 -mt-1 animate-pulse" />
                        {getVerdictText()}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => { onClose(); setTimeout(() => navigate(`/games/${gameA.gameId || gameA.id}`, { state: { background: location } }), 300); }} className="flex-1 py-3.5 bg-base border border-divider hover:border-blue-500/50 rounded-xl font-black text-sm text-primary transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group">
                            <span className="group-hover:text-blue-400 transition-colors">{gameA.title || gameA.name}</span> 보기
                        </button>
                        <button onClick={() => { onClose(); setTimeout(() => navigate(`/games/${gameB.gameId || gameB.id}`, { state: { background: location } }), 300); }} className="flex-1 py-3.5 bg-base border border-divider hover:border-rose-500/50 rounded-xl font-black text-sm text-primary transition-all hover:shadow-[0_0_20px_rgba(225,29,72,0.15)] group">
                            <span className="group-hover:text-rose-400 transition-colors">{gameB.title || gameB.name}</span> 보기
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}