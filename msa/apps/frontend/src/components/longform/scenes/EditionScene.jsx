import React from 'react';
import { Info, Sparkles, TrendingUp } from 'lucide-react';
import { alpha, anim, clamp, ease } from '../engine';
import { SALE_RED } from '../gameModel';
import { countUp, riseIn } from '../motion';
import SceneTitle from './SceneTitle';

const TONES = {
    good: { color: '#22c55e', Icon: Sparkles },
    info: { color: '#facc15', Icon: TrendingUp },
    neutral: { color: '#e5e7eb', Icon: Info },
};

/** 에디션 비교: 정가(고스트) 대비 현재가 막대가 자라나며 가격 차이를 보여준다 */
export default function EditionScene({ lt, model, accent }) {
    const { editions, insight } = model.edition;
    const rows = editions.slice(0, 4);
    // 가장 비싼 막대도 오른쪽에 가격·할인 라벨(약 320px) 자리를 남기도록 최대 가격을 막대 폭의 68%에 맞춘다
    const maxPrice = Math.max(...rows.map((e) => e.original || e.current), 1) / 0.68;
    const barX = 640;
    const barW = 980;
    const tone = insight ? TONES[insight.tone] : null;

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <SceneTitle lt={lt} num={4} title="에디션 비교" sub="어떤 판을 사야 이득일까요?" accent={accent} />

            <div style={{ position: 'absolute', left: 120, top: 320, width: 1680, display: 'flex', flexDirection: 'column', gap: rows.length > 3 ? 22 : 36 }}>
                {rows.map((e, i) => {
                    const grow = anim(lt, 0.5 + i * 0.16, 1.1, ease.outExpo);
                    const color = e.isCurrent ? accent : 'rgba(255,255,255,0.55)';
                    return (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', ...riseIn(lt, 0.35 + i * 0.12, 0.6, 24) }}>
                            <div style={{ width: barX - 120 - 30, marginRight: 30 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 30, fontWeight: 900, color: e.isCurrent ? '#fff' : 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</span>
                                    {e.isCurrent && (
                                        <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.16em', color: '#05140a', background: accent, padding: '4px 10px', borderRadius: 6, boxShadow: `0 0 14px ${accent}` }}>NOW</span>
                                    )}
                                </div>
                                {e.contents.length > 0 && (
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        + {e.contents.join(' · ')}
                                    </div>
                                )}
                            </div>
                            <div style={{ position: 'relative', width: barW, height: 64 }}>
                                {/* 정가 (고스트) */}
                                {e.original > e.current && (
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(e.original / maxPrice) * 100 * grow}%`, borderRadius: 14, border: '2px dashed rgba(255,255,255,0.22)' }} />
                                )}
                                {/* 현재가 */}
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(e.current / maxPrice) * 100 * grow}%`, borderRadius: 14,
                                    background: e.isCurrent ? `linear-gradient(90deg, ${alpha(accent, 0.55)}, ${accent})` : 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.32))',
                                    boxShadow: e.isCurrent ? `0 0 30px ${alpha(accent, 0.45)}` : 'none',
                                }} />
                                <div style={{
                                    position: 'absolute', top: '50%', left: `calc(${(Math.max(e.current, e.original || 0) / maxPrice) * 100 * grow}% + 22px)`,
                                    transform: 'translateY(-50%)', display: 'flex', alignItems: 'baseline', gap: 12, whiteSpace: 'nowrap', opacity: clamp(grow * 2),
                                }}>
                                    <span style={{ fontSize: 40, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{countUp(e.current, lt, 0.5 + i * 0.16, 1.1)}원</span>
                                    {e.rate > 0
                                        ? <span style={{ fontSize: 24, fontWeight: 900, color: SALE_RED }}>-{e.rate}%</span>
                                        : <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>할인 없음</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {insight && (
                <div style={{
                    position: 'absolute', left: 120, top: 820, display: 'inline-flex', alignItems: 'center', gap: 16,
                    padding: '20px 30px', borderRadius: 20, background: alpha(tone.color, 0.12), border: `1.5px solid ${alpha(tone.color, 0.5)}`,
                    boxShadow: `0 0 34px ${alpha(tone.color, 0.2)}`, ...riseIn(lt, 2.2, 0.7, 24),
                }}>
                    <tone.Icon style={{ width: 32, height: 32, color: tone.color }} />
                    <span style={{ fontSize: 34, fontWeight: 900, color: tone.color }}>{insight.text}</span>
                </div>
            )}
        </div>
    );
}
