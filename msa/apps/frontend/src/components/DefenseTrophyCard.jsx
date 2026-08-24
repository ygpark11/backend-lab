import React from 'react';
import { Shield, Calendar, AlertCircle, TrendingDown, Clock, Sparkles, Flame } from 'lucide-react';

// 트로피 메탈 계열 HEX 및 그라데이션 스타일
const TIER_STYLE = {
    S: {
        color:       'text-slate-700 dark:text-[#E2E8F0]',
        bg:          'bg-slate-500/5 dark:bg-slate-300/5',
        border:      'border-slate-300/60 dark:border-slate-400/30',
        badge:       'bg-gradient-to-br from-slate-100 to-slate-300 dark:from-slate-700 dark:to-slate-900 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-500',
        pill:        'bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
        trophyLabel: 'Platinum',
        desc:        '철벽 방어 (할인 빈도 극히 낮음)',
    },
    A: {
        color:       'text-amber-700 dark:text-[#FBBF24]',
        bg:          'bg-amber-500/5 dark:bg-amber-500/10',
        border:      'border-amber-400/40 dark:border-amber-500/30',
        badge:       'bg-gradient-to-br from-amber-100 to-amber-300 dark:from-amber-700 dark:to-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-600',
        pill:        'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        trophyLabel: 'Gold',
        desc:        '강력 방어 (할인폭이 좁고 드묾)',
    },
    B: {
        color:       'text-slate-600 dark:text-[#94A3B8]',
        bg:          'bg-slate-400/5 dark:bg-slate-400/10',
        border:      'border-slate-300/50 dark:border-slate-500/30',
        badge:       'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
        pill:        'bg-slate-100/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        trophyLabel: 'Silver',
        desc:        '평균 방어 (정기 할인 주기 준수)',
    },
    C: {
        color:       'text-amber-800 dark:text-[#F97316]',
        bg:          'bg-orange-500/5 dark:bg-orange-500/10',
        border:      'border-orange-400/40 dark:border-orange-500/30',
        badge:       'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-stone-900 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700',
        pill:        'bg-orange-100/80 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800',
        trophyLabel: 'Bronze',
        desc:        '방어 취약 (자주 깊게 할인됨)',
    },
    D: {
        color:       'text-red-700 dark:text-[#EF4444]',
        bg:          'bg-red-500/5 dark:bg-red-500/10',
        border:      'border-red-400/40 dark:border-red-500/30',
        badge:       'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-zinc-950 text-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
        pill:        'bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
        trophyLabel: 'Iron',
        desc:        '상시 세일 (정가 구매 비추천)',
    },
    N: {
        color:       'text-teal-700 dark:text-teal-400',
        bg:          'bg-teal-500/5 dark:bg-teal-500/10',
        border:      'border-teal-400/40 dark:border-teal-500/30',
        badge:       'bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-800 dark:to-slate-900 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-600',
        pill:        'bg-teal-100/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        trophyLabel: '신작',
        desc:        '출시 초기 (할인 방어력 관측 중)',
    },
    관측: {
        color:       'text-indigo-700 dark:text-indigo-400',
        bg:          'bg-indigo-500/5 dark:bg-indigo-500/10',
        border:      'border-indigo-400/40 dark:border-indigo-500/30',
        badge:       'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-800 dark:to-slate-900 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-600',
        pill:        'bg-indigo-100/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
        trophyLabel: '관측 중',
        desc:        '할인 패턴 데이터 수집 중',
    },
    default: {
        color:       'text-secondary',
        bg:          'bg-surface',
        border:      'border-divider',
        badge:       'bg-surface border-divider text-secondary',
        pill:        'bg-base border-divider text-secondary',
        trophyLabel: '',
        desc:        '',
    },
};

function getTierStyle(tier) {
    if (!tier) return TIER_STYLE.default;
    if (tier === '관측 중') return TIER_STYLE.관측;
    if (tier.includes('신작')) return TIER_STYLE.N;
    const key = tier[0];
    return TIER_STYLE[key] ?? TIER_STYLE.default;
}

