// 🎬 YouTube Shorts 촬영 전용 카드 (항상 다크 고정, 9:16 풀스크린)
// 접근: /games/:id?view=shorts — 사이트 내 링크 없음
import React from 'react';
import { Circle, Triangle, X, Square, CalendarDays, TrendingUp, Timer, Clock } from 'lucide-react';
import PSGameImage from './common/PSGameImage';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const IS_BUY = (v) => v === 'BUY_NOW' || v === 'GOOD_OFFER';

function formatYearMonth(dateStr) {
    if (!dateStr) return null;
    try {
        const [year, month] = dateStr.split('-');
        return `${year}년 ${parseInt(month, 10)}월`;
    } catch {
        return null;
    }
}

const VERDICT_CONFIG = {
    BUY_NOW: {
        label: '지금 사세요',
        labelColor: 'text-green-400',
        border: 'border-green-500/50',
        boxGlow: 'shadow-[0_0_50px_rgba(34,197,94,0.45),inset_0_1px_0_rgba(34,197,94,0.2)]',
        auroraA: 'bg-green-500/35',
        auroraB: 'bg-teal-500/20',
        accentGlow: 'drop-shadow-[0_0_12px_rgba(34,197,94,0.7)]',
        renderIcon: () => (
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-green-400" />
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-green-400" style={{ animationDelay: '0.4s' }} />
                <div className="absolute inset-0 rounded-full blur-md bg-green-400/35" />
                <Circle className="relative z-10 w-12 h-12 text-green-400 fill-green-400/25 stroke-[2.5px] drop-shadow-[0_0_14px_rgba(34,197,94,1)]" />
            </div>
        ),
    },
    GOOD_OFFER: {
        label: '괜찮은 가격',
        labelColor: 'text-yellow-400',
        border: 'border-yellow-500/50',
        boxGlow: 'shadow-[0_0_50px_rgba(234,179,8,0.45),inset_0_1px_0_rgba(234,179,8,0.2)]',
        auroraA: 'bg-yellow-500/30',
        auroraB: 'bg-amber-500/20',
        accentGlow: 'drop-shadow-[0_0_12px_rgba(234,179,8,0.7)]',
        renderIcon: () => (
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-full animate-pulse blur-md bg-yellow-400/35" />
                <Triangle className="relative z-10 w-12 h-12 text-yellow-400 fill-yellow-400/25 stroke-[2.5px] drop-shadow-[0_0_14px_rgba(234,179,8,1)] animate-bounce" />
            </div>
        ),
    },
    WAIT: {
        label: '기다리세요',
        labelColor: 'text-red-400',
        border: 'border-red-500/50',
        boxGlow: 'shadow-[0_0_50px_rgba(239,68,68,0.45),inset_0_1px_0_rgba(239,68,68,0.2)]',
        auroraA: 'bg-red-500/30',
        auroraB: 'bg-purple-500/20',
        accentGlow: 'drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]',
        renderIcon: () => (
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-full animate-pulse blur-md bg-red-400/35" />
                <X className="relative z-10 w-12 h-12 text-red-400 stroke-[3.5px] drop-shadow-[0_0_14px_rgba(239,68,68,1)] animate-[spin_6s_linear_infinite]" />
            </div>
        ),
    },
    TRACKING: {
        label: '추적 중',
        labelColor: 'text-blue-400',
        border: 'border-blue-500/50',
        boxGlow: 'shadow-[0_0_50px_rgba(59,130,246,0.45),inset_0_1px_0_rgba(59,130,246,0.2)]',
        auroraA: 'bg-blue-500/30',
        auroraB: 'bg-indigo-500/20',
        accentGlow: 'drop-shadow-[0_0_12px_rgba(59,130,246,0.7)]',
        renderIcon: () => (
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-full animate-pulse blur-md bg-blue-400/35" />
                <Square className="relative z-10 w-12 h-12 text-blue-400 fill-blue-400/25 stroke-[2.5px] drop-shadow-[0_0_14px_rgba(59,130,246,1)] animate-pulse" />
            </div>
        ),
    },
};

