// 쇼츠 2.0 전용 결정적(pure t) 모션 인포그래픽 모듈
// 롱폼(PriceScene / DefenseScene / QualityScene / VerdictScene)의 시각화 밀도를 9:16 세이프존에 맞춰 압축 구현한다.
import React, { useId, useMemo } from 'react';
import { CalendarDays, Clock, TrendingDown, Users } from 'lucide-react';
import { alpha, anim, clamp, ease, lerp, mixHex, mulberry32, noise1, prog } from '../longform/engine';
import { NEUTRAL_ACCENT, SALE_RED, fmt, fmtDate } from '../longform/gameModel';
import { KineticText, PsSymbol, Ring } from '../longform/primitives';
import { countUp, riseIn } from '../longform/motion';

const GREEN = '#22c55e';
const SHIELD_PATH = 'M180 14 C 250 44, 312 50, 346 48 C 348 210, 316 330, 180 410 C 44 330, 12 210, 14 48 C 48 50, 110 44, 180 14 Z';

/** 3D 금속 질감 할인 방어력 방패 (회전 등장 + 내부 베벨 + 반사광 스윕 + 주기 표시) */
export function MiniTierShield({ lt, start = 2.28, defense, width = 224 }) {
    const uid = useId().replace(/:/g, '');
    if (!defense) return null;
    const [hi, base, mid, dark] = defense.tier.metal;
    const flip = anim(lt, start, 0.72, ease.spring);
    const sweep = prog(lt, start + 0.65, 0.55);
    const float = Math.sin(lt * 2.1) * 4;
    const metalId = `shMetal_${uid}`;
    const edgeId = `shEdge_${uid}`;
    const clipId = `shClip_${uid}`;
    const sheenId = `shSheen_${uid}`;

    const cycle = defense.monthsPerSale ? `${Math.round(defense.monthsPerSale * 10) / 10}개월 주기` : null;
    const subParts = [defense.discountCount > 0 && `할인 ${defense.discountCount}회`, cycle].filter(Boolean);

    return (
        <div style={{
            width, height: '100%', borderRadius: 24, padding: '16px 12px',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(10,12,20,0.75))',
            border: `1.5px solid ${alpha(base, 0.42)}`,
            boxShadow: `0 16px 38px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
            opacity: clamp(flip * 2),
        }}>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.62)' }}>
                할인 방어력
            </div>
            <div style={{ perspective: 900, width: 112, height: 132, position: 'relative' }}>
                <div style={{
                    position: 'absolute', inset: -22,
                    background: `radial-gradient(circle, ${alpha(base, 0.36)} 0%, transparent 66%)`,
                }} />
                <div style={{ transform: `translateY(${float}px) rotateY(${lerp(95, 0, flip)}deg)`, transformStyle: 'preserve-3d' }}>
                    <svg width="112" height="132" viewBox="0 0 360 424" style={{ overflow: 'visible', filter: `drop-shadow(0 12px 22px rgba(0,0,0,0.6)) drop-shadow(0 0 16px ${alpha(base, 0.45)})` }}>
                        <defs>
                            <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={hi} />
                                <stop offset="38%" stopColor={base} />
                                <stop offset="62%" stopColor={mid} />
                                <stop offset="100%" stopColor={dark} />
                            </linearGradient>
                            <linearGradient id={edgeId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                                <stop offset="100%" stopColor={dark} />
                            </linearGradient>
                            <clipPath id={clipId}><path d={SHIELD_PATH} /></clipPath>
                            <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                                <stop offset="50%" stopColor="#fff" stopOpacity="0.88" />
                                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={SHIELD_PATH} fill={`url(#${metalId})`} stroke={`url(#${edgeId})`} strokeWidth="8" />
                        <path d={SHIELD_PATH} fill="none" stroke={alpha(dark, 0.55)} strokeWidth="3" transform="translate(180 212) scale(0.86) translate(-180 -212)" />
                        <text x="180" y="270" textAnchor="middle" fontSize="205" fontWeight="900" fill={alpha(dark, 0.92)} style={{ letterSpacing: '-0.04em' }}>
                            {defense.tierKey}
                        </text>
                        {sweep > 0 && sweep < 1 && (
                            <g clipPath={`url(#${clipId})`}>
                                <rect x={lerp(-240, 420, ease.inOutCubic(sweep))} y="-40" width="150" height="520" fill={`url(#${sheenId})`} transform="rotate(18 180 212)" />
                            </g>
                        )}
                    </svg>
                </div>
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {defense.tierText}
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: 'rgba(255,255,255,0.68)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {subParts.join(' · ') || defense.tier.desc}
                </div>
            </div>
        </div>
    );
}

/** 날짜 비례 계단형 가격 이력 차트 (스캐너 플레이헤드 + 최저가 점등 + 우측 펄스 여유 확보) */
export function MiniPriceChart({ lt, start = 2.32, price, accent, width, height = 286 }) {
    const uid = useId().replace(/:/g, '');
    const panel = anim(lt, start - 0.1, 0.45, ease.outExpo);
    const steps = price.steps ?? [];
    const padL = 26;
    const padR = 46; // 완료 펄스 링(반경 ~40px)이 우측 경계에 잘리지 않도록 여유 확보
    const padT = 60;
    const padB = 48;
    const cw = width - padL - padR;
    const ch = height - padT - padB;

    const cardStyle = {
        position: 'relative', width, height, borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(20,22,36,0.88), rgba(10,12,20,0.78))',
        border: '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.08)',
        opacity: clamp(panel * 1.6),
        transform: `translateY(${(1 - panel) * 28}px)`,
    };

    if (steps.length < 2) {
        const dropP = anim(lt, start + 0.15, 0.75, ease.outExpo);
        const barPct = price.rate > 0 ? Math.max(16, price.rate * dropP) : 20 * dropP;
        return (
            <div style={{ ...cardStyle, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.72)' }}>
                    <TrendingDown size={22} color={SALE_RED} /> 가격 비교
                </div>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.72)', marginBottom: 10 }}>
                        {price.original ? `정가 ${fmt(price.original)}원 → 현재 ${fmt(price.current)}원` : `현재 판매가 ${fmt(price.current)}원`}
                    </div>
                    <div style={{ height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${barPct}%`,
                            borderRadius: 999,
                            background: `linear-gradient(90deg, ${NEUTRAL_ACCENT}, ${SALE_RED})`,
                            boxShadow: `0 0 18px ${alpha(SALE_RED, 0.45)}`,
                        }} />
                    </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>
                    {price.lowest
                        ? `역대 최저가 ${fmt(price.lowest)}원`
                        : price.rate > 0
                            ? `이번 세일 ${price.rate}% 할인`
                            : '실시간 가격 추적 중'}
                </div>
            </div>
        );
    }

    const minMs = steps[0].from;
    const maxMs = Math.max(steps[steps.length - 1].to, minMs + 86400000);
    const prices = steps.map((s) => s.price).concat(price.lowest ? [price.lowest] : []);
    const pMax = Math.max(...prices) * 1.06;
    const pMin = Math.min(...prices) * 0.84;
    const X = (ms) => padL + ((ms - minMs) / (maxMs - minMs)) * cw;
    const Y = (p) => padT + ch - ((p - pMin) / (pMax - pMin)) * ch;
    const stepTo = (s, i) => (i === steps.length - 1 ? maxMs : s.to);

    let d = `M ${X(steps[0].from)} ${Y(steps[0].price)}`;
    steps.forEach((s, i) => {
        d += ` H ${X(stepTo(s, i))}`;
        if (steps[i + 1]) d += ` V ${Y(steps[i + 1].price)}`;
    });
    const areaD = `${d} V ${padT + ch} H ${X(steps[0].from)} Z`;

    const scanDur = 1.25;
    const scan = anim(lt, start + 0.15, scanDur, ease.inOutCubic);
    const headX = lerp(X(minMs), X(maxMs), scan);
    const headMs = lerp(minMs, maxMs, scan);
    const headStep = steps.find((s) => headMs >= s.from && headMs <= s.to) ?? steps[steps.length - 1];
    const doneAt = start + 0.15 + scanDur;
    const done = lt >= doneAt;
    const last = steps[steps.length - 1];
    const endX = X(maxMs);
    const endY = Y(last.price);
    const isLowest = price.atl === 'new' || price.atl === 'equal';
    const endColor = isLowest ? GREEN : accent;
    const endShow = anim(lt, doneAt, 0.45, ease.outBack);

    const scanClipId = `scScan_${uid}`;
    const areaGradId = `scArea_${uid}`;
    const startLabel = steps[0].date.slice(2, 7).replace('-', '.');
    const endDateObj = new Date(maxMs);
    const endDateLabel = `${String(endDateObj.getFullYear()).slice(2)}.${String(endDateObj.getMonth() + 1).padStart(2, '0')}`;

    return (
        <div style={cardStyle}>
            <div style={{ position: 'absolute', left: 26, top: 18, right: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.78)' }}>가격 추이</span>
                <span style={{ fontSize: 21, fontWeight: 900, color: endColor }}>
                    {isLowest ? `역대 최저 ${fmt(price.lowest)}원` : `현재 ${fmt(price.current)}원`}
                </span>
            </div>

            <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                    <clipPath id={scanClipId}><rect x={padL - 8} y={0} width={Math.max(0, headX - padL + 8)} height={height} /></clipPath>
                    <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[0.25, 0.5, 0.75].map((k) => (
                    <line key={k} x1={padL} x2={padL + cw} y1={padT + ch * k} y2={padT + ch * k} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}

                <g clipPath={`url(#${scanClipId})`}>
                    {steps.map((s, i) => s.discounted && (
                        <rect key={s.from} x={X(s.from)} y={padT} width={Math.max(2, X(stepTo(s, i)) - X(s.from))} height={ch} fill={alpha(SALE_RED, 0.14)} />
                    ))}
                    <path d={areaD} fill={`url(#${areaGradId})`} />
                    <path d={d} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }} />
                    <line x1={X(last.from)} x2={endX} y1={endY} y2={endY} stroke={endColor} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${endColor})` }} />
                </g>

                {steps.slice(1).map((s) => {
                    const p = ease.outBack(clamp((headMs - s.from) / ((maxMs - minMs) * 0.06)));
                    return <circle key={s.from} cx={X(s.from)} cy={Y(s.price)} r={6.5 * p} fill={s.discounted ? SALE_RED : '#fff'} stroke="#0b0b14" strokeWidth="2.5" />;
                })}

                {price.lowest && (
                    <line x1={padL} x2={padL + cw} y1={Y(price.lowest)} y2={Y(price.lowest)} stroke={GREEN} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="8 6" />
                )}

                {scan > 0 && scan < 1 && (
                    <g>
                        <line x1={headX} x2={headX} y1={padT - 4} y2={padT + ch} stroke="#fff" strokeOpacity="0.78" strokeWidth="2" />
                        <circle cx={headX} cy={Y(headStep.price)} r="8" fill="#fff" style={{ filter: 'drop-shadow(0 0 10px #fff)' }} />
                    </g>
                )}

                {done && (
                    <g>
                        {[0, 0.5].map((k) => {
                            const ph = (((lt - doneAt) / 1.3) + k) % 1;
                            return <circle key={k} cx={endX} cy={endY} r={10 + ph * 30} fill="none" stroke={endColor} strokeWidth="3" opacity={(1 - ph) * 0.8} />;
                        })}
                        <circle cx={endX} cy={endY} r={9 * endShow} fill={endColor} style={{ filter: `drop-shadow(0 0 12px ${endColor})` }} />
                    </g>
                )}

                <text x={padL} y={height - 14} fill="rgba(255,255,255,0.48)" fontSize="18" fontWeight="800">
                    {startLabel}
                </text>
                <text x={padL + cw} y={height - 14} textAnchor="end" fill="rgba(255,255,255,0.58)" fontSize="18" fontWeight="800">
                    {endDateLabel}
                </text>
            </svg>
        </div>
    );
}

const scoreColor = (s) => (s >= 75 ? GREEN : s >= 50 ? '#facc15' : '#f87171');

/** 메타·유저 이중 링 게이지 + 플레이타임 바 + 시간당 가격 통합 대시보드 (quality 미제공 시 할인 상세 브리핑) */
export function QualityDashboard({ lt, start = 2.65, model, accent, width = 826, height = 250 }) {
    const { quality, price, defense, meta } = model;
    const panel = anim(lt, start, 0.45, ease.outExpo);
    if (panel <= 0) return null;

    const cardStyle = {
        width, height, borderRadius: 24, padding: '20px 26px', overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(255,255,255,0.065), rgba(10,12,20,0.75))',
        border: '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: '0 18px 42px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 28,
        opacity: clamp(panel * 1.6),
        transform: `translateY(${(1 - panel) * 28}px)`,
    };

    // quality(메타/플레이타임) 데이터가 전혀 없는 타이틀 전용 알찬 브리핑 뷰
    if (!quality) {
        return (
            <div style={cardStyle}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontSize: 34, fontWeight: 900, color: '#fff' }}>
                            {price.savings > 0 ? `정가 대비 ${fmt(price.savings)}원 절약` : `현재가 ${fmt(price.current)}원`}
                        </div>
                        {price.saleEndDate && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 12,
                                background: alpha(SALE_RED, 0.14), border: `1.5px solid ${alpha(SALE_RED, 0.45)}`,
                                fontSize: 22, fontWeight: 900, color: SALE_RED, whiteSpace: 'nowrap',
                            }}>
                                <CalendarDays size={20} /> {fmtDate(price.saleEndDate)} 마감
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        {price.lowest && (
                            <span style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.82)' }}>
                                역대 최저 {fmt(price.lowest)}원
                            </span>
                        )}
                        {defense?.trackingStart && (
                            <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.58)' }}>
                                · {fmtDate(defense.trackingStart)}부터 추적 중
                            </span>
                        )}
                        {meta.inCatalog && (
                            <span style={{
                                padding: '5px 14px', borderRadius: 999, fontSize: 22, fontWeight: 900,
                                color: '#38bdf8', background: alpha('#38bdf8', 0.14), border: `1.5px solid ${alpha('#38bdf8', 0.5)}`,
                            }}>
                                PS Plus 카탈로그 무료
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const hasMeta = Boolean(quality.meta);
    const hasTime = Boolean(quality.main);
    const metaVal = quality.meta ?? 0;
    const metaFill = anim(lt, start + 0.1, 1.0, ease.outCubic);
    const userFill = anim(lt, start + 0.35, 0.9, ease.outCubic);
    const timeFill = anim(lt, start + 0.2, 0.85, ease.outExpo);

    const bars = [
        quality.main && { label: '메인', value: quality.main },
        quality.extra && { label: '추가', value: quality.extra },
    ].filter(Boolean);
    const maxBar = Math.max(...bars.map((b) => b.value), 1);

    return (
        <div style={cardStyle}>
            {hasMeta && (
                <div style={{ position: 'relative', width: quality.user ? 210 : 168, height: 176, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <Ring size={162} stroke={14} value={(metaVal / 100) * metaFill} color={scoreColor(metaVal)} glow={16}>
                        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.16em', color: alpha(scoreColor(metaVal), 0.9) }}>META</div>
                        <div style={{ fontSize: 60, fontWeight: 900, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                            {countUp(metaVal, lt, start + 0.1, 1.0)}
                        </div>
                    </Ring>
                    {quality.user && (
                        <div style={{ position: 'absolute', right: 0, bottom: 0, borderRadius: '50%', background: '#0b0d16', padding: 5, boxShadow: '0 8px 20px rgba(0,0,0,0.7)' }}>
                            <Ring size={86} stroke={8} value={(quality.user / 10) * userFill} color={scoreColor(quality.user * 10)} glow={10}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.65)' }}>
                                    <Users size={11} /> USER
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.05, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                                    {countUp(quality.user, lt, start + 0.35, 0.9, 1)}
                                </div>
                            </Ring>
                        </div>
                    )}
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 11 }}>
                {hasTime ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Clock size={22} color="rgba(255,255,255,0.7)" />
                                <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                                    메인 {countUp(quality.main, lt, start + 0.2, 0.8)}시간
                                </span>
                            </div>
                            {quality.perHour && (
                                <div style={{
                                    padding: '6px 16px', borderRadius: 12,
                                    background: alpha(accent, 0.16), border: `1.5px solid ${alpha(accent, 0.45)}`,
                                    fontSize: 24, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap',
                                }}>
                                    시간당 {fmt(quality.perHour)}원
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {bars.map((b, i) => (
                                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 46, fontSize: 21, fontWeight: 800, color: 'rgba(255,255,255,0.62)' }}>{b.label}</div>
                                    <div style={{ flex: 1, height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.09)', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(b.value / maxBar) * 100 * timeFill}%`,
                                            borderRadius: 999,
                                            background: i === 0 ? `linear-gradient(90deg, ${alpha(accent, 0.75)}, ${accent})` : 'rgba(255,255,255,0.4)',
                                        }} />
                                    </div>
                                    <div style={{ width: 64, textAlign: 'right', fontSize: 23, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{b.value}h</div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>
                        {price.savings > 0 ? `이번 세일 ${fmt(price.savings)}원 절약` : '실시간 가격 추적 타이틀'}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', overflow: 'hidden', alignItems: 'center' }}>
                    {meta.inCatalog && (
                        <span style={{
                            padding: '5px 14px', borderRadius: 999, fontSize: 22, fontWeight: 900, whiteSpace: 'nowrap',
                            color: '#38bdf8', background: alpha('#38bdf8', 0.14), border: `1.5px solid ${alpha('#38bdf8', 0.5)}`,
                        }}>
                            PS Plus 카탈로그 무료
                        </span>
                    )}
                    {quality.tags?.slice(0, meta.inCatalog ? 1 : 2).map((tag) => (
                        <span key={tag.name} style={{
                            padding: '5px 14px', borderRadius: 999, fontSize: 22, fontWeight: 800, whiteSpace: 'nowrap',
                            color: tag.color, background: alpha(tag.color, 0.12), border: `1.5px solid ${alpha(tag.color, 0.45)}`,
                        }}>
                            {tag.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

const ORDER = ['circle', 'triangle', 'cross', 'square'];
const SPIN_COLOR = '#e5e7eb';
const CELL = 104;
const outQuint = (p) => 1 - Math.pow(1 - p, 5);

function reelPos(lt, spinStart, landAt, final) {
    const base = final * outQuint(prog(lt, spinStart, landAt - spinStart));
    if (lt < landAt) return base;
    const k = lt - landAt;
    return final + 0.12 * Math.exp(-7 * k) * Math.sin(24 * k);
}

/** 초고속 판정 슬롯 릴 + 충격파/파편/글리치/레이더 착지 배너 */
export function VerdictReelBanner({ lt, verdictAt, verdict, width = 826, height = 192 }) {
    const spinDur = 0.48;
    const landAt = verdictAt + spinDur;
    const show = anim(lt, verdictAt, 0.2, ease.outCubic);

    const shards = useMemo(() => {
        const rnd = mulberry32(888);
        return Array.from({ length: 14 }, () => {
            const a = rnd() * Math.PI * 2;
            const speed = 210 + rnd() * 340;
            return {
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - 60,
                spin: (rnd() - 0.5) * 720,
                size: 12 + rnd() * 14,
                kind: verdict.symbol,
                color: rnd() < 0.3 ? '#ffffff' : verdict.color,
                life: 0.55 + rnd() * 0.35,
            };
        });
    }, [verdict.color, verdict.symbol]);

    if (show <= 0) return null;

    const target = ORDER.indexOf(verdict.symbol);
    const final = 3 * 4 + (target >= 0 ? target : 0);
    const pos = reelPos(lt, verdictAt, landAt, final);
    const speed = Math.abs(reelPos(lt + 1 / 60, verdictAt, landAt, final) - pos) * 60;
    const landed = lt >= landAt;
    const landP = anim(lt, landAt, 0.35);
    const tImpact = lt - landAt;
    const blur = Math.min(10, speed * 0.45);
    const pulse = landed ? 1 + 0.18 * Math.exp(-6 * tImpact) * Math.cos(12 * tImpact) : 1;

    // WAIT: 라벨 글리치
    const glitching = landed && verdict.key === 'WAIT' && tImpact > 0.6 && ((tImpact - 0.6) % 1.4) < 0.14;
    const gx = glitching ? noise1(lt * 90) * 10 : 0;

    const items = [];
    for (let j = Math.floor(pos) - 1; j <= Math.floor(pos) + 2; j++) {
        if (j < 0 || (landed && j !== final)) continue;
        const kind = ORDER[j % 4];
        const isFinal = j === final;
        const color = isFinal && landed ? mixHex(SPIN_COLOR, verdict.color, landP) : SPIN_COLOR;
        items.push({ j, kind, y: (j - pos) * CELL, color, isFinal });
    }

    return (
        <div style={{
            position: 'relative', width, height, borderRadius: 26, padding: '22px 28px',
            background: landed ? alpha(verdict.color, 0.15) : 'rgba(255,255,255,0.06)',
            border: `2px solid ${landed ? alpha(verdict.color, 0.68) : 'rgba(255,255,255,0.18)'}`,
            boxShadow: landed ? `0 18px 46px rgba(0,0,0,0.55), 0 0 54px ${alpha(verdict.color, 0.28)}` : '0 14px 36px rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', gap: 26,
            opacity: clamp(show * 1.6),
            overflow: 'hidden',
        }}>
            {landed && tImpact < 0.4 && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `radial-gradient(circle at 86px 96px, rgba(255,255,255,0.45), ${alpha(verdict.color, 0.25)} 40%, transparent 72%)`,
                    opacity: Math.pow(1 - tImpact / 0.4, 2),
                }} />
            )}

            {/* 슬롯 릴 창 */}
            <div style={{
                position: 'relative', width: 112, height: 124, flexShrink: 0, overflow: 'hidden',
                WebkitMaskImage: landed ? undefined : 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
                maskImage: landed ? undefined : 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
            }}>
                {items.map((it) => (
                    <div key={it.j} style={{
                        position: 'absolute', left: 14, top: 20 + it.y,
                        transform: `scale(${landed ? pulse : 1})`,
                        filter: blur > 0.6 ? `blur(${blur.toFixed(1)}px)` : undefined,
                    }}>
                        <PsSymbol kind={it.kind} size={84} color={it.color} strokeWidth={10} glow={it.isFinal && landed ? 16 : 6} />
                    </div>
                ))}
            </div>

            {/* 충격파 링 + TRACKING 레이더 + 파편 */}
            {landed && tImpact < 0.85 && (
                <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[0, 0.1].map((delay) => {
                        const p = prog(tImpact, delay, 0.6);
                        if (p <= 0 || p >= 1) return null;
                        return <circle key={delay} cx={84} cy={96} r={34 + 260 * ease.outCubic(p)} fill="none" stroke={verdict.color} strokeWidth={6 * (1 - p)} opacity={1 - p} />;
                    })}
                </svg>
            )}
            {landed && verdict.key === 'TRACKING' && [0, 0.5].map((k) => {
                const ph = ((tImpact / 1.6) + k) % 1;
                return (
                    <div key={k} style={{
                        position: 'absolute', left: 84 - (42 + ph * 68), top: 96 - (42 + ph * 68),
                        width: (42 + ph * 68) * 2, height: (42 + ph * 68) * 2, borderRadius: '50%',
                        border: `2px solid ${alpha(verdict.color, 0.55 * (1 - ph))}`, pointerEvents: 'none',
                    }} />
                );
            })}
            {landed && tImpact < 0.9 && (
                <div style={{ position: 'absolute', left: 84, top: 96, pointerEvents: 'none' }}>
                    {shards.map((s, i) => {
                        if (tImpact > s.life) return null;
                        const x = s.vx * tImpact;
                        const y = s.vy * tImpact + 260 * tImpact * tImpact;
                        return (
                            <div key={i} style={{
                                position: 'absolute', left: x - s.size / 2, top: y - s.size / 2,
                                transform: `rotate(${s.spin * tImpact}deg)`, opacity: 1 - tImpact / s.life,
                            }}>
                                <PsSymbol kind={s.kind} size={s.size} color={s.color} strokeWidth={14} />
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2 }}>
                <div style={{ position: 'relative', fontSize: 50, fontWeight: 900, color: landed ? verdict.color : '#fff', lineHeight: 1.08, textShadow: landed ? `0 0 28px ${alpha(verdict.color, 0.5)}` : undefined }}>
                    {glitching && (
                        <>
                            <span style={{ position: 'absolute', left: gx, top: 0, color: '#ff2d55', opacity: 0.7, mixBlendMode: 'screen' }}>{verdict.label}</span>
                            <span style={{ position: 'absolute', left: -gx, top: 2, color: '#00e5ff', opacity: 0.7, mixBlendMode: 'screen' }}>{verdict.label}</span>
                        </>
                    )}
                    <span style={{ position: 'relative' }}>
                        {landed
                            ? <KineticText text={verdict.label} t={lt} start={landAt} stagger={0.04} dur={0.28} mode="slam" />
                            : '가격 신호 확인 중'}
                    </span>
                </div>
                <div style={{
                    fontSize: 25, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 1.3,
                    ...riseIn(lt, landAt + 0.12, 0.35, 14),
                }}>
                    {verdict.reason}
                </div>
            </div>
        </div>
    );
}
