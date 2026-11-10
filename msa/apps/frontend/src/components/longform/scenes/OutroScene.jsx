import React from 'react';
import { Bell, Star, TrendingDown } from 'lucide-react';
import { alpha, anim, clamp, ease, lerp, prog } from '../engine';
import { BRAND_NAME, SALE_RED } from '../gameModel';
import { KineticText, SignalMark } from '../primitives';
import { riseIn } from '../motion';

const URL = 'ps-signal.com';
const FEATURES = [
    { Icon: TrendingDown, text: '매일 가격 추적' },
    { Icon: Star, text: '역대 최저가 판정' },
    { Icon: Bell, text: '다음 할인 예측' },
];

/** 아웃트로: 가격신호등 마크가 떨어져 내려오며 램프 점등 → 워드마크 → URL 타이핑 → 구독 CTA */
export default function OutroScene({ lt }) {
    const typed = Math.floor(prog(lt, 2.0, 0.9) * URL.length);
    const caretOn = lt < 3.2 || Math.floor(lt * 2) % 2 === 0;
    const bell = lt > 3.8 ? Math.sin((lt - 3.8) * 18) * 16 * Math.exp(-(lt - 3.8) * 2.2) : 0;

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center' }}>
                {(() => {
                    const p = anim(lt, 0.2, 1.0, ease.spring);
                    return (
                        <div style={{ transform: `translateY(${lerp(-420, 0, p)}px) scale(${lerp(0.6, 1, p)})`, opacity: clamp(p * 3) }}>
                            <SignalMark height={110} draw={anim(lt, 0.3, 0.6)} lit={[0, 1, 2].map((i) => anim(lt, 0.9 + i * 0.16, 0.2))} />
                        </div>
                    );
                })()}
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontSize: 132, fontWeight: 900, letterSpacing: '0.16em', color: '#fff', textShadow: '0 0 50px rgba(255,255,255,0.25)' }}>
                <KineticText text={BRAND_NAME.toUpperCase()} t={lt} start={1.25} stagger={0.05} dur={0.6} />
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontSize: 44, fontWeight: 800, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
                {URL.slice(0, typed)}
                {lt >= 2.0 && <span style={{ display: 'inline-block', width: 4, height: 46, marginLeft: 6, verticalAlign: 'middle', background: '#fff', opacity: caretOn ? 1 : 0 }} />}
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, top: 680, display: 'flex', justifyContent: 'center', gap: 56 }}>
                {FEATURES.map(({ Icon, text }, i) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.72)', ...riseIn(lt, 2.8 + i * 0.12, 0.6, 18) }}>
                        <Icon style={{ width: 28, height: 28 }} /> {text}
                    </div>
                ))}
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, ...riseIn(lt, 3.6, 0.7, 24) }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 16, padding: '20px 40px', borderRadius: 999,
                    background: SALE_RED, color: '#fff', fontSize: 34, fontWeight: 900,
                    boxShadow: `0 0 40px ${alpha(SALE_RED, 0.5)}`,
                }}>
                    <Bell style={{ width: 34, height: 34, transform: `rotate(${bell}deg)`, transformOrigin: '50% 10%' }} />
                    구독하고 다음 세일 알림 받기
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>보고 싶은 게임은 댓글로 알려주세요</div>
            </div>
        </div>
    );
}
