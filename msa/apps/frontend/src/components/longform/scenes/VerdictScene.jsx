import React, { useMemo } from 'react';
import { alpha, anim, ease, mixHex, mulberry32, noise1, prog } from '../engine';
import { SALE_RED, fmt } from '../gameModel';
import { KineticText, PsSymbol } from '../primitives';
import { riseIn } from '../motion';

// 판정 4단계(가격신호등)를 도는 릴. 회전 중에는 무채색, 착지한 판정 심볼만 판정 색으로 물든다
const ORDER = ['circle', 'triangle', 'cross', 'square'];
const SPIN_COLOR = '#e5e7eb';
const CELL = 300;
const CX = 960;
const CY = 390;
export const VERDICT_LAND = 2.6; // 룰렛이 멈추는 시점 (씬 시작 기준)
const SPIN_START = 0.4;

const outQuint = (p) => 1 - Math.pow(1 - p, 5);

function reelPos(lt, final) {
    const base = final * outQuint(prog(lt, SPIN_START, VERDICT_LAND - SPIN_START));
    if (lt < VERDICT_LAND) return base;
    const k = lt - VERDICT_LAND;
    return final + 0.1 * Math.exp(-7 * k) * Math.sin(26 * k); // 착지 후 미세한 반동
}

/** 착지 순간 사방으로 튀는 파편 — 판정 심볼과 같은 모양만 쓴다 (시드 고정) */
function useShards(color, kind) {
    return useMemo(() => {
        const rnd = mulberry32(777);
        return Array.from({ length: 32 }, () => {
            const a = rnd() * Math.PI * 2;
            const speed = 520 + rnd() * 900;
            return {
                vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 260, spin: (rnd() - 0.5) * 900,
                size: 16 + rnd() * 30, kind, white: rnd() < 0.35, life: 1.0 + rnd() * 0.8,
            };
        }).map((s) => ({ ...s, color: s.white ? '#ffffff' : color }));
    }, [color, kind]);
}

/**
 * 최종 판정: 슬롯 릴처럼 ○△×□가 돌다가 판정 심볼에 착지 → 충격파·파편·플래시
 *           → 판정 라벨이 쾅 박히고 근거 한 줄과 핵심 지표 요약
 */
