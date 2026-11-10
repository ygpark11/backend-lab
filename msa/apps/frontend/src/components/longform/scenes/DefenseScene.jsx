import React from 'react';
import { Flag } from 'lucide-react';
import { parseISO } from 'date-fns';
import { alpha, anim, clamp, ease, lerp, prog } from '../engine';
import { SALE_RED, fmtDate } from '../gameModel';
import { KineticText } from '../primitives';
import { countUp, riseIn } from '../motion';
import SceneTitle from './SceneTitle';

const SHIELD = 'M180 14 C 250 44, 312 50, 346 48 C 348 210, 316 330, 180 410 C 44 330, 12 210, 14 48 C 48 50, 110 44, 180 14 Z';

/** 금속 질감 티어 방패 — 3D 플립 등장 + 반사광 스윕 */
function TierShield({ lt, defense }) {
    const [hi, base, mid, dark] = defense.tier.metal;
    const flip = anim(lt, 0.3, 1.2, ease.spring);
    const sweep = prog(lt, 1.5, 0.8);
    const float = Math.sin(lt * 1.1) * 6;
    return (
        <div style={{ position: 'absolute', left: 240, top: 300, width: 360, height: 420, perspective: 1400 }}>
            <div style={{
                position: 'absolute', left: -120, top: -100, width: 600, height: 620, opacity: clamp(flip),
                background: `radial-gradient(circle, ${alpha(base, 0.35)} 0%, transparent 62%)`,
            }} />
            <div style={{ transform: `translateY(${float}px) rotateY(${lerp(105, 0, flip)}deg)`, transformStyle: 'preserve-3d', opacity: clamp(flip * 3) }}>
                <svg width="360" height="420" viewBox="0 0 360 424" style={{ overflow: 'visible', filter: `drop-shadow(0 26px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 30px ${alpha(base, 0.45)})` }}>
                    <defs>
                        <linearGradient id="lfMetal" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={hi} />
                            <stop offset="38%" stopColor={base} />
                            <stop offset="62%" stopColor={mid} />
                            <stop offset="100%" stopColor={dark} />
                        </linearGradient>
                        <linearGradient id="lfMetalEdge" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                            <stop offset="100%" stopColor={dark} />
                        </linearGradient>
                        <clipPath id="lfShieldClip"><path d={SHIELD} /></clipPath>
                        <linearGradient id="lfSheen" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                            <stop offset="50%" stopColor="#fff" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={SHIELD} fill="url(#lfMetal)" stroke="url(#lfMetalEdge)" strokeWidth="6" />
                    <path d={SHIELD} fill="none" stroke={alpha(dark, 0.6)} strokeWidth="2" transform="translate(180 212) scale(0.86) translate(-180 -212)" />
                    <text x="180" y="270" textAnchor="middle" fontSize="210" fontWeight="900" fill={alpha(dark, 0.92)} style={{ letterSpacing: '-0.04em' }}>
                        {defense.tierKey}
                    </text>
                    {sweep > 0 && sweep < 1 && (
                        <g clipPath="url(#lfShieldClip)">
                            <rect x={lerp(-260, 420, ease.inOutCubic(sweep))} y="-40" width="150" height="520" fill="url(#lfSheen)" transform="rotate(18 180 212)" />
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}

/** 추적 시작 → 다음 할인 예상까지의 타임라인 (할인 발생 지점이 차례로 점등) */
function SaleTimeline({ lt, defense, accent, nowMs }) {
    const x0 = 820;
    const x1 = 1800;
    const y = 800;
    const startMs = defense.trackingStart ? parseISO(defense.trackingStart).getTime() : nowMs - 180 * 86400000;
    const nextMs = defense.nextSale ? parseISO(defense.nextSale).getTime() : null;
    const endMs = Math.max(nowMs, nextMs ?? nowMs) + 20 * 86400000;
    const X = (ms) => x0 + ((ms - startMs) / (endMs - startMs)) * (x1 - x0);

    const rail = anim(lt, 1.9, 0.9, ease.outExpo);
    const sales = defense.saleDates.map((d) => parseISO(d).getTime()).filter((ms) => ms >= startMs);
    const flag = anim(lt, 3.3, 0.6, ease.outBack);
    const dash = anim(lt, 2.9, 0.6);

    return (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <line x1={x0} x2={lerp(x0, x1, rail)} y1={y} y2={y} stroke="rgba(255,255,255,0.22)" strokeWidth="3" strokeLinecap="round" />
            <text x={x0} y={y + 44} fill="rgba(255,255,255,0.45)" fontSize="17" fontWeight="800" opacity={rail}>추적 시작 {fmtDate(defense.trackingStart)}</text>
            {sales.map((ms, i) => {
                const p = anim(lt, 2.1 + i * 0.13, 0.45, ease.outBack);
                return (
                    <g key={ms} opacity={clamp(p * 2)}>
                        <circle cx={X(ms)} cy={y} r={12 * p} fill={SALE_RED} stroke="#0b0b14" strokeWidth="3" style={{ filter: `drop-shadow(0 0 10px ${SALE_RED})` }} />
                        <line x1={X(ms)} x2={X(ms)} y1={y - 16} y2={y - 16 - 26 * p} stroke={alpha(SALE_RED, 0.6)} strokeWidth="2" />
                    </g>
                );
            })}
            {/* 오늘 */}
            <g opacity={rail}>
                <line x1={X(nowMs)} x2={X(nowMs)} y1={y - 22} y2={y + 22} stroke="#fff" strokeWidth="3" />
                <text x={X(nowMs)} y={y - 34} textAnchor="middle" fill="#fff" fontSize="17" fontWeight="900">오늘</text>
            </g>
            {/* 다음 할인 예상 */}
            {nextMs && !defense.nextSalePast && (
                <g>
                    <line x1={X(nowMs)} x2={lerp(X(nowMs), X(nextMs), dash)} y1={y} y2={y} stroke={accent} strokeWidth="3" strokeDasharray="8 8" />
                    <g opacity={clamp(flag)} transform={`translate(${X(nextMs)} ${y - 30 * flag})`}>
                        <circle cx="0" cy={30} r="10" fill={accent} style={{ filter: `drop-shadow(0 0 12px ${accent})` }} />
                    </g>
                </g>
            )}
        </svg>
    );
}

/** 할인 방어력: 티어 방패 + 통계 타일 + 할인 타임라인 + 다음 할인 예상 */
export default function DefenseScene({ lt, model, accent, nowMs }) {
    const { defense } = model;
    const tiles = [
        defense.trackedMonths && { label: '추적 기간', value: defense.trackedMonths, unit: '개월' },
        { label: '할인 횟수', value: defense.discountCount, unit: '회' },
        defense.maxRate && { label: '최대 할인', value: defense.maxRate, unit: '%', color: SALE_RED },
        defense.monthsPerSale && { label: '할인 주기', value: defense.monthsPerSale, unit: '개월마다', decimals: defense.monthsPerSale < 10 ? 1 : 0, prefix: '약 ' },
    ].filter(Boolean);
    const nextLabel = defense.nextSale
        ? (defense.nextSalePast ? '예상 시점이 지났어요. 곧 할인할 수 있어요' : `${defense.nextSale.slice(0, 4)}년 ${Number(defense.nextSale.slice(5, 7))}월`)
        : null;

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <SceneTitle lt={lt} num={2} title="할인 방어력" sub="얼마나 자주, 얼마나 깊게 할인하는 게임일까요?" accent={accent} />

            <TierShield lt={lt} defense={defense} />
            <div style={{ position: 'absolute', left: 120, top: 760, width: 600, textAlign: 'center' }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                    <KineticText text={defense.tierText} t={lt} start={1.25} stagger={0.05} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.55)', marginTop: 10, letterSpacing: '0.08em', ...riseIn(lt, 1.7, 0.6, 12) }}>
                    {defense.tier.name.toUpperCase()}  ·  {defense.tier.desc}
                </div>
            </div>

            {/* 통계 타일 */}
            <div style={{ position: 'absolute', left: 820, top: 300, width: 980, display: 'grid', gridTemplateColumns: `repeat(${tiles.length > 2 ? 2 : tiles.length}, 1fr)`, gap: 18 }}>
                {tiles.map((tile, i) => (
                    <div key={tile.label} style={{
                        padding: '24px 30px', borderRadius: 22, background: 'rgba(16,16,28,0.72)', border: '1px solid rgba(255,255,255,0.1)',
                        ...riseIn(lt, 0.9 + i * 0.14, 0.7, 30),
                    }}>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>{tile.label}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                            {tile.prefix && <span style={{ fontSize: 30, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{tile.prefix}</span>}
                            <span style={{ fontSize: 76, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: tile.color ?? '#fff', fontVariantNumeric: 'tabular-nums' }}>
                                {countUp(tile.value, lt, 1.0 + i * 0.14, 1.1, tile.decimals ?? 0)}
                            </span>
                            <span style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.55)' }}>{tile.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            <SaleTimeline lt={lt} defense={defense} accent={accent} nowMs={nowMs} />
            {nextLabel && (
                <div style={{ position: 'absolute', right: 120, top: 860, display: 'flex', alignItems: 'center', gap: 12, ...riseIn(lt, 3.4, 0.6, 14) }}>
                    <Flag style={{ width: 26, height: 26, color: accent }} />
                    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)' }}>다음 할인 예상</span>
                    <span style={{ fontSize: 34, fontWeight: 900, color: accent, textShadow: `0 0 20px ${alpha(accent, 0.6)}` }}>{nextLabel}</span>
                </div>
            )}
            {defense.coldStart && (
                <div style={{ position: 'absolute', left: 820, top: 868, fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.42)', ...riseIn(lt, 3.9, 0.6, 10) }}>
                    추적 초기 데이터라 예측 정확도가 낮을 수 있어요
                </div>
            )}
        </div>
    );
}