export default function GameShortsCard({ game }) {
    const isBuy = IS_BUY(game.priceVerdict);
    const cfg   = VERDICT_CONFIG[game.priceVerdict] ?? VERDICT_CONFIG.TRACKING;

    const daysLeft = (game.saleEndDate && game.discountRate > 0)
        ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date())
        : null;
    const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

    const pricePerHour = (game.hltbMainStory > 0 && game.currentPrice > 0)
        ? Math.round(game.currentPrice / game.hltbMainStory)
        : null;

    const score      = game.mcMetaScore || game.igdbCriticScore || null;
    // "MC" → 풀네임으로 직관성 강화
    const scoreLabel = game.mcMetaScore ? '메타크리틱' : 'IGDB';

    const nextSaleRaw    = game.defenseInfo?.nextSaleEstimate;
    const nextSale       = formatYearMonth(nextSaleRaw);
    const isEstimatePast = nextSaleRaw
        ? nextSaleRaw < new Date().toISOString().slice(0, 10)
        : false;

    // 플레이타임을 primary로, 시성비를 sub(secondary)로
    const playtimeHours = game.hltbMainStory > 0 ? Math.round(game.hltbMainStory) : null;

    const stats = [
        score         ? { label: scoreLabel, value: String(score), type: 'score' } : null,
        playtimeHours ? {
            label: '플레이타임',
            value: `${playtimeHours}시간`,
            type: 'time',
            sub: pricePerHour ? `${pricePerHour.toLocaleString()}원 / 시간` : null,
        } : null,
    ].filter(Boolean);
    const colClass = stats.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

    const scorePct   = game.mcMetaScore || game.igdbCriticScore || 0;
    // GameDetailPage getScoreColor 기준과 통일: 75+ 초록 / 50+ 노랑 / 미만 빨강
    const scoreColor = scorePct >= 75
        ? 'text-green-400 drop-shadow-[0_0_14px_rgba(34,197,94,0.9)]'
        : scorePct >= 50
            ? 'text-yellow-400 drop-shadow-[0_0_14px_rgba(234,179,8,0.9)]'
            : 'text-red-400 drop-shadow-[0_0_14px_rgba(239,68,68,0.9)]';

    const isPsExtra  = Boolean(game.inCatalog);
    const hasBadges  = game.platforms?.length > 0 || game.isPs5ProEnhanced || game.isPlusExclusive || isPsExtra;

    return (
        <div className="relative w-full h-screen bg-[#080810] overflow-hidden flex flex-col select-none">

            {/* Aurora 배경 — verdict별 색상 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-[20%] -right-[20%] w-[80%] h-[70%] ${cfg.auroraA} rounded-full blur-[90px] animate-[pulse_6s_ease-in-out_infinite]`} />
                <div className={`absolute top-[50%] -left-[20%] w-[70%] h-[60%] ${cfg.auroraB} rounded-full blur-[90px] animate-[pulse_9s_ease-in-out_infinite]`} />
            </div>

            {/* ○△×□ 워터마크 */}
            <div className="absolute bottom-[30%] -right-[8%] pointer-events-none flex gap-5 rotate-[15deg] opacity-[0.05] text-white">
                <Triangle className="w-28 h-28 stroke-[1.5px]" />
                <Circle   className="w-28 h-28 stroke-[1.5px]" />
                <X        className="w-28 h-28 stroke-[1.5px]" />
                <Square   className="w-28 h-28 stroke-[1.5px]" />
            </div>

            {/* ── 게임 커버 ── */}
            <div className="relative h-[38vh] shrink-0 overflow-hidden">
                <PSGameImage
                    src={game.imageUrl}
                    alt={game.title}
                    priority
                    width={640}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#080810]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#080810]/40 via-transparent to-transparent" />

                {/* 타이틀 + 뱃지 — 커버 하단 좌측 (우상단→하단 이동으로 YouTube 인게이지먼트 버튼 충돌 해소) */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                    {game.genres?.[0] && (
                        <p className="text-[12px] text-white/50 font-bold tracking-widest uppercase mb-1.5">
                            {game.genres[0]}
                        </p>
                    )}
                    {/* 뱃지 — 타이틀 바로 위 인라인 pill row */}
                    {hasBadges && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {game.platforms?.slice(0, 2).map(p => (
                                <span key={p} className="text-[11px] font-black text-blue-200 bg-blue-950/80 backdrop-blur-sm border border-blue-400/40 px-2 py-0.5 rounded-md">
                                    {p}
                                </span>
                            ))}
                            {game.isPs5ProEnhanced && (
                                <span className="text-[11px] font-black text-white/80 bg-black/70 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-md">
                                    PS5 Pro
                                </span>
                            )}
                            {game.isPlusExclusive && (
                                <span className="text-[11px] font-black text-yellow-300 bg-yellow-950/80 backdrop-blur-sm border border-yellow-400/40 px-2 py-0.5 rounded-md">
                                    PLUS 할인
                                </span>
                            )}
                            {isPsExtra && (
                                <span className="text-[11px] font-black text-cyan-300 bg-cyan-950/80 backdrop-blur-sm border border-cyan-400/40 px-2 py-0.5 rounded-md shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                                    PS+ 포함
                                </span>
                            )}
                        </div>
                    )}
                    <h1 className="text-[26px] font-black text-white leading-tight break-keep line-clamp-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                        {game.title}
                    </h1>
                </div>
            </div>

            {/* ── 하단 컨텐츠 ── */}
            <div className="relative z-10 flex flex-col flex-1 px-5 pt-2 pb-20 gap-2">

                {/* 핵심 판정 박스 */}
                <div className={`rounded-2xl border bg-white/[0.05] backdrop-blur-md p-3 ${cfg.border} ${cfg.boxGlow}`}>

                    <div className="flex items-center gap-3 mb-2">
                        {cfg.renderIcon()}
                        <span className={`text-[30px] font-black leading-none ${cfg.labelColor}`}>
                            {cfg.label}
                        </span>
                    </div>

                    {isBuy ? (
                        <div className="flex flex-col gap-2">
                            {/* 가격 + 할인율 */}
                            <div className="flex items-end gap-3 flex-wrap">
                                <span className={`text-[42px] font-black tracking-tighter leading-none ${
                                    game.isPlusExclusive
                                        ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.7)]'
                                        : game.priceVerdict === 'BUY_NOW'
                                            ? 'text-white drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                                            : 'text-white'
                                }`}>
                                    {game.currentPrice.toLocaleString()}
                                    <span className="text-xl font-medium text-white/40 ml-1">원</span>
                                </span>
                                {game.discountRate > 0 && (
                                    <span className={`text-[24px] font-black mb-1.5 ${cfg.labelColor} ${cfg.accentGlow}`}>
                                        -{game.discountRate}%
                                    </span>
                                )}
                            </div>

                            {/* 정가 취소선 — white/30 → white/55 로 가시성 강화 */}
                            {game.discountRate > 0 && game.originalPrice > 0 && (
                                <p className="text-[14px] text-white/55 font-bold line-through leading-none">
                                    {game.originalPrice.toLocaleString()}원
                                </p>
                            )}

                            {/* 역대최저가 shimmer 뱃지 */}
                            {game.priceVerdict === 'BUY_NOW' && (
                                <div className="relative overflow-hidden mt-1 w-fit inline-flex items-center gap-2 bg-green-500/20 border border-green-400/60 text-green-400 text-[15px] font-black px-3.5 py-1.5 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                    <TrendingUp className="relative z-10 w-4 h-4 shrink-0" />
                                    <span className="relative z-10">역대최저가 달성!</span>
                                </div>
                            )}
                            {game.priceVerdict === 'GOOD_OFFER' && game.lowestPrice > 0 && (
                                <p className="text-[15px] text-white/45 font-bold mt-0.5">
                                    역대최저 {game.lowestPrice.toLocaleString()}원 근접
                                </p>
                            )}

                            {/* 할인 종료일 */}
                            {daysLeft !== null && daysLeft >= 0 && (
                                <div className="flex items-center gap-2 mt-1 pt-2.5 border-t border-white/10">
                                    {isClosingSoon
                                        ? <Timer className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                                        : <CalendarDays className="w-5 h-5 text-white/35 shrink-0" />
                                    }
                                    <span className={`text-[15px] font-black ${isClosingSoon ? 'text-red-400' : 'text-white/45'}`}>
                                        {isClosingSoon
                                            ? `막차! ${game.saleEndDate?.replace(/-/g, '.')} 마감`
                                            : `할인 종료 ${game.saleEndDate?.replace(/-/g, '.')}`
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* WAIT / TRACKING */
                        <div className="flex flex-col gap-2">
                            <div>
                                <p className="text-[12px] text-white/30 font-black tracking-widest mb-0.5">
                                    {game.discountRate > 0 ? '현재 할인가' : '현재 정가'}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[30px] font-black tracking-tighter ${
                                        game.discountRate > 0 ? 'text-white/30 line-through' : 'text-white/40'
                                    }`}>
                                        {game.currentPrice.toLocaleString()}원
                                    </span>
                                    {game.discountRate > 0 && (
                                        <span className="text-sm font-black text-white/20">-{game.discountRate}%</span>
                                    )}
                                </div>
                                {game.discountRate > 0 && daysLeft !== null && daysLeft >= 0 && (
                                    <p className="text-[13px] text-white/25 font-bold mt-1">
                                        이번 할인 {daysLeft === 0 ? '오늘 종료' : `${daysLeft}일 남음`} — 역대최저 아님
                                    </p>
                                )}
                            </div>
                            {game.lowestPrice > 0 ? (
                                <div>
                                    <p className="text-[12px] text-green-400/70 font-black tracking-widest mb-0.5">역대최저가</p>
                                    <span className="text-[34px] font-black text-green-400 tracking-tighter drop-shadow-[0_0_16px_rgba(34,197,94,0.7)]">
                                        {game.lowestPrice.toLocaleString()}원
                                    </span>
                                </div>
                            ) : (
                                <p className="text-[13px] text-white/25 font-bold">역대 할인 이력 부족</p>
                            )}
                            {game.lowestPrice > 0 && game.currentPrice > game.lowestPrice && (
                                <p className="text-[14px] text-white/35 font-bold pt-1 border-t border-white/10">
                                    지금 사면 역대최저보다{' '}
                                    <span className="text-amber-400/90 font-black">
                                        +{(game.currentPrice - game.lowestPrice).toLocaleString()}원
                                    </span>{' '}
                                    비쌈
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* 핵심 수치: 메타크리틱 점수 + 플레이타임 */}
                {stats.length > 0 && (
                    <div className={`grid ${colClass} gap-2`}>
                        {stats.map(({ label, value, type, sub }) => (
                            <div key={label} className="relative overflow-hidden bg-white/[0.05] border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                                {type === 'score' && <div className="absolute -bottom-2 -right-2 opacity-[0.06] text-white"><span className="text-[56px] font-black leading-none">M</span></div>}
                                {type === 'time'  && <Clock className="absolute -bottom-1 -right-1 w-10 h-10 opacity-[0.06] text-white" />}

                                <p className="relative z-10 text-[11px] font-black text-white/35 tracking-widest mb-2 uppercase">{label}</p>

                                {/* 메타크리틱: 점수별 색상 코딩 + glow (progress bar 제거) */}
                                {type === 'score' && (
                                    <p className={`relative z-10 text-[32px] font-black leading-none ${scoreColor}`}>{value}</p>
                                )}

                                {/* 플레이타임: 시간 primary(크게) + 시성비 secondary(작게) */}
                                {type === 'time' && (
                                    <>
                                        <p className="relative z-10 text-[32px] font-black leading-none text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{value}</p>
                                        {sub && (
                                            <p className="relative z-10 text-[12px] text-white/40 font-bold mt-1.5">{sub}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* WAIT / TRACKING: 다음 할인 예상 */}
                {!isBuy && (
                    <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
                        <CalendarDays className={`w-5 h-5 shrink-0 ${isEstimatePast ? 'text-yellow-400 animate-pulse' : 'text-white/35'}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-black text-white/30 tracking-widest mb-0.5">다음 할인 예상</p>
                            <p className={`text-[18px] font-black leading-tight ${isEstimatePast ? 'text-yellow-400' : nextSale ? 'text-white' : 'text-white/35'}`}>
                                {isEstimatePast ? '곧 할인 가능성 높음' : nextSale ?? '패턴 데이터 부족'}
                            </p>
                        </div>
                    </div>
                )}

                {/* 브랜딩 */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-white/20 text-[13px] font-bold tracking-wider">PS 가격 추적 서비스</span>
                    <span className="text-white font-black text-[16px] tracking-widest">ps-signal.com</span>
                </div>
            </div>
        </div>
    );
}
