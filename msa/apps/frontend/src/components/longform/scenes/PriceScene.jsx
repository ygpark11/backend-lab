import React from 'react';
import { CalendarDays, Flame, TrendingDown, TrendingUp } from 'lucide-react';
import { alpha, anim, clamp, ease, lerp, prog } from '../engine';
import { SALE_RED, fmt, fmtDate } from '../gameModel';
import { Odometer } from '../primitives';
import { riseIn, slideIn } from '../motion';
import SceneTitle from './SceneTitle';

const GREEN = '#22c55e';

// ── 날짜 비례 계단형 가격 차트 ───────────────────────────────────────────
// 가격은 특정 날짜에 '뚝' 바뀌므로 곡선이 아니라 계단으로 그린다. X축은 실제 날짜 간격.
const CH = { x: 1010, y: 250, w: 790, h: 600, padL: 40, padR: 40, padT: 96, padB: 74 };

function PriceChart({ lt, price, accent }) {
    const steps = price.steps;
    const cx0 = CH.x + CH.padL;
    const cw = CH.w - CH.padL - CH.padR;
    const cy0 = CH.y + CH.padT;
    const ch = CH.h - CH.padT - CH.padB;

    const panel = anim(lt, 0.45, 0.9, ease.outExpo);
    const panelStyle = {
        position: 'absolute', left: CH.x, top: CH.y, width: CH.w, height: CH.h, borderRadius: 30,
        background: 'linear-gradient(160deg, rgba(20,20,34,0.82), rgba(10,10,18,0.72))',
        border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        opacity: clamp(panel * 1.5), transform: `translateX(${(1 - panel) * 90}px)`,
    };

    if (steps.length === 0) {
        return (
            <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                가격 기록을 모으는 중이에요
            </div>
        );
    }

    const minMs = steps[0].from;
    const maxMs = Math.max(steps[steps.length - 1].to, minMs + 86400000);
    const prices = steps.map((s) => s.price).concat(price.lowest ? [price.lowest] : []);
    const pMax = Math.max(...prices) * 1.04;
    const pMin = Math.min(...prices) * 0.86;
    const X = (ms) => cx0 + ((ms - minMs) / (maxMs - minMs)) * cw;
    const Y = (p) => cy0 + ch - ((p - pMin) / (pMax - pMin)) * ch;
    // 현재 구간은 항상 차트 오른쪽 끝까지 (기록이 오늘 하루뿐이어도 끊기지 않게)
    const stepTo = (s, i) => (i === steps.length - 1 ? maxMs : s.to);

    let d = `M ${X(steps[0].from)} ${Y(steps[0].price)}`;
    steps.forEach((s, i) => {
        d += ` H ${X(stepTo(s, i))}`;
        if (steps[i + 1]) d += ` V ${Y(steps[i + 1].price)}`;
    });
    const areaD = `${d} V ${cy0 + ch} H ${X(steps[0].from)} Z`;

    const scan = anim(lt, 1.6, 3.0, ease.inOutCubic);
    const headX = lerp(X(minMs), X(maxMs), scan);
    const headMs = lerp(minMs, maxMs, scan);
    const headStep = steps.find((s) => headMs >= s.from && headMs <= s.to) ?? steps[steps.length - 1];
    const done = lt >= 4.6;
    const last = steps[steps.length - 1];
    const endX = X(maxMs);
    const endY = Y(last.price);
    const isLowest = price.atl === 'new' || price.atl === 'equal';
    const endColor = isLowest ? GREEN : accent;

    // 월 눈금 (최대 6개)
    const ticks = [];
    const start = new Date(minMs);
    const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (cursor.getTime() < maxMs) {
        ticks.push(cursor.getTime());
        cursor.setMonth(cursor.getMonth() + 1);
    }
    const every = Math.max(1, Math.ceil(ticks.length / 6));
    const shownTicks = ticks.filter((_, i) => i % every === 0);

    const atlShow = anim(lt, 3.3, 0.6);
    const endShow = anim(lt, 4.6, 0.7, ease.outBack);

    return (
        <>
            <div style={panelStyle}>
                <div style={{ position: 'absolute', left: 40, top: 34, fontSize: 18, fontWeight: 900, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.6)' }}>가격 흐름</div>
                <div style={{ position: 'absolute', right: 40, top: 36, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ width: 18, height: 12, borderRadius: 3, background: alpha(SALE_RED, 0.28) }} /> 할인 기간
                </div>
            </div>
            <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: clamp(panel * 1.5), transform: `translateX(${(1 - panel) * 90}px)` }}>
                <defs>
                    <clipPath id="lfScan"><rect x={cx0 - 20} y={0} width={Math.max(0, headX - cx0 + 20)} height={1080} /></clipPath>
                    <linearGradient id="lfArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* 기준선 */}
                {[0.25, 0.5, 0.75].map((k) => (
                    <line key={k} x1={cx0} x2={cx0 + cw} y1={cy0 + ch * k} y2={cy0 + ch * k} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                {/* 할인 구간 음영 */}
                <g clipPath="url(#lfScan)">
                    {steps.map((s, i) => s.discounted && (
                        <rect key={s.from} x={X(s.from)} y={cy0} width={Math.max(2, X(stepTo(s, i)) - X(s.from))} height={ch} fill={alpha(SALE_RED, 0.1)} />
                    ))}
                    <path d={areaD} fill="url(#lfArea)" />
                    <path d={d} fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="4" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))' }} />
                    {/* 마지막(현재) 구간 강조 */}
                    <line x1={X(last.from)} x2={endX} y1={endY} y2={endY} stroke={endColor} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${endColor})` }} />
                </g>
                {/* 가격 변동 지점 */}
                {steps.slice(1).map((s) => {
                    // 플레이헤드가 지나간 거리만큼 튀어나온다 (스캐너 이징과 항상 동기)
                    const p = ease.outBack(clamp((headMs - s.from) / ((maxMs - minMs) * 0.05)));
                    return <circle key={s.from} cx={X(s.from)} cy={Y(s.price)} r={7 * p} fill={s.discounted ? SALE_RED : '#fff'} stroke="#0b0b14" strokeWidth="2.5" />;
                })}
                {/* 역대 최저 기준선 */}
                {price.lowest && (
                    <g opacity={atlShow}>
                        <line x1={cx0} x2={cx0 + cw} y1={Y(price.lowest)} y2={Y(price.lowest)} stroke={GREEN} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="10 8" />
                        <text x={cx0 + 6} y={Y(price.lowest) + 30} fill={GREEN} fontSize="19" fontWeight="900">역대 최저 {fmt(price.lowest)}원</text>
                    </g>
                )}
                {/* 스캐너 플레이헤드 */}
                {scan > 0 && scan < 1 && (
                    <g>
                        <line x1={headX} x2={headX} y1={cy0 - 10} y2={cy0 + ch} stroke="#fff" strokeOpacity="0.8" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 10px #fff)' }} />
                        <circle cx={headX} cy={Y(headStep.price)} r="9" fill="#fff" style={{ filter: 'drop-shadow(0 0 12px #fff)' }} />
                        <text x={headX + 14} y={Y(headStep.price) - 16} fill="#fff" fontSize="20" fontWeight="900">{fmt(headStep.price)}</text>
                    </g>
                )}
                {/* 현재가 펄스 + 콜아웃 */}
                {done && (
                    <g>
                        {[0, 0.5].map((k) => {
                            const ph = (((lt - 4.6) / 1.5) + k) % 1;
                            return <circle key={k} cx={endX} cy={endY} r={12 + ph * 46} fill="none" stroke={endColor} strokeWidth="3" opacity={(1 - ph) * 0.8} />;
                        })}
                        <circle cx={endX} cy={endY} r={11 * endShow} fill={endColor} style={{ filter: `drop-shadow(0 0 16px ${endColor})` }} />
                        <g opacity={clamp(endShow)} transform={`translate(${endX - 24} ${endY - 58 - (1 - endShow) * 20})`}>
                            <rect x={-196} y={-38} width={196} height={50} rx={12} fill={endColor} />
                            <text x={-98} y={-4} textAnchor="middle" fill="#05140a" fontSize="24" fontWeight="900">지금 {fmt(last.price)}원</text>
                        </g>
                    </g>
                )}
                {/* 날짜 눈금 */}
                {shownTicks.map((ms) => {
                    const dt = new Date(ms);
                    return (
                        <text key={ms} x={X(ms)} y={cy0 + ch + 40} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="17" fontWeight="800">
                            {`${String(dt.getFullYear()).slice(2)}.${String(dt.getMonth() + 1).padStart(2, '0')}`}
                        </text>
                    );
                })}
            </svg>
        </>
    );
}

/**
 * 가격: 정가 표시 → 취소선 → 할인가 오도미터 → 할인율 스탬프(쾅) → 절약/역대최저/마감
 *       우측은 날짜 비례 계단 차트를 스캐너가 훑고 지나가며 현재가에 콜아웃
 */
export default function PriceScene({ lt, model, accent }) {
    const { price } = model;
    const strike = anim(lt, 0.75, 0.35, ease.outCubic);
    const stamp = prog(lt, 2.4, 0.38);
    const stampE = ease.outBack(stamp, 2.4);
    const atlNew = price.atl === 'new';

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <SceneTitle lt={lt} num={1} title="가격 분석" sub="이번 할인, 숫자로 확인해볼게요" accent={accent} />

            <div style={{ position: 'absolute', left: 120, top: 330, width: 860 }}>
                {/* 정가 + 취소선 */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, ...riseIn(lt, 0.3, 0.6, 16) }}>
                    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>{price.original ? '정가' : '현재가'}</span>
                    {price.original && (
                        <span style={{ position: 'relative', fontSize: 44, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(price.original)}원
                            <span style={{ position: 'absolute', left: -6, top: '52%', height: 5, width: `calc(${strike * 100}% + 12px)`, background: SALE_RED, borderRadius: 3, boxShadow: `0 0 12px ${SALE_RED}`, transform: 'rotate(-4deg)', transformOrigin: 'left center' }} />
                        </span>
                    )}
                </div>

                {/* 할인가 오도미터 */}
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8, ...riseIn(lt, 0.9, 0.5, 20) }}>
                    <span style={{ fontSize: 184, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.045em', color: '#fff' }}>
                        <Odometer from={price.original ?? price.current} to={price.current} t={lt} start={1.0} dur={1.4} />
                    </span>
                    <span style={{ fontSize: 58, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginLeft: 14 }}>원</span>
                </div>

                {/* 할인율 스탬프 */}
                {price.rate > 0 && stamp > 0 && (
                    <div style={{
                        position: 'absolute', left: 470, top: -86,
                        transform: `rotate(-9deg) scale(${lerp(2.8, 1, stampE)})`, opacity: clamp(stamp * 4),
                        padding: '6px 22px 4px', border: `7px solid ${SALE_RED}`, borderRadius: 18,
                        color: SALE_RED, fontSize: 104, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em',
                        boxShadow: `0 0 40px ${alpha(SALE_RED, 0.45)}, inset 0 0 30px ${alpha(SALE_RED, 0.25)}`,
                        textShadow: `0 0 30px ${alpha(SALE_RED, 0.6)}`, background: 'rgba(10,6,8,0.55)',
                    }}>
                        -{price.rate}%
                    </div>
                )}

                {/* 칩: 절약액 / 역대최저 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 30 }}>
                    {price.savings > 0 && (
                        <Chip style={slideIn(lt, 3.0, 0.6, -40)} color={GREEN} Icon={TrendingDown}>{fmt(price.savings)}원 아낌</Chip>
                    )}
                    {price.atl && (
                        <Chip
                            style={slideIn(lt, 3.35, 0.6, -40)}
                            color={price.atl === 'above' ? SALE_RED : GREEN}
                            Icon={price.atl === 'above' ? TrendingUp : Flame}
                            strong={atlNew}
                            shine={atlNew ? prog(lt, 3.8, 0.9) : null}
                        >
                            {price.atl === 'new' && '역대 최저가 갱신'}
                            {price.atl === 'equal' && '역대 최저가와 같은 가격'}
                            {price.atl === 'above' && `역대 최저보다 ${fmt(price.gapToLowest)}원 비쌈`}
                        </Chip>
                    )}
                </div>

                {/* 할인 마감 */}
                {price.saleEndDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 34, fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.7)', ...riseIn(lt, 3.8, 0.6, 14) }}>
                        <CalendarDays style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.6)' }} />
                        할인 종료 {fmtDate(price.saleEndDate)}
                    </div>
                )}
            </div>

            <PriceChart lt={lt} price={price} accent={accent} />
        </div>
    );
}

function Chip({ children, color, Icon, style, strong = false, shine = null }) {
    return (
        <div style={{
            position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 22px', borderRadius: 14, fontSize: 26, fontWeight: 900, color,
            background: alpha(color, strong ? 0.18 : 0.1), border: `1.5px solid ${alpha(color, strong ? 0.7 : 0.4)}`,
            boxShadow: strong ? `0 0 34px ${alpha(color, 0.35)}` : 'none', ...style,
        }}>
            {shine !== null && shine > 0 && shine < 1 && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, width: 90, left: `${lerp(-20, 110, shine)}%`, transform: 'skewX(-20deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
            )}
            <Icon style={{ width: 26, height: 26, position: 'relative' }} />
            <span style={{ position: 'relative' }}>{children}</span>
        </div>
    );
}