export default function VerdictScene({ lt, model }) {
    const { verdict, price, quality } = model;
    const target = ORDER.indexOf(verdict.symbol);
    const final = 5 * 4 + target;
    const pos = reelPos(lt, final);
    const speed = Math.abs(reelPos(lt + 1 / 60, final) - pos) * 60;
    const landed = lt >= VERDICT_LAND;
    const landP = anim(lt, VERDICT_LAND, 0.45);
    const shards = useShards(verdict.color, verdict.symbol);
    const tImpact = lt - VERDICT_LAND;

    const items = [];
    for (let j = Math.floor(pos) - 1; j <= Math.floor(pos) + 2; j++) {
        // 착지 후에는 판정 심볼만 남긴다 (이웃 심볼의 글로우가 창 가장자리로 비치지 않게)
        if (j < 0 || (landed && j !== final)) continue;
        const kind = ORDER[j % 4];
        const isFinal = j === final;
        const color = isFinal && landed ? mixHex(SPIN_COLOR, verdict.color, landP) : SPIN_COLOR;
        items.push({ j, kind, y: (j - pos) * CELL, color, isFinal });
    }
    const blur = Math.min(14, speed * 0.55);
    const stretch = 1 + Math.min(0.35, speed * 0.012);
    const pulse = landed ? 1 + 0.25 * Math.exp(-6 * tImpact) * Math.cos(12 * tImpact) * (1 - landP * 0.2) : 1;

    // WAIT: 라벨 글리치 (1.4초마다 0.14초)
    const glitching = verdict.key === 'WAIT' && lt > 3.4 && ((lt - 3.4) % 1.4) < 0.14;
    const gx = glitching ? noise1(lt * 90) * 14 : 0;

    const recap = [
        { label: '가격', value: `${fmt(price.current)}원`, sub: price.rate ? `-${price.rate}%` : null, subColor: SALE_RED },
        quality?.meta && { label: '메타크리틱', value: String(quality.meta), sub: quality.user ? `유저 ${quality.user.toFixed(1)}` : null },
        quality?.main && { label: '플레이타임', value: `${quality.main}시간`, sub: quality.perHour ? `시간당 ${fmt(quality.perHour)}원` : null },
    ].filter(Boolean);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            {/* 스포트라이트 */}
            <div style={{
                position: 'absolute', left: CX - 900, top: CY - 900, width: 1800, height: 1800,
                background: `radial-gradient(circle, ${alpha(verdict.color, 0.32 * landP)} 0%, ${alpha(verdict.color, 0.08 * landP)} 30%, transparent 60%)`,
            }} />

            <div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', fontSize: 22, fontWeight: 900, letterSpacing: '0.5em', color: 'rgba(255,255,255,0.6)', ...riseIn(lt, -0.1, 0.7, 14) }}>
                FINAL VERDICT
            </div>

            {/* 릴 */}
            <div style={{
                position: 'absolute', left: CX - 200, top: CY - 190, width: 400, height: 380, overflow: 'hidden',
                WebkitMaskImage: landed ? undefined : 'linear-gradient(to bottom, transparent, #000 25%, #000 75%, transparent)',
                maskImage: landed ? undefined : 'linear-gradient(to bottom, transparent, #000 25%, #000 75%, transparent)',
                opacity: anim(lt, 0, 0.4),
            }}>
                {items.map((it) => (
                    <div key={it.j} style={{
                        position: 'absolute', left: 50, top: 40 + it.y,
                        transform: `scaleY(${landed ? pulse : stretch}) scaleX(${landed ? pulse : 1})`,
                        filter: blur > 0.6 ? `blur(${blur}px)` : undefined,
                    }}>
                        <PsSymbol kind={it.kind} size={CELL} color={it.color} strokeWidth={9} glow={it.isFinal && landed ? 34 : 12} />
                    </div>
                ))}
            </div>

            {/* TRACKING: 레이더 */}
            {verdict.key === 'TRACKING' && landed && [0, 0.5].map((k) => {
                const ph = ((tImpact / 1.8) + k) % 1;
                return <div key={k} style={{ position: 'absolute', left: CX - 160 - ph * 220, top: CY - 160 - ph * 220, width: 320 + ph * 440, height: 320 + ph * 440, borderRadius: '50%', border: `2px solid ${alpha(verdict.color, 0.6 * (1 - ph))}` }} />;
            })}

            {/* 충격파 + 파편 */}
            {landed && tImpact < 1.8 && (
                <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                    {[0, 0.12].map((delay) => {
                        const p = prog(tImpact, delay, 0.9);
                        if (p <= 0 || p >= 1) return null;
                        return <circle key={delay} cx={CX} cy={CY} r={150 + 900 * ease.outCubic(p)} fill="none" stroke={verdict.color} strokeWidth={14 * (1 - p)} opacity={1 - p} />;
                    })}
                </svg>
            )}
            {landed && shards.map((s, i) => {
                const k = tImpact;
                if (k > s.life) return null;
                const x = CX + s.vx * k;
                const y = CY + s.vy * k + 700 * k * k;
                return (
                    <div key={i} style={{ position: 'absolute', left: x - s.size / 2, top: y - s.size / 2, transform: `rotate(${s.spin * k}deg)`, opacity: 1 - k / s.life }}>
                        <PsSymbol kind={s.kind} size={s.size} color={s.color} strokeWidth={14} />
                    </div>
                );
            })}

            {/* 판정 라벨 */}
            <div style={{ position: 'absolute', top: 610, left: 0, right: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>
                <div style={{ position: 'relative', display: 'inline-block', fontSize: 150, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: verdict.color, textShadow: `0 0 50px ${alpha(verdict.color, 0.65)}` }}>
                    {glitching && (
                        <>
                            <span style={{ position: 'absolute', left: gx, top: 0, color: '#ff2d55', opacity: 0.7, mixBlendMode: 'screen' }}>{verdict.label}</span>
                            <span style={{ position: 'absolute', left: -gx, top: 3, color: '#00e5ff', opacity: 0.7, mixBlendMode: 'screen' }}>{verdict.label}</span>
                        </>
                    )}
                    <span style={{ position: 'relative' }}>
                        <KineticText text={verdict.label} t={lt} start={VERDICT_LAND + 0.25} stagger={0.06} dur={0.4} mode="slam" />
                    </span>
                </div>
            </div>
            <div style={{ position: 'absolute', top: 790, left: 0, right: 0, textAlign: 'center', fontSize: 34, fontWeight: 800, color: 'rgba(255,255,255,0.82)', wordBreak: 'keep-all', ...riseIn(lt, 3.5, 0.7, 18) }}>
                {verdict.reason}
            </div>

            {/* 핵심 지표 요약 */}
            <div style={{ position: 'absolute', top: 870, left: '50%', transform: 'translateX(-50%)', display: 'flex' }}>
                {recap.map((r, i) => (
                    <div key={r.label} style={{
                        padding: '6px 54px', textAlign: 'center', whiteSpace: 'nowrap', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                        ...riseIn(lt, 4.0 + i * 0.12, 0.7, 22),
                    }}>
                        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.5)' }}>{r.label}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: 6 }}>
                            <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
                            {r.sub && <span style={{ fontSize: 20, fontWeight: 900, color: r.subColor ?? 'rgba(255,255,255,0.55)' }}>{r.sub}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* 착지 플래시 */}
            {landed && tImpact < 0.4 && (
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${CX}px ${CY}px, rgba(255,255,255,0.9), ${alpha(verdict.color, 0.35)} 35%, transparent 70%)`, opacity: Math.pow(1 - tImpact / 0.4, 2) }} />
            )}
        </div>
    );
}
