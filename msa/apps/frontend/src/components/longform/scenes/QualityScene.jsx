import React from 'react';
import { Clock, Users } from 'lucide-react';
import { alpha, anim, clamp, ease } from '../engine';
import { fmt } from '../gameModel';
import { Ring } from '../primitives';
import { countUp, riseIn, slideIn } from '../motion';
import SceneTitle from './SceneTitle';

const scoreColor = (s) => (s >= 75 ? '#22c55e' : s >= 50 ? '#facc15' : '#f87171');

/** 품질: 메타/유저 평점 링 + 플레이타임 막대 + 시간당 가격 + 분위기 태그 */
export default function QualityScene({ lt, model, accent }) {
    const { quality } = model;
    const hasMeta = Boolean(quality.meta);
    const hasTime = Boolean(quality.main);
    const timeLeft = hasMeta ? 1010 : 560;

    const bars = [
        quality.main && { label: '메인 스토리', value: quality.main },
        quality.extra && { label: '메인 + 서브', value: quality.extra },
        quality.complete && { label: '완전 정복', value: quality.complete },
    ].filter(Boolean);
    const maxBar = Math.max(...bars.map((b) => b.value), 1);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <SceneTitle lt={lt} num={3} title="품질 검증" sub="이 가격에 이만큼 즐길 수 있을까" accent={accent} />

            {hasMeta && (
                <div style={{ position: 'absolute', left: hasTime ? 200 : 620, top: 330 }}>
                    {(() => {
                        const color = scoreColor(quality.meta);
                        const p = anim(lt, 0.4, 1.7, ease.outCubic);
                        const pop = anim(lt, 0.25, 0.9, ease.spring);
                        return (
                            <div style={{ transform: `scale(${0.6 + 0.4 * pop})`, opacity: clamp(pop * 2), transformOrigin: 'center' }}>
                                <Ring size={420} stroke={22} value={(quality.meta / 100) * p} color={color} glow={22}>
                                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.3em', color: alpha(color, 0.9) }}>METACRITIC</div>
                                    <div style={{ fontSize: 168, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.05em', color, textShadow: `0 0 40px ${alpha(color, 0.55)}`, fontVariantNumeric: 'tabular-nums' }}>
                                        {countUp(quality.meta, lt, 0.4, 1.7)}
                                    </div>
                                    {quality.metaCount && <div style={{ fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>평론가 {fmt(quality.metaCount)}명</div>}
                                </Ring>
                            </div>
                        );
                    })()}
                    {quality.user && (() => {
                        const p = anim(lt, 1.1, 1.3, ease.outCubic);
                        const pop = anim(lt, 0.95, 0.8, ease.spring);
                        const color = scoreColor(quality.user * 10);
                        return (
                            <div style={{ position: 'absolute', left: 330, top: 290, transform: `scale(${0.5 + 0.5 * pop})`, opacity: clamp(pop * 2) }}>
                                <div style={{ borderRadius: '50%', background: 'rgba(8,8,16,0.85)', padding: 10 }}>
                                    <Ring size={200} stroke={14} value={(quality.user / 10) * p} color={color} glow={14}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)' }}>
                                            <Users style={{ width: 16, height: 16 }} /> USER
                                        </div>
                                        <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{countUp(quality.user, lt, 1.1, 1.3, 1)}</div>
                                        {quality.userCount && <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.45)' }}>{fmt(quality.userCount)}명</div>}
                                    </Ring>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {hasTime && (
                <div style={{ position: 'absolute', left: timeLeft, top: 330, width: 790 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 20, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', ...riseIn(lt, 0.9, 0.6, 14) }}>
                        <Clock style={{ width: 22, height: 22 }} /> 플레이타임
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, ...riseIn(lt, 1.0, 0.6, 20) }}>
                        <span style={{ fontSize: 132, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{countUp(quality.main, lt, 1.1, 1.2)}</span>
                        <span style={{ fontSize: 44, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>시간</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
                        {bars.map((b, i) => {
                            const p = anim(lt, 1.6 + i * 0.18, 1.0, ease.outExpo);
                            return (
                                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: clamp(p * 3) }}>
                                    <div style={{ width: 140, fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{b.label}</div>
                                    <div style={{ flex: 1, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(b.value / maxBar) * 100 * p}%`, borderRadius: 8, background: i === 0 ? `linear-gradient(90deg, ${alpha(accent, 0.7)}, ${accent})` : 'rgba(255,255,255,0.35)', boxShadow: i === 0 ? `0 0 16px ${alpha(accent, 0.6)}` : 'none' }} />
                                    </div>
                                    <div style={{ width: 90, textAlign: 'right', fontSize: 22, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{b.value}h</div>
                                </div>
                            );
                        })}
                    </div>
                    {quality.perHour && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'baseline', gap: 14, marginTop: 30, padding: '18px 28px', borderRadius: 18,
                            background: alpha(accent, 0.12), border: `1.5px solid ${alpha(accent, 0.45)}`, boxShadow: `0 0 30px ${alpha(accent, 0.2)}`,
                            ...riseIn(lt, 2.7, 0.7, 20),
                        }}>
                            <span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>시간당</span>
                            <span style={{ fontSize: 60, fontWeight: 900, color: accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{countUp(quality.perHour, lt, 2.8, 1.0)}</span>
                            <span style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>원</span>
                            <span style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>메인 스토리 기준</span>
                        </div>
                    )}
                </div>
            )}

            {quality.tags.length > 0 && (
                <div style={{ position: 'absolute', left: hasMeta ? 1010 : 560, top: 900, display: 'flex', gap: 12, flexWrap: 'wrap', width: 790 }}>
                    {quality.tags.map((tag, i) => (
                        <div key={tag.name} style={{
                            padding: '9px 18px', borderRadius: 999, fontSize: 19, fontWeight: 900,
                            color: tag.color, border: `1.5px solid ${alpha(tag.color, 0.55)}`, background: alpha(tag.color, 0.1),
                            ...slideIn(lt, 3.4 + i * 0.1, 0.6, 80),
                        }}>
                            {tag.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