function getTierLetter(tier) {
    if (!tier) return '?';
    if (tier.includes('신작') || tier.startsWith('N')) return 'N';
    if (tier === '관측 중') return '?';
    const first = tier[0];
    if ('SABCD'.includes(first)) return first;
    return '?';
}

function formatYearMonth(dateStr) {
    if (!dateStr) return null;
    try {
        const [year, month] = dateStr.split('-');
        return `${year}년 ${parseInt(month, 10)}월`;
    } catch {
        return null;
    }
}

function formatYearMonthDot(dateStr) {
    if (!dateStr) return null;
    try {
        const [year, month] = dateStr.split('-');
        return `${year}.${month}`;
    } catch {
        return null;
    }
}

function getNoEstimateText(discountCount, trackedMonths) {
    if (discountCount === 0 && trackedMonths >= 3) return '할인 패턴 없음';
    return '패턴 수집 중';
}

export default function DefenseTrophyCard({ defenseInfo, compact = false }) {
    if (!defenseInfo?.tier || defenseInfo.tier === '등급 외') return null;

    const {
        tier,
        trackedMonths,
        discountCount,
        maxRate,
        monthsPerSale,
        nextSaleEstimate,
        coldStartWarning,
        trackingStartDate,
    } = defenseInfo;

    const style            = getTierStyle(tier);
    const letter           = getTierLetter(tier);
    const trackingStartTxt = formatYearMonthDot(trackingStartDate);
    const nextSaleText     = formatYearMonth(nextSaleEstimate);
    const noEstimateText   = getNoEstimateText(discountCount, trackedMonths);

    const todayStr       = new Date().toISOString().slice(0, 10);
    const isEstimatePast = nextSaleEstimate ? nextSaleEstimate < todayStr : false;

    /* ─── 모바일 compact 인포그래픽 레이아웃 ───────────────────────── */
    if (compact) {
        return (
            <div className={`rounded-2xl border p-3.5 bg-surface/95 dark:bg-surface/90 border-divider-strong shadow-md ${style.bg}`}>
                {/* 상단 헤더: 뱃지 + 등급명 + 다음 할인 예측 */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border shadow-sm shrink-0 ${style.badge}`}>
                            {letter}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-black truncate ${style.color}`}>
                                    {tier} 방어 등급
                                </span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${style.pill}`}>
                                    {style.trophyLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        {isEstimatePast ? (
                            <span className="text-[10px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <Flame className="w-2.5 h-2.5 fill-amber-500" /> 할인 임박
                            </span>
                        ) : nextSaleText ? (
                            <span className="text-[10px] font-extrabold text-secondary dark:text-zinc-300">
                                다음 <strong className={`font-black ${style.color}`}>{nextSaleText}</strong>
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-muted">{noEstimateText}</span>
                        )}
                    </div>
                </div>

                {/* 3-Slot 미니 인포그래픽 칩 */}
                <div className="grid grid-cols-3 gap-1.5">
                    <div className="p-1.5 rounded-xl bg-base/80 border border-divider text-center">
                        <span className="block text-[9px] font-extrabold text-secondary dark:text-zinc-400">할인 횟수</span>
                        <span className="block text-xs font-black text-primary truncate">
                            {discountCount > 0 ? `${discountCount}회` : '-'}
                        </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-base/80 border border-divider text-center">
                        <span className="block text-[9px] font-extrabold text-secondary dark:text-zinc-400">최대 할인</span>
                        <span className="block text-xs font-black text-green-400 truncate">
                            {maxRate != null && maxRate > 0 ? `-${maxRate}%` : '-'}
                        </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-base/80 border border-divider text-center">
                        <span className="block text-[9px] font-extrabold text-secondary dark:text-zinc-400">평균 주기</span>
                        <span className="block text-xs font-black text-primary truncate">
                            {monthsPerSale != null ? `~${Math.round(monthsPerSale)}개월` : '-'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── PC 사이드바 인포그래픽 풀 카드 ────────────────────────────── */
    return (
        <div className={`rounded-2xl border p-4 sm:p-4.5 bg-surface/95 dark:bg-surface/90 border-divider-strong shadow-md transition-colors ${style.bg}`}>
            {/* 1. 상단 라벨 헤더 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Shield className={`w-3.5 h-3.5 ${style.color}`} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-secondary dark:text-zinc-300">
                        할인 방어력
                    </span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wider uppercase ${style.pill}`}>
                    {style.trophyLabel} TIER
                </span>
            </div>

            {/* 2. 티어 쇼케이스 (메탈릭 뱃지 + 등급 설명) */}
            <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-base/60 border border-divider/80">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black border-2 shadow-sm shrink-0 ${style.badge}`}>
                    {letter}
                </div>
                <div className="min-w-0 flex-1">
                    <div className={`text-sm font-black truncate ${style.color}`}>
                        {tier} 방어 등급
                    </div>
                    <div className="text-[11px] font-extrabold text-secondary dark:text-zinc-400 truncate mt-0.5">
                        {style.desc || (trackedMonths > 0 ? `${trackedMonths}개월 추적 데이터` : '할인율 분석')}
                    </div>
                </div>
            </div>

            {/* 3. 3-Slot 인포그래픽 스탯 칩 그리드 */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
                <div className="p-2 rounded-xl bg-base/80 border border-divider flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-extrabold text-secondary dark:text-zinc-400 mb-0.5">
                        할인 횟수
                    </span>
                    <span className="text-xs sm:text-sm font-black text-primary">
                        {discountCount > 0 ? `${discountCount}회` : '-'}
                    </span>
                </div>

                <div className="p-2 rounded-xl bg-base/80 border border-divider flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-extrabold text-secondary dark:text-zinc-400 mb-0.5">
                        최대 할인
                    </span>
                    <span className="text-xs sm:text-sm font-black text-green-400">
                        {maxRate != null && maxRate > 0 ? `-${maxRate}%` : '-'}
                    </span>
                </div>

                <div className="p-2 rounded-xl bg-base/80 border border-divider flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-extrabold text-secondary dark:text-zinc-400 mb-0.5">
                        평균 주기
                    </span>
                    <span className="text-xs sm:text-sm font-black text-primary">
                        {monthsPerSale != null ? `~${Math.round(monthsPerSale)}개월` : '-'}
                    </span>
                </div>
            </div>

            {/* 4. 다음 할인 예상 타임라인 바 */}
            <div className={`rounded-xl p-2.5 border transition-all ${
                isEstimatePast
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : nextSaleText
                        ? 'bg-base/80 border-divider'
                        : 'bg-base/40 border-divider/40'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-secondary dark:text-zinc-400">
                        <Calendar className={`w-3.5 h-3.5 ${
                            isEstimatePast ? 'text-amber-500 fill-amber-500/20'
                            : nextSaleText ? style.color
                            : 'text-secondary'
                        }`} />
                        <span>다음 예상 할인</span>
                    </div>

                    <div>
                        {isEstimatePast ? (
                            <span className="text-xs font-black text-amber-500 flex items-center gap-1 animate-pulse">
                                <Flame className="w-3 h-3 fill-amber-500" /> 할인 주기 임박!
                            </span>
                        ) : nextSaleText ? (
                            <span className={`text-xs font-black ${style.color}`}>
                                {nextSaleText}
                            </span>
                        ) : (
                            <span className="text-[11px] font-bold text-muted">
                                {noEstimateText}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. 콜드스타트 안내 뱃지 */}
            {coldStartWarning && trackingStartTxt && (
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-bold text-secondary dark:text-zinc-400 px-1">
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{trackingStartTxt} 수집 시작 · 이전 데이터 미포함</span>
                </div>
            )}
        </div>
    );
}
