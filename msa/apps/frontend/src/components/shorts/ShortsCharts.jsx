// 쇼츠 2.0 전용 결정적(pure t) 모션 인포그래픽 모듈
// 폰 세로 화면에서 1초 안에 읽히도록 "큰 숫자 + 한 단어 라벨"만 남긴다.
import React, { useMemo } from 'react';
import { alpha, anim, clamp, ease, lerp, mixHex, mulberry32, noise1, prog } from '../longform/engine';
import { fmt } from '../longform/gameModel';
import { KineticText, PsSymbol } from '../longform/primitives';
import { countUp } from '../longform/motion';

const GREEN = '#22c55e';
const scoreColor = (s) => (s >= 75 ? GREEN : s >= 50 ? '#facc15' : '#f87171');

function StatCell({ lt, start, label, labelColor, children, sub, fill, fillColor }) {
    const p = anim(lt, start, 0.42, ease.outBack);
    const barP = anim(lt, start + 0.1, 0.7, ease.outCubic);
    return (
        <div style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: clamp(p * 1.8), transform: `translateY(${(1 - clamp(p)) * 40}px) scale(${lerp(0.86, 1, clamp(p))})`,
        }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.14em', color: labelColor }}>{label}</div>
            <div style={{
                fontSize: 84, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.04em', color: '#fff',
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            }}>
                {children}
            </div>
            {fill != null && (
                <div style={{ width: '62%', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${fill * barP * 100}%`, height: '100%', borderRadius: 999, background: fillColor, boxShadow: `0 0 12px ${fillColor}` }} />
                </div>
            )}
            {sub && (
                <div style={{ fontSize: 30, fontWeight: 800, color: 'rgba(255,255,255,0.82)', marginTop: 6, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {sub}
                </div>
            )}
        </div>
    );
}

/** 메타 · 유저 · 플레이타임을 v1 카드처럼 한 줄 3칸으로 (없는 값은 칸을 빼고 남은 칸이 넓어진다) */
export function StatsRow({ lt, start, model, width = 826, height = 210 }) {
    const { quality } = model;
    const cells = [];
    if (quality?.meta) {
        cells.push({
            key: 'meta', label: 'META', labelColor: scoreColor(quality.meta),
            value: countUp(quality.meta, lt, start + 0.05, 0.7), fill: quality.meta / 100, fillColor: scoreColor(quality.meta),
        });
    }
    if (quality?.user) {
        cells.push({
            key: 'user', label: 'USER', labelColor: scoreColor(quality.user * 10),
            value: countUp(quality.user, lt, start + 0.13, 0.7, 1), fill: quality.user / 10, fillColor: scoreColor(quality.user * 10),
        });
    }
    if (quality?.main) {
        cells.push({
            key: 'time', label: '플레이타임', labelColor: 'rgba(255,255,255,0.7)',
            value: <>{countUp(quality.main, lt, start + 0.21, 0.7)}<span style={{ fontSize: 40, marginLeft: 4 }}>시간</span></>,
            sub: quality.perHour ? `시간당 ${fmt(quality.perHour)}원` : null,
        });
    }
    if (!cells.length) return null;

    const panel = anim(lt, start - 0.05, 0.35, ease.outExpo);
    return (
        <div style={{
            width, height, borderRadius: 30, display: 'flex', alignItems: 'center', padding: '0 12px',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(10,12,20,0.72))',
            border: '1.5px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
            opacity: clamp(panel * 1.6),
        }}>
            {cells.map((c, i) => (
                <React.Fragment key={c.key}>
                    {i > 0 && <div style={{ width: 2, height: '58%', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />}
                    <StatCell lt={lt} start={start + i * 0.08} label={c.label} labelColor={c.labelColor} sub={c.sub} fill={c.fill} fillColor={c.fillColor}>
                        {c.value}
                    </StatCell>
                </React.Fragment>
            ))}
        </div>
    );
}

const ORDER = ['circle', 'triangle', 'cross', 'square'];
const SPIN_COLOR = '#e5e7eb';
const CELL = 150;
const SYMBOL = 128;
const outQuint = (p) => 1 - Math.pow(1 - p, 5);

function reelPos(lt, spinStart, landAt, final) {
    const base = final * outQuint(prog(lt, spinStart, landAt - spinStart));
    if (lt < landAt) return base;
    const k = lt - landAt;
    return final + 0.12 * Math.exp(-7 * k) * Math.sin(24 * k);
}

/** 가격 신호등 판정 — 슬롯 릴이 돌다 착지하면 충격파·파편과 함께 판정 라벨이 꽂힌다 */
export function VerdictReelBanner({ lt, verdictAt, landAt, verdict, reason, width = 826, height = 280 }) {
    const show = anim(lt, verdictAt, 0.22, ease.outBack);
    const reelCx = 32 + 80;
    const reelCy = height / 2;

    const shards = useMemo(() => {
        const rnd = mulberry32(888);
        return Array.from({ length: 16 }, () => {
            const a = rnd() * Math.PI * 2;
            const speed = 260 + rnd() * 380;
            return {
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - 80,
                spin: (rnd() - 0.5) * 720,
                size: 16 + rnd() * 16,
                color: rnd() < 0.3 ? '#ffffff' : verdict.color,
                life: 0.55 + rnd() * 0.35,
            };
        });
    }, [verdict.color]);

    if (show <= 0) return null;

    const target = ORDER.indexOf(verdict.symbol);
    const final = 3 * 4 + (target >= 0 ? target : 0);
    const pos = reelPos(lt, verdictAt, landAt, final);
    const speed = Math.abs(reelPos(lt + 1 / 60, verdictAt, landAt, final) - pos) * 60;
    const landed = lt >= landAt;
    const landP = anim(lt, landAt, 0.35);
    const tImpact = lt - landAt;
    const blur = Math.min(12, speed * 0.5);
    const pulse = landed ? 1 + 0.2 * Math.exp(-6 * tImpact) * Math.cos(12 * tImpact) : 1;
    const breathe = landed ? 1 + Math.sin(tImpact * 3.2) * 0.025 * clamp(tImpact - 0.6) : 1;

    const glitching = landed && verdict.key === 'WAIT' && tImpact > 0.6 && ((tImpact - 0.6) % 1.4) < 0.14;
    const gx = glitching ? noise1(lt * 90) * 10 : 0;
    // 착지 후 1.6초 간격으로 배너를 가로지르는 광택 (정지 화면 체감 방지)
    const sweepP = landed && tImpact > 0.7 ? ((tImpact - 0.7) % 1.6) / 0.7 : -1;

    const items = [];
    for (let j = Math.floor(pos) - 1; j <= Math.floor(pos) + 2; j++) {
        if (j < 0 || (landed && j !== final)) continue;
        const isFinal = j === final;
        const color = isFinal && landed ? mixHex(SPIN_COLOR, verdict.color, landP) : SPIN_COLOR;
        items.push({ j, kind: ORDER[j % 4], y: (j - pos) * CELL, color, isFinal });
    }

    return (
        <div style={{
            position: 'relative', width, height, borderRadius: 32, padding: '0 36px 0 32px',
            background: landed ? `linear-gradient(120deg, ${alpha(verdict.color, 0.22)}, rgba(10,12,20,0.7))` : 'rgba(255,255,255,0.06)',
            border: `3px solid ${landed ? alpha(verdict.color, 0.8) : 'rgba(255,255,255,0.2)'}`,
            boxShadow: landed ? `0 24px 60px rgba(0,0,0,0.55), 0 0 ${lerp(120, 60, landP)}px ${alpha(verdict.color, 0.4)}` : '0 16px 38px rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', gap: 30,
            opacity: clamp(show * 1.6), transform: `scale(${lerp(0.9, 1, clamp(show))})`,
            overflow: 'hidden',
        }}>
            {landed && tImpact < 0.4 && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `radial-gradient(circle at ${reelCx}px ${reelCy}px, rgba(255,255,255,0.55), ${alpha(verdict.color, 0.3)} 40%, transparent 72%)`,
                    opacity: Math.pow(1 - tImpact / 0.4, 2),
                }} />
            )}
            {sweepP > 0 && sweepP < 1 && (
                <div style={{
                    position: 'absolute', top: -40, bottom: -40, width: 160, left: `${lerp(-25, 115, sweepP)}%`,
                    transform: 'skewX(-20deg)', pointerEvents: 'none',
                    background: `linear-gradient(90deg, transparent, ${alpha('#ffffff', 0.12)}, transparent)`,
                }} />
            )}

            <div style={{
                position: 'relative', width: 160, height: 180, flexShrink: 0, overflow: 'hidden',
                WebkitMaskImage: landed ? undefined : 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
                maskImage: landed ? undefined : 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
            }}>
                {items.map((it) => (
                    <div key={it.j} style={{
                        position: 'absolute', left: (160 - SYMBOL) / 2, top: (180 - SYMBOL) / 2 + it.y,
                        transform: `scale(${landed ? pulse * breathe : 1})`,
                        filter: blur > 0.6 ? `blur(${blur.toFixed(1)}px)` : undefined,
                    }}>
                        <PsSymbol kind={it.kind} size={SYMBOL} color={it.color} strokeWidth={12} glow={it.isFinal && landed ? 22 : 6} />
                    </div>
                ))}
            </div>

            {landed && tImpact < 0.85 && (
                <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[0, 0.1].map((delay) => {
                        const p = prog(tImpact, delay, 0.6);
                        if (p <= 0 || p >= 1) return null;
                        return <circle key={delay} cx={reelCx} cy={reelCy} r={50 + 320 * ease.outCubic(p)} fill="none" stroke={verdict.color} strokeWidth={8 * (1 - p)} opacity={1 - p} />;
                    })}
                </svg>
            )}
            {landed && verdict.key === 'TRACKING' && [0, 0.5].map((k) => {
                const ph = ((tImpact / 1.6) + k) % 1;
                const r = 60 + ph * 90;
                return (
                    <div key={k} style={{
                        position: 'absolute', left: reelCx - r, top: reelCy - r, width: r * 2, height: r * 2, borderRadius: '50%',
                        border: `3px solid ${alpha(verdict.color, 0.55 * (1 - ph))}`, pointerEvents: 'none',
                    }} />
                );
            })}
            {landed && tImpact < 0.9 && (
                <div style={{ position: 'absolute', left: reelCx, top: reelCy, pointerEvents: 'none' }}>
                    {shards.map((s, i) => {
                        if (tImpact > s.life) return null;
                        const x = s.vx * tImpact;
                        const y = s.vy * tImpact + 280 * tImpact * tImpact;
                        return (
                            <div key={i} style={{
                                position: 'absolute', left: x - s.size / 2, top: y - s.size / 2,
                                transform: `rotate(${s.spin * tImpact}deg)`, opacity: 1 - tImpact / s.life,
                            }}>
                                <PsSymbol kind={verdict.symbol} size={s.size} color={s.color} strokeWidth={14} />
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2 }}>
                <div style={{
                    position: 'relative', fontSize: 86, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.04, whiteSpace: 'nowrap',
                    color: landed ? verdict.color : 'rgba(255,255,255,0.55)',
                    textShadow: landed ? `0 0 40px ${alpha(verdict.color, 0.6)}` : undefined,
                }}>
                    {glitching && (
                        <>
                            <span style={{ position: 'absolute', left: gx, top: 0, color: '#ff2d55', opacity: 0.7, mixBlendMode: 'screen' }}>{verdict.label}</span>
                            <span style={{ position: 'absolute', left: -gx, top: 2, color: '#00e5ff', opacity: 0.7, mixBlendMode: 'screen' }}>{verdict.label}</span>
                        </>
                    )}
                    <span style={{ position: 'relative' }}>
                        {landed
                            ? <KineticText text={verdict.label} t={lt} start={landAt} stagger={0.04} dur={0.28} mode="slam" />
                            : '판정 중'}
                    </span>
                </div>
                {reason && (
                    <div style={{
                        fontSize: 36, fontWeight: 800, color: 'rgba(255,255,255,0.94)', marginTop: 10, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        opacity: clamp(anim(lt, landAt + 0.15, 0.3) * 1.5),
                        transform: `translateX(${(1 - anim(lt, landAt + 0.15, 0.4, ease.outExpo)) * 30}px)`,
                    }}>
                        {reason}
                    </div>
                )}
            </div>
        </div>
    );
}
