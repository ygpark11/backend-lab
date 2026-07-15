import React from 'react';
import { Shield, Calendar, AlertCircle } from 'lucide-react';

// 트로피 메탈 계열 HEX — priceVerdict ○△×□ 시스템과 완전 독립
const TIER_STYLE = {
    S: {
        color:       'text-[#6B7280] dark:text-[#C8C8D8]',
        bg:          'bg-slate-500/5 dark:bg-slate-300/5',
        border:      'border-slate-400/30 dark:border-slate-300/20',
        badge:       'bg-slate-100 dark:bg-slate-800/60',
        trophyLabel: 'Platinum',
    },
    A: {
        color:       'text-[#92650A] dark:text-[#D4AF37]',
        bg:          'bg-amber-500/5 dark:bg-amber-500/10',
        border:      'border-amber-500/30 dark:border-amber-400/30',
        badge:       'bg-amber-50 dark:bg-amber-900/20',
        trophyLabel: 'Gold',
    },
    B: {
        color:       'text-[#5A5B6A] dark:text-[#A8A9B4]',
        bg:          'bg-slate-400/5 dark:bg-slate-400/10',
        border:      'border-slate-400/30 dark:border-slate-400/20',
        badge:       'bg-slate-50 dark:bg-slate-700/30',
        trophyLabel: 'Silver',
    },
    C: {
        color:       'text-[#8B4513] dark:text-[#CD7F32]',
        bg:          'bg-orange-500/5 dark:bg-orange-500/10',
        border:      'border-orange-500/30 dark:border-orange-400/30',
        badge:       'bg-orange-50 dark:bg-orange-900/20',
        trophyLabel: 'Bronze',
    },
    D: {
        color:       'text-[#991B1B] dark:text-[#C0392B]',
        bg:          'bg-red-500/5 dark:bg-red-500/10',
        border:      'border-red-500/30 dark:border-red-400/30',
        badge:       'bg-red-50 dark:bg-red-900/20',
        trophyLabel: 'Iron',
    },
    N: {
        color:       'text-teal-600 dark:text-teal-400',
        bg:          'bg-teal-500/5 dark:bg-teal-500/10',
        border:      'border-teal-500/30 dark:border-teal-400/30',
        badge:       'bg-teal-50 dark:bg-teal-900/20',
        trophyLabel: '신작',
    },
    관측: {
        color:       'text-indigo-600 dark:text-indigo-400',
        bg:          'bg-indigo-500/5 dark:bg-indigo-500/10',
        border:      'border-indigo-500/30 dark:border-indigo-400/30',
        badge:       'bg-indigo-50 dark:bg-indigo-900/20',
        trophyLabel: '관측 중',
    },
    default: {
        color:       'text-secondary',
        bg:          'bg-surface',
        border:      'border-divider',
        badge:       'bg-surface',
        trophyLabel: '',
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

// "2026-09-01" → "2026년 9월"
function formatYearMonth(dateStr) {
    if (!dateStr) return null;
    try {
        const [year, month] = dateStr.split('-');
        return `${year}년 ${parseInt(month, 10)}월`;
    } catch {
        return null;
    }
}

// "2024-03-01" → "2024.03"
function formatYearMonthDot(dateStr) {
    if (!dateStr) return null;
    try {
        const [year, month] = dateStr.split('-');
        return `${year}.${month}`;
    } catch {
        return null;
    }
}

// "할인 3회 · 최대 -25% · 약 8개월마다" 조합
function buildStatsLine(discountCount, maxRate, monthsPerSale) {
    if (discountCount === 0) return '할인 이력 없음';
    const parts = [`할인 ${discountCount}회`];
    if (maxRate != null) parts.push(`최대 -${maxRate}%`);
    if (monthsPerSale != null) {
        const r = Math.round(monthsPerSale);
        parts.push(r < 2 ? '2개월 이내마다' : `약 ${r}개월마다`);
    }
    return parts.join(' · ');
}

// 예상 날짜 없을 때 문맥에 맞는 대체 문구
function getNoEstimateText(discountCount, trackedMonths) {
    if (discountCount === 0 && trackedMonths >= 3) return '할인 패턴 없음';
    return '패턴 데이터 부족';
}

// compact=true → 모바일 가로형, compact=false → PC 세로형 풀카드
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
    const statsLine        = buildStatsLine(discountCount, maxRate, monthsPerSale);
    const trackingStartTxt = formatYearMonthDot(trackingStartDate);
    const nextSaleText     = formatYearMonth(nextSaleEstimate);
    const noEstimateText   = getNoEstimateText(discountCount, trackedMonths);

    // 타임존 영향 없이 문자열 비교로 past 판정
    const todayStr       = new Date().toISOString().slice(0, 10);
    const isEstimatePast = nextSaleEstimate ? nextSaleEstimate < todayStr : false;

    /* ─── 모바일 compact 레이아웃 ─────────────────────────── */
    if (compact) {
        return (
            <div className={`rounded-xl border p-3.5 ${style.bg} ${style.border}`}>
                <div className="flex items-start gap-3">
                    {/* 등급 배지 */}
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black border-2 ${style.badge} ${style.color} ${style.border}`}>
                        {letter}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* 등급명 + 추적 기간 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-black ${style.color}`}>{tier}</span>
                            {trackedMonths > 0 && (
                                <span className="text-xs text-secondary font-bold">{trackedMonths}개월 추적</span>
                            )}
                        </div>

                        {/* 수치 한 줄 */}
                        <p className="text-xs font-bold text-primary mt-0.5">{statsLine}</p>

                        {/* 다음 할인 예상 */}
                        <div className="flex items-center gap-1 mt-1.5">
                            <Calendar className={`w-3 h-3 shrink-0 ${
                                isEstimatePast ? 'text-amber-500'
                                : nextSaleText  ? style.color
                                : 'text-secondary'
                            }`} />
                            <span className={`text-xs font-bold ${
                                isEstimatePast ? 'text-amber-600 dark:text-amber-400'
                                : nextSaleText  ? 'text-primary'
                                : 'text-secondary'
                            }`}>
                                {isEstimatePast ? (
                                    <span className="font-black">할인 예상 시기 도래 — 곧 할인 가능</span>
                                ) : nextSaleText ? (
                                    <>다음 할인 예상: <span className={`font-black ${style.color}`}>{nextSaleText}</span></>
                                ) : (
                                    `다음 할인 예상: ${noEstimateText}`
                                )}
                            </span>
                        </div>

                        {/* 콜드스타트 경고 */}
                        {coldStartWarning && trackingStartTxt && (
                            <div className="flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="text-[11px] font-bold text-secondary">
                                    {trackingStartTxt} 수집 시작 — 이전 이력 미포함
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ─── PC 풀 레이아웃 ──────────────────────────────────── */
    return (
        <div className={`rounded-2xl border p-5 transition-colors ${style.bg} ${style.border}`}>
            {/* 헤더 */}
            <div className="flex items-center gap-1.5 mb-4">
                <Shield className={`w-3.5 h-3.5 ${style.color}`} />
                <span className="text-xs font-black uppercase tracking-widest text-secondary">
                    할인 방어력
                </span>
            </div>

            {/* 등급 배지 + 이름 */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border-2 shadow-sm shrink-0 ${style.badge} ${style.color} ${style.border}`}>
                    {letter}
                </div>
                <div>
                    <div className={`text-sm font-black ${style.color}`}>{tier}</div>
                    <div className="text-xs font-bold mt-0.5">
                        <span className={style.color}>{style.trophyLabel}</span>
                        {trackedMonths > 0 && (
                            <span className="text-secondary"> · {trackedMonths}개월 추적</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 수치 한 줄 */}
            <p className="text-xs font-bold text-primary mb-4">{statsLine}</p>

            {/* 다음 할인 예상 박스 */}
            <div className={`rounded-xl px-3.5 py-3 border ${
                isEstimatePast
                    ? 'bg-amber-500/5 border-amber-500/25'
                    : nextSaleText
                        ? 'bg-base/60 border-divider/60'
                        : 'bg-base/30 border-divider/30'
            }`}>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-secondary mb-1">
                    <Calendar className={`w-3 h-3 ${
                        isEstimatePast ? 'text-amber-500'
                        : nextSaleText  ? style.color
                        : 'text-secondary'
                    }`} />
                    다음 할인 예상
                </div>

                {isEstimatePast ? (
                    <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                        할인 예상 시기 도래 — 곧 할인 가능
                    </div>
                ) : nextSaleText ? (
                    <div className={`text-xl font-black ${style.color}`}>{nextSaleText}</div>
                ) : (
                    <div className="text-sm font-bold text-secondary">{noEstimateText}</div>
                )}
            </div>

            {/* 추정 면책 캡션 — 예상 날짜가 미래인 경우만 */}
            {nextSaleText && !isEstimatePast && (
                <p className="text-[10px] text-secondary font-bold mt-1.5 px-0.5">
                    수집 데이터 기반 추정 — 실제와 다를 수 있음
                </p>
            )}

            {/* 콜드스타트 경고 */}
            {coldStartWarning && trackingStartTxt && (
                <div className="flex items-start gap-1.5 mt-2 px-0.5">
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-secondary">
                        {trackingStartTxt} 수집 시작 — 이전 이력 미포함
                    </span>
                </div>
            )}
        </div>
    );
}
