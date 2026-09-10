import React, { useEffect, useState } from 'react';
import {
    Banknote,
    Hourglass,
    Swords,
    Trophy,
    Users,
    X,
    ChevronRight,
    Scale
} from 'lucide-react';
import { useCompareStore } from '../store/useCompareStore';
import PSGameImage from './common/PSGameImage';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { useLocation } from 'react-router-dom';

// 게임 타이틀 전처리 로직 (언어 괄호 및 플랫폼 접미사 제거)
function cleanTitle(title) {
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

export default function CompareModal({ isOpen, onClose }) {
    const { compareList } = useCompareStore();
    const [animateIn, setAnimateIn] = useState(false);

    const navigate = useTransitionNavigate();
    const location = useLocation();

    // 키보드 ESC 키 닫기 이벤트 리스너 (UI 텍스트 없이 백그라운드 지원)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // 배경 스크롤 락 및 진입 트랜지션
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            const timerIn = setTimeout(() => setAnimateIn(true), 30);
            return () => clearTimeout(timerIn);
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
            setAnimateIn(false);
        }
    }, [isOpen]);

    if (!isOpen || compareList.length !== 2) return null;

    const [gameA, gameB] = compareList;
    const titleA = cleanTitle(gameA.title || gameA.name);
    const titleB = cleanTitle(gameB.title || gameB.name);

    // --- 점수 추출 유틸리티 (0점이나 부재값은 null 처리) ---
    const getCritic = (g) => {
        if (g.mcMetaScore && g.mcMetaScore > 0) {
            return { val: g.mcMetaScore, scale: 100, src: 'MC', badge: g.mcMetaScore >= 90 ? 'MUST-PLAY' : g.mcMetaScore >= 75 ? 'GREAT' : null };
        }
        if (g.igdbCriticScore && g.igdbCriticScore > 0) {
            return { val: Math.round(g.igdbCriticScore), scale: 100, src: 'IGDB', badge: g.igdbCriticScore >= 85 ? 'HIGH' : null };
        }
        return { val: null, scale: null, src: null, badge: null };
    };

    const getUser = (g) => {
        if (g.mcUserScore && g.mcUserScore > 0) {
            return { val: Number(g.mcUserScore.toFixed(1)), calcVal: g.mcUserScore * 10, scale: 10, src: 'MC' };
        }
        if (g.igdbUserScore && g.igdbUserScore > 0) {
            return { val: Math.round(g.igdbUserScore), calcVal: g.igdbUserScore, scale: 100, src: 'IGDB' };
        }
        return { val: null, calcVal: null, scale: null, src: null };
    };

    const criticA = getCritic(gameA);
    const criticB = getCritic(gameB);
    const userA = getUser(gameA);
    const userB = getUser(gameB);

    // --- 기본 승패 판정 (단순 크기 비교) ---
    const calcWinner = (valA, valB, isLowerBetter = false) => {
        if (valA == null || valB == null || valA <= 0 || valB <= 0) return null;
        if (valA === valB) return 'TIE';
        if (isLowerBetter) return valA < valB ? 'A' : 'B';
        return valA > valB ? 'A' : 'B';
    };

    const priceA = (gameA.currentPrice != null && gameA.currentPrice > 0) ? gameA.currentPrice : ((gameA.price != null && gameA.price > 0) ? gameA.price : null);
    const priceB = (gameB.currentPrice != null && gameB.currentPrice > 0) ? gameB.currentPrice : ((gameB.price != null && gameB.price > 0) ? gameB.price : null);

    const hltbA = (gameA.hltbMainStory && gameA.hltbMainStory > 0) ? gameA.hltbMainStory : null;
    const hltbB = (gameB.hltbMainStory && gameB.hltbMainStory > 0) ? gameB.hltbMainStory : null;

    const pricePerHrA = (hltbA && priceA) ? Math.round(priceA / hltbA) : null;
    const pricePerHrB = (hltbB && priceB) ? Math.round(priceB / hltbB) : null;

    const winners = {
        price: calcWinner(priceA, priceB, true),
        meta: calcWinner(criticA.val, criticB.val),
        userVote: calcWinner(userA.calcVal, userB.calcVal),
        volume: calcWinner(hltbA, hltbB)
    };

    // 최저가 판정
    const isALowest = gameA.discountRate > 0 && gameA.lowestPrice > 0 && priceA <= gameA.lowestPrice;
    const isBLowest = gameB.discountRate > 0 && gameB.lowestPrice > 0 && priceB <= gameB.lowestPrice;

    // 카탈로그 구독 포함 여부
    const isACatalog = Boolean(gameA.inCatalog);
    const isBCatalog = Boolean(gameB.inCatalog);

    // 미출시/데이터부족 여부
    const isBUnreleased = !criticB.val && !userB.val && !hltbB;
    const isAUnreleased = !criticA.val && !userA.val && !hltbA;

    // =========================================================================
    // 🎯 4대 지표 정밀 평가 엔진 (게이머 실구매 관점 다각도 분석)
    // =========================================================================
    const getVerdictText = () => {
        const validMetrics = [winners.price, winners.meta, winners.userVote, winners.volume].filter(Boolean);
        if (validMetrics.length === 0) {
            return '현재 비교 가능한 세부 지표 데이터가 집계되지 않았습니다.';
        }

        // [우선순위 1] 한쪽이 미출시/데이터 미집계 타이틀인 경우
        if (isBUnreleased && !isAUnreleased) {
            return (
                <>
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>는 검증된 평가와 함께 
                    {isALowest ? ' 현재 역대 최저가 세일 중입니다.' : ' 즉시 플레이 가능한 명작입니다.'} 
                    {' '}<span className="text-secondary font-medium">({titleB}는 아직 세부 지표 집계 대기작)</span>
                </>
            );
        }
        if (isAUnreleased && !isBUnreleased) {
            return (
                <>
                    <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>는 검증된 평가와 함께 
                    {isBLowest ? ' 현재 역대 최저가 세일 중입니다.' : ' 즉시 플레이 가능한 명작입니다.'} 
                    {' '}<span className="text-secondary font-medium">({titleA}는 아직 세부 지표 집계 대기작)</span>
                </>
            );
        }

        // [우선순위 2] PS Plus 게임 카탈로그 포함작 혜택 안내 (무료 플레이 가능 여부)
        if (isACatalog && !isBCatalog) {
            return (
                <>
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>는 <span className="text-amber-500 font-bold">PS Plus 게임 카탈로그</span> 등록작입니다. 스페셜/디럭스 구독자라면 추가 결제 없이 무료로 플레이 가능합니다.
                </>
            );
        }
        if (isBCatalog && !isACatalog) {
            return (
                <>
                    <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>는 <span className="text-amber-500 font-bold">PS Plus 게임 카탈로그</span> 등록작입니다. 스페셜/디럭스 구독자라면 추가 결제 없이 무료로 플레이 가능합니다.
                </>
            );
        }
        if (isACatalog && isBCatalog) {
            return (
                <>
                    두 작품 모두 <span className="text-amber-500 font-bold">PS Plus 카탈로그</span> 포함작으로, 구독자라면 비용 부담 없이 취향에 맞춰 자유롭게 즐길 수 있습니다.
                </>
            );
        }

        // --- 지표별 유의미한 격차(Significance Delta) 계산 ---
        const priceDiff = (priceA && priceB) ? Math.abs(priceA - priceB) : 0;
        const isPriceSig = priceDiff >= 3000;
        const isPriceBig = priceDiff >= 15000;

        const metaDiff = (criticA.val && criticB.val) ? Math.abs(criticA.val - criticB.val) : 0;
        const isMetaSig = metaDiff >= 3;
        const isMetaBig = metaDiff >= 8;

        const userDiff = (userA.val && userB.val) ? Math.abs(userA.val - userB.val) : 0;
        const isUserSig = userDiff >= 0.5;

        const volumeRatio = (hltbA && hltbB) ? (Math.max(hltbA, hltbB) / Math.min(hltbA, hltbB)) : 1;
        const isVolumeSig = volumeRatio >= 1.3;

        // --- 퀄리티(작품성) 축 vs 경제성(가성비) 축 점수화 ---
        let qualityScoreA = 0, qualityScoreB = 0;
        if (isMetaSig) {
            if (criticA.val > criticB.val) qualityScoreA += isMetaBig ? 2 : 1;
            else qualityScoreB += isMetaBig ? 2 : 1;
        }
        if (isUserSig) {
            if (userA.val > userB.val) qualityScoreA += 1;
            else qualityScoreB += 1;
        }

        let valueScoreA = 0, valueScoreB = 0;
        if (isPriceSig) {
            if (priceA < priceB) valueScoreA += isPriceBig ? 2 : 1;
            else valueScoreB += isPriceBig ? 2 : 1;
        }
        if (isALowest && !isBLowest) valueScoreA += 1;
        if (isBLowest && !isALowest) valueScoreB += 1;
        if (isVolumeSig) {
            if (hltbA > hltbB) valueScoreA += 1;
            else valueScoreB += 1;
        }

        // [우선순위 3] 두 타이틀 모두 비평가 점수 80점 이상 수작인데, 한쪽만 '역대 최저가' 세일 중
        const isBothGreat = (criticA.val >= 80 || !criticA.val) && (criticB.val >= 80 || !criticB.val);
        if (isBothGreat && isALowest && !isBLowest) {
            return (
                <>
                    두 작품 모두 완성도가 높으나, 현재 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>가 역대 최저가에 도달하여 타이밍상 가장 합리적인 선택입니다.
                </>
            );
        }
        if (isBothGreat && isBLowest && !isALowest) {
            return (
                <>
                    두 작품 모두 완성도가 높으나, 현재 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>가 역대 최저가에 도달하여 타이밍상 가장 합리적인 선택입니다.
                </>
            );
        }

        // [우선순위 4] 두 타이틀 모두 '역대 최저가' 도달
        if (isALowest && isBLowest) {
            return (
                <>
                    두 타이틀 모두 <span className="text-emerald-600 dark:text-emerald-400 font-bold">역대 최저가</span> 도달 상태입니다. 
                    {hltbA && hltbB ? ` 볼륨(${Math.round(hltbA)}h vs ${Math.round(hltbB)}h)과 장르 취향에 맞춰 선택하세요.` : ' 취향에 맞춰 선택해 보세요.'}
                </>
            );
        }

        // [우선순위 5] 시간당 체감 비용 역전 (단순 가격은 비싸지만 볼륨으로 가성비 압승)
        if (pricePerHrA && pricePerHrB && Math.max(pricePerHrA, pricePerHrB) / Math.min(pricePerHrA, pricePerHrB) >= 1.8) {
            if (pricePerHrA < pricePerHrB && priceA >= priceB) {
                return (
                    <>
                        단순 결제가는 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>가 낮지만, 플레이타임 대비 시간당 비용은 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>(시간당 ~{pricePerHrA.toLocaleString()}원)가 훨씬 경제적입니다.
                    </>
                );
            }
            if (pricePerHrB < pricePerHrA && priceB >= priceA) {
                return (
                    <>
                        단순 결제가는 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>가 낮지만, 플레이타임 대비 시간당 비용은 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>(시간당 ~{pricePerHrB.toLocaleString()}원)가 훨씬 경제적입니다.
                    </>
                );
            }
        }

        // [우선순위 6] 작품성(퀄리티) vs 가성비(가격/볼륨)의 확실한 트레이드오프
        if (qualityScoreA >= 2 && valueScoreB >= 2) {
            return (
                <>
                    작품성과 몰입도를 원하신다면 평점이 높은 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>, 부담 없는 가격과 긴 플레이타임을 원하신다면 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>를 추천합니다.
                </>
            );
        }
        if (qualityScoreB >= 2 && valueScoreA >= 2) {
            return (
                <>
                    작품성과 몰입도를 원하신다면 평점이 높은 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>, 부담 없는 가격과 긴 플레이타임을 원하신다면 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>를 추천합니다.
                </>
            );
        }

        // [우선순위 7] 유저 평점의 뚜렷한 지지 (평론가 점수는 비등하나 실제 유저 만족도 격차)
        if (!isMetaSig && isUserSig) {
            if (userA.val > userB.val) {
                return (
                    <>
                        전문가 평가는 비등하나, 실제 플레이 유저 평점에서는 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>(★{userA.val})가 더 높은 만족도를 얻고 있습니다.
                    </>
                );
            }
            if (userB.val > userA.val) {
                return (
                    <>
                        전문가 평가는 비등하나, 실제 플레이 유저 평점에서는 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>(★{userB.val})가 더 높은 만족도를 얻고 있습니다.
                    </>
                );
            }
        }

        // [우선순위 8] 한쪽의 전방위적 우세 (퀄리티 + 가성비 모두 앞섬)
        if (qualityScoreA >= 1 && valueScoreA >= 2) {
            return (
                <>
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>가 높은 평가와 함께 가격 경쟁력까지 갖추어 전반적인 만족도가 더 높을 것으로 기대됩니다.
                </>
            );
        }
        if (qualityScoreB >= 1 && valueScoreB >= 2) {
            return (
                <>
                    <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>가 높은 평가와 함께 가격 경쟁력까지 갖추어 전반적인 만족도가 더 높을 것으로 기대됩니다.
                </>
            );
        }

        // [우선순위 9] 단순 점수 총합 우세
        const totalA = qualityScoreA + valueScoreA;
        const totalB = qualityScoreB + valueScoreB;
        if (totalA > totalB) {
            return (
                <>
                    종합 스펙 지표에서 <span className="text-cyan-600 dark:text-cyan-300 font-bold">{titleA}</span>가 더 우세한 밸런스를 보여주고 있습니다.
                </>
            );
        }
        if (totalB > totalA) {
            return (
                <>
                    종합 스펙 지표에서 <span className="text-rose-600 dark:text-rose-300 font-bold">{titleB}</span>가 더 우세한 밸런스를 보여주고 있습니다.
                </>
            );
        }

        // [기본값] 팽팽한 호각세
        return (
            <>
                가격과 평가 지표가 팽팽합니다. 선호하는 장르와 플레이 스타일에 맞춰 선택해 보세요.
            </>
        );
    };

    const verdictContent = getVerdictText();

    // --- 2x2 벤토 카드 컴포넌트 ---
    const BentoCard = ({
        icon: Icon,
        title,
        valA,
        valB,
        winner,
        isLowerBetter = false,
        calcA,
        calcB,
        badgeA,
        badgeB,
        subA,
        subB,
        winBadgeText,
        unit = ''
    }) => {
        const hasBoth = valA != null && valB != null;
        let ratioA = 50, ratioB = 50;

        if (hasBoth && valA !== valB) {
            const a = calcA !== undefined ? calcA : valA;
            const b = calcB !== undefined ? calcB : valB;
            if (a + b > 0) {
                ratioA = isLowerBetter
                    ? Math.max(20, Math.min(80, (b / (a + b)) * 100))
                    : Math.max(20, Math.min(80, (a / (a + b)) * 100));
                ratioB = 100 - ratioA;
            }
        }

        return (
            <div className="bg-surface border border-divider rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all hover:border-divider-strong shadow-sm">
                {/* 카드 상단: 아이콘 + 지표명 + 승자 배지 */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-divider">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-surface-hover border border-divider flex items-center justify-center text-secondary shrink-0">
                            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-primary truncate">{title}</span>
                    </div>

                    {winBadgeText ? (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border tracking-tight shrink-0 ${
                            winner === 'A'
                                ? 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-400/30'
                                : winner === 'B'
                                ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-400/30'
                                : 'bg-surface-hover text-secondary border-divider'
                        }`}>
                            {winBadgeText}
                        </span>
                    ) : (
                        <span className="text-[10px] font-medium text-muted">-</span>
                    )}
                </div>

                {/* 카드 본문: 좌측(A) 대조 우측(B) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 py-2 sm:py-2.5 items-center">
                    {/* Game A */}
                    <div className="flex flex-col items-start min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 w-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                            <span className="text-[10px] font-bold text-secondary truncate">{titleA}</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
                            <span className={`text-sm sm:text-lg md:text-xl font-black ${
                                winner === 'A'
                                    ? 'text-cyan-600 dark:text-cyan-300'
                                    : valA != null
                                    ? 'text-primary'
                                    : 'text-muted'
                            }`}>
                                {valA != null ? (typeof valA === 'number' ? valA.toLocaleString() : valA) : '-'}
                                {valA != null && unit && <span className="text-[10px] sm:text-xs font-normal text-secondary ml-0.5">{unit}</span>}
                            </span>
                            {badgeA}
                        </div>
                        {subA && <div className="text-[9px] sm:text-[10px] text-secondary mt-0.5 truncate max-w-full">{subA}</div>}
                    </div>

                    {/* Game B */}
                    <div className="flex flex-col items-end min-w-0 text-right">
                        <div className="flex items-center justify-end gap-1 mb-0.5 w-full">
                            <span className="text-[10px] font-bold text-secondary truncate">{titleB}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                        </div>
                        <div className="flex items-baseline justify-end gap-1 sm:gap-1.5 flex-wrap">
                            {badgeB}
                            <span className={`text-sm sm:text-lg md:text-xl font-black ${
                                winner === 'B'
                                    ? 'text-rose-600 dark:text-rose-300'
                                    : valB != null
                                    ? 'text-primary'
                                    : 'text-muted'
                            }`}>
                                {valB != null ? (typeof valB === 'number' ? valB.toLocaleString() : valB) : '-'}
                                {valB != null && unit && <span className="text-[10px] sm:text-xs font-normal text-secondary ml-0.5">{unit}</span>}
                            </span>
                        </div>
                        {subB && <div className="text-[9px] sm:text-[10px] text-secondary mt-0.5 truncate max-w-full">{subB}</div>}
                    </div>
                </div>

                {/* 하단 미니 게이지 바 (라이트/다크 대응) */}
                <div className="pt-0.5">
                    {hasBoth ? (
                        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex border border-divider">
                            <div
                                className="h-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-700"
                                style={{ width: `${ratioA}%` }}
                            />
                            <div className="w-[1px] h-full bg-white/80 dark:bg-white/40"></div>
                            <div
                                className="h-full bg-rose-500 dark:bg-rose-400 transition-all duration-700"
                                style={{ width: `${ratioB}%` }}
                            />
                        </div>
                    ) : (
                        <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full border border-divider"></div>
                    )}
                </div>
            </div>
        );
    };

    // 승자 요약 배지 텍스트
    const priceDiff = (priceA && priceB) ? Math.abs(priceA - priceB) : null;
    const priceWinText = priceDiff != null
        ? (winners.price === 'A' ? `₩${priceDiff.toLocaleString()} 저렴` : winners.price === 'B' ? `₩${priceDiff.toLocaleString()} 저렴` : '동일가')
        : null;

    const metaDiff = (criticA.val && criticB.val) ? Math.abs(criticA.val - criticB.val) : null;
    const metaWinText = metaDiff != null
        ? (winners.meta === 'A' ? `+${metaDiff}점 우세` : winners.meta === 'B' ? `+${metaDiff}점 우세` : '동점')
        : null;

    const userDiff = (userA.val && userB.val) ? Math.abs(Number((userA.val - userB.val).toFixed(1))) : null;
    const userWinText = userDiff != null
        ? (winners.userVote === 'A' ? `+${userDiff}점 우세` : winners.userVote === 'B' ? `+${userDiff}점 우세` : '동점')
        : null;

    const volumeWinText = (hltbA && hltbB)
        ? (winners.volume === 'A'
            ? `${(hltbA / hltbB).toFixed(1)}배 볼륨`
            : winners.volume === 'B'
            ? `${(hltbB / hltbA).toFixed(1)}배 볼륨`
            : '동일')
        : null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none">
            {/* 뒷배경 오버레이 */}
            <div
                className={`fixed inset-0 bg-black/75 dark:bg-black/85 backdrop-blur-xl transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* 모달 메인 프레임 (PC/모바일 반응형 + 다크/라이트 완벽 지원) */}
            <div className={`relative w-full max-w-4xl bg-base border border-divider rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-20 backdrop-blur-2xl transition-all duration-400 ease-out ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                
                {/* 상단 얇은 액센트 라인 */}
                <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-white/50 to-rose-500 opacity-80 shrink-0"></div>

                {/* 헤더 바 */}
                <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 border-b border-divider flex items-center justify-between bg-surface/80 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-hover border border-divider text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                            <Swords className="w-3 h-3" />
                            <span>VS ARENA</span>
                        </div>
                        <span className="text-xs font-bold text-secondary hidden sm:inline">타이틀 1:1 비교</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-hover hover:bg-rose-500/10 hover:text-rose-500 border border-divider flex items-center justify-center text-secondary transition-colors"
                        title="닫기"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ========================================================================= */}
                {/* 1. 슬림 히어로 쇼케이스 (모바일/PC 컴팩트 높이 + 잘림 없는 미니멀 VS)     */}
                {/* ========================================================================= */}
                <div className="relative w-full h-32 sm:h-40 md:h-44 shrink-0 bg-black overflow-hidden flex select-none border-b border-divider">
                    {/* LEFT FIGHTER (Cyan) */}
                    <div className="w-1/2 h-full relative overflow-hidden group">
                        <PSGameImage
                            src={gameA.imageUrl}
                            alt={titleA}
                            width={500}
                            className="w-full h-full object-cover object-center opacity-70 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/80 via-cyan-950/25 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                        {/* P1 배지 */}
                        <div className="absolute top-2 left-2.5 sm:top-2.5 sm:left-5 z-20">
                            <span className="px-1.5 sm:px-2 py-0.5 rounded bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 text-[9px] sm:text-[10px] font-black tracking-wider uppercase">
                                P1
                            </span>
                        </div>

                        {/* 타이틀 정보 */}
                        <div className="absolute bottom-2 sm:bottom-3 left-2.5 sm:left-5 pr-8 sm:pr-14 z-20">
                            <h2 className="text-xs sm:text-base md:text-lg font-black text-white leading-tight drop-shadow-md line-clamp-1">
                                {titleA}
                            </h2>
                            <p className="text-[9px] sm:text-[11px] text-gray-300 font-medium line-clamp-1 mt-0.5">
                                {gameA.genres?.[0] || 'PlayStation'} • {gameA.publisher || 'Store'}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT FIGHTER (Rose) */}
                    <div className="w-1/2 h-full relative overflow-hidden group">
                        <PSGameImage
                            src={gameB.imageUrl}
                            alt={titleB}
                            width={500}
                            className="w-full h-full object-cover object-center opacity-70 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-rose-950/80 via-rose-950/25 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                        {/* P2 배지 */}
                        <div className="absolute top-2 right-2.5 sm:top-2.5 sm:right-5 z-20">
                            <span className="px-1.5 sm:px-2 py-0.5 rounded bg-rose-500/25 border border-rose-400/50 text-rose-300 text-[9px] sm:text-[10px] font-black tracking-wider uppercase">
                                P2
                            </span>
                        </div>

                        {/* 타이틀 정보 */}
                        <div className="absolute bottom-2 sm:bottom-3 right-2.5 sm:right-5 pl-8 sm:pl-14 z-20 text-right">
                            <h2 className="text-xs sm:text-base md:text-lg font-black text-white leading-tight drop-shadow-md line-clamp-1">
                                {titleB}
                            </h2>
                            <p className="text-[9px] sm:text-[11px] text-gray-300 font-medium line-clamp-1 mt-0.5">
                                {gameB.genres?.[0] || 'PlayStation'} • {gameB.publisher || 'Store'}
                            </p>
                        </div>
                    </div>

                    {/* CENTER: 미니멀하고 글자 잘림 없는 클래식 VS 엠블럼 */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-30 pointer-events-none">
                        <div className="absolute inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/70 to-transparent"></div>
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/90 border border-white/40 shadow-lg flex items-center justify-center">
                            <span className="text-[11px] sm:text-xs font-black italic tracking-tighter text-white">
                                VS
                            </span>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. 2x2 BENTO GRID (모바일 세로/PC 가로 반응형 + 스크롤 안전성)           */}
                {/* ========================================================================= */}
                <div className="p-3 sm:p-4 md:p-5 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {/* BENTO 1: 체감 결제가 */}
                        <BentoCard
                            icon={Banknote}
                            title="체감 결제가"
                            valA={priceA}
                            valB={priceB}
                            unit="원"
                            isLowerBetter={true}
                            winner={winners.price}
                            winBadgeText={priceWinText}
                            badgeA={gameA.discountRate > 0 ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-ps-blue text-white">
                                    -{gameA.discountRate}%
                                </span>
                            ) : null}
                            badgeB={gameB.discountRate > 0 ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-ps-blue text-white">
                                    -{gameB.discountRate}%
                                </span>
                            ) : null}
                            subA={isALowest ? '역대 최저가' : gameA.lowestPrice ? `최저 ${gameA.lowestPrice.toLocaleString()}원` : null}
                            subB={isBLowest ? '역대 최저가' : gameB.lowestPrice ? `최저 ${gameB.lowestPrice.toLocaleString()}원` : null}
                        />

                        {/* BENTO 2: 전문가 평점 */}
                        <BentoCard
                            icon={Trophy}
                            title="전문가 평점"
                            valA={criticA.val}
                            valB={criticB.val}
                            calcA={criticA.val}
                            calcB={criticB.val}
                            winner={winners.meta}
                            winBadgeText={metaWinText}
                            badgeA={criticA.badge ? (
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-1 py-0.2 rounded">
                                    {criticA.badge}
                                </span>
                            ) : null}
                            badgeB={criticB.badge ? (
                                <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/15 border border-yellow-200 dark:border-yellow-500/30 px-1 py-0.2 rounded">
                                    {criticB.badge}
                                </span>
                            ) : null}
                            subA={criticA.src ? `${criticA.src} 기준` : null}
                            subB={criticB.src ? `${criticB.src} 기준` : null}
                        />

                        {/* BENTO 3: 유저 평점 */}
                        <BentoCard
                            icon={Users}
                            title="유저 평가 점수"
                            valA={userA.val}
                            valB={userB.val}
                            calcA={userA.calcVal}
                            calcB={userB.calcVal}
                            winner={winners.userVote}
                            winBadgeText={userWinText}
                            subA={userA.src ? `${userA.src} 기준` : null}
                            subB={userB.src ? `${userB.src} 기준` : null}
                        />

                        {/* BENTO 4: 플레이 볼륨 */}
                        <BentoCard
                            icon={Hourglass}
                            title="플레이 볼륨"
                            valA={hltbA ? `${Math.round(hltbA)}h` : null}
                            valB={hltbB ? `${Math.round(hltbB)}h` : null}
                            calcA={hltbA}
                            calcB={hltbB}
                            winner={winners.volume}
                            winBadgeText={volumeWinText}
                            subA={pricePerHrA ? `시간당 ~${pricePerHrA.toLocaleString()}원` : null}
                            subB={pricePerHrB ? `시간당 ~${pricePerHrB.toLocaleString()}원` : null}
                        />
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 3. VERDICT SUMMARY & DUAL ACTION FOOTER (정밀 분석 결과)                   */}
                {/* ========================================================================= */}
                <div className="p-3 sm:p-4 bg-base border-t border-divider flex flex-col gap-2.5 sm:gap-3 shrink-0">
                    {/* 정밀 평가 인포 배너 */}
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-xs sm:text-[13px] leading-relaxed shadow-sm">
                        <div className="p-1 rounded-md bg-surface-hover text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
                            <Scale className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-primary/90 font-medium break-keep">
                            {verdictContent}
                        </p>
                    </div>

                    {/* 하단 듀얼 바로가기 버튼 */}
                    <div className="flex gap-2 sm:gap-2.5">
                        <button
                            onClick={() => {
                                onClose();
                                setTimeout(() => navigate(`/games/${gameA.gameId || gameA.id}`, { state: { background: location } }), 150);
                            }}
                            className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-bold transition-all flex items-center justify-between group active:scale-[0.99] min-w-0"
                        >
                            <span className="truncate">{titleA}</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1 text-cyan-600 dark:text-cyan-400" />
                        </button>

                        <button
                            onClick={() => {
                                onClose();
                                setTimeout(() => navigate(`/games/${gameB.gameId || gameB.id}`, { state: { background: location } }), 150);
                            }}
                            className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold transition-all flex items-center justify-between group active:scale-[0.99] min-w-0"
                        >
                            <span className="truncate">{titleB}</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1 text-rose-600 dark:text-rose-400" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
