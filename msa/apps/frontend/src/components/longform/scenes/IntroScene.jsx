import React from 'react';
import { alpha, anim, clamp, ease, lerp, prog } from '../engine';
import { BRAND_NAME } from '../gameModel';
import { KineticText, SignalMark } from '../primitives';
import { riseIn } from '../motion';
import { posterSrc } from '../runtime';

/**
 * 인트로: ①가격신호등 마크가 그려지고 램프가 빨강→노랑→초록 순으로 켜진 뒤 플래시
 *        ② 커버 포스터가 3D로 날아들고 ③ 제목이 글자 단위로 솟아오른다
 *        ④ "이 가격, 지금 사도 될까?" — 판정은 마지막 씬까지 숨긴다(이탈 방지)
 */
export default function IntroScene({ lt, model, accent }) {
    const { meta } = model;
    const converge = anim(lt, 0.9, 0.25, ease.inCubic);
    const flash = lt >= 1.15 ? Math.pow(1 - prog(lt, 1.15, 0.45), 2) : 0;
    const blackout = 1 - anim(lt, 0.95, 0.5);

    const fly = anim(lt, 1.1, 1.5, ease.spring);
    const bob = Math.sin(lt * 1.3) * 8;
    const rotY = lerp(-58, -16, fly) + Math.sin(lt * 0.7) * 2.5;
    const metaLine = [meta.publisher, meta.genre, meta.releaseYear].filter(Boolean);
    const tick = Math.floor(lt * 4) % 3;

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            {/* 포스터 (3D 플라이인 + 반사) */}
            <div style={{ position: 'absolute', left: 1080, top: 150, width: 560, perspective: 1600, opacity: clamp(fly * 2) }}>
                <div style={{
                    transform: `translateX(${(1 - fly) * 420}px) translateY(${bob}px) rotateY(${rotY}deg) rotateX(4deg)`,
                    transformStyle: 'preserve-3d',
                }}>
                    <div style={{
                        position: 'relative', width: 560, height: 700, borderRadius: 26, overflow: 'hidden',
                        boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 70px ${alpha(accent, 0.35)}`,
                        border: `2px solid ${alpha(accent, 0.55)}`,
                    }}>
                        {meta.imageUrl && <img src={posterSrc(meta.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />}
                        {/* 표면 반사광 */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: `linear-gradient(${115 + Math.sin(lt * 0.6) * 10}deg, transparent 30%, rgba(255,255,255,0.16) 48%, transparent 62%)`,
                        }} />
                    </div>
                    <div style={{
                        width: 560, height: 180, marginTop: 14, borderRadius: 26, overflow: 'hidden', transform: 'scaleY(-1)', opacity: 0.22,
                        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 70%)',
                        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 70%)',
                    }}>
                        {meta.imageUrl && <img src={posterSrc(meta.imageUrl)} alt="" style={{ width: '100%', height: 700, objectFit: 'cover', objectPosition: 'center top', marginTop: -520 }} />}
                    </div>
                </div>
            </div>

            {/* 텍스트 블록 */}
            <div style={{ position: 'absolute', left: 140, top: 0, bottom: 0, width: 880, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...riseIn(lt, 1.3, 0.7, 18) }}>
                    <SignalMark height={20} />
                    <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '0.34em', color: 'rgba(255,255,255,0.72)' }}>
                        {BRAND_NAME.toUpperCase()} 가격 판정
                        {meta.index && meta.count ? <span style={{ color: accent }}>{`  ·  GAME ${String(meta.index).padStart(2, '0')}`}</span> : null}
                    </div>
                </div>
                <h1 style={{ margin: 0, fontSize: meta.title.length > 18 ? 78 : 96, fontWeight: 900, lineHeight: 1.08, color: '#fff', letterSpacing: '-0.02em', wordBreak: 'keep-all', textShadow: '0 6px 40px rgba(0,0,0,0.8)' }}>
                    <KineticText text={meta.title} t={lt} start={1.45} stagger={0.028} dur={0.7} />
                </h1>
                {metaLine.length > 0 && (
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', ...riseIn(lt, 2.1, 0.7, 14) }}>
                        {metaLine.join('   ·   ')}
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 18, ...riseIn(lt, 2.7, 0.8, 22) }}>
                    <div style={{ fontSize: 50, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                        이 가격, <span style={{ color: accent }}>지금 사도 될까?</span>
                    </div>
                    <SignalMark height={40} lit={[0, 1, 2].map((i) => (i === tick ? 1 : 0))} />
                </div>
            </div>

            {/* 로고 스팅 (암전 위) */}
            {blackout > 0 && <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: blackout }} />}
            {lt < 1.25 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ transform: `scale(${lerp(1, 0.2, converge)})`, opacity: 1 - prog(lt, 1.1, 0.12) }}>
                        <SignalMark
                            height={150}
                            draw={anim(lt, 0.05, 0.45, ease.outCubic)}
                            lit={[0, 1, 2].map((i) => anim(lt, 0.4 + i * 0.15, 0.18))}
                        />
                    </div>
                </div>
            )}
            {flash > 0 && (
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 40%, transparent 75%)', opacity: flash }} />
            )}
        </div>
    );
}
