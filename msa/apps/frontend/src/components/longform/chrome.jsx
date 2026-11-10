// 무대 크롬 — 배경, HUD(진행바·로어서드·브랜드), PS 심볼 마스크 전환
import React from 'react';
import { STAGE_H, STAGE_W, alpha, anim, clamp, ease, noise1, prog } from './engine';
import { BRAND_NAME } from './gameModel';
import { SignalMark } from './primitives';
import { backdropSrc, posterSrc } from './runtime';
import { CX, CY, polygonPoints } from './transitions';

// ── 배경: 흐린 커버 아트(2.5D 드리프트) + 오로라 + 도트 그리드 + 비네팅 ────
export function Backdrop({ t, imageUrl, accent }) {
    // 작은 해상도에서 블러를 건 뒤 확대 → 1920 전체에 블러를 거는 것보다 훨씬 가볍다
    const dx = noise1(t * 0.06) * 26;
    const dy = noise1(t * 0.05 + 40) * 18;
    const s = 4.4 + Math.sin(t * 0.08) * 0.08;
    const blobs = [
        { x: 1500 + Math.sin(t * 0.21) * 140, y: 180 + Math.cos(t * 0.17) * 90, r: 760, a: 0.34 },
        { x: 260 + Math.cos(t * 0.15) * 120, y: 900 + Math.sin(t * 0.19) * 70, r: 820, a: 0.22 },
        { x: 960 + Math.sin(t * 0.11 + 2) * 260, y: 560 + Math.cos(t * 0.13) * 120, r: 620, a: 0.12 },
    ];
    const gridShift = (t * 14) % 48;

    return (
        <div style={{ position: 'absolute', inset: 0, background: '#06060c', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', left: '50%', top: '50%', width: 480, height: 270,
                transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${s})`,
            }}>
                {imageUrl && (
                    <img src={backdropSrc(imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px) brightness(0.36) saturate(1.45)' }} />
                )}
            </div>
            {blobs.map((b, i) => (
                <div key={i} style={{
                    position: 'absolute', left: b.x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2,
                    background: `radial-gradient(circle, ${alpha(accent, b.a)} 0%, ${alpha(accent, b.a * 0.35)} 35%, transparent 68%)`,
                }} />
            ))}
            <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, opacity: 0.09 }}>
                <defs>
                    <pattern id="lfDots" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform={`translate(${gridShift} ${gridShift * 0.5})`}>
                        <circle cx="2" cy="2" r="1.6" fill="#fff" />
                    </pattern>
                    <radialGradient id="lfDotsFade" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                    <mask id="lfDotsMask"><rect width={STAGE_W} height={STAGE_H} fill="url(#lfDotsFade)" /></mask>
                </defs>
                <rect width={STAGE_W} height={STAGE_H} fill="url(#lfDots)" mask="url(#lfDotsMask)" />
            </svg>
            {/* 사선 라이트 빔 (아주 느리게 이동) */}
            <div style={{
                position: 'absolute', top: -300, left: -600 + ((t * 40) % 3200), width: 380, height: 1700,
                transform: 'rotate(18deg)',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.035), transparent)',
            }} />
        </div>
    );
}

export function Vignette() {
    return (
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.8) 100%)',
        }} />
    );
}

// ── 상단 진행바 (스토리형 세그먼트) ─────────────────────────────────────
export function ProgressHud({ t, scenes, accent, meta }) {
    const body = scenes.filter((s) => s.id !== 'intro' && s.id !== 'outro');
    if (!body.length) return null;
    const first = body[0];
    const last = body[body.length - 1];
    const show = anim(t, first.start - 0.2, 0.6) * (1 - anim(t, last.end - 0.3, 0.5));
    if (show <= 0) return null;

    return (
        <div style={{ position: 'absolute', top: 44, left: 120, right: 120, display: 'flex', alignItems: 'flex-end', gap: 28, opacity: show, transform: `translateY(${(1 - show) * -16}px)` }}>
            {meta.index && meta.count && (
                <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', paddingBottom: 1 }}>
                    GAME <span style={{ color: '#fff' }}>{String(meta.index).padStart(2, '0')}</span> / {String(meta.count).padStart(2, '0')}
                </div>
            )}
            <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                {body.map((s) => {
                    const fill = prog(t, s.start, s.duration);
                    const active = t >= s.start && t < s.end;
                    return (
                        <div key={s.id} style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.22em', marginBottom: 9, color: active ? '#fff' : fill >= 1 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)' }}>
                                {s.label}
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${fill * 100}%`, background: accent, boxShadow: `0 0 12px ${accent}` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── 로어서드: 게임 썸네일 + 제목 (본문 씬 동안 좌하단 고정) ─────────────
export function LowerThird({ t, scenes, meta, accent }) {
    const price = scenes.find((s) => s.id === 'price');
    const verdict = scenes.find((s) => s.id === 'verdict');
    if (!price || !verdict) return null;
    const p = anim(t, price.start + 0.3, 0.8, ease.outExpo) * (1 - anim(t, verdict.start - 0.4, 0.4, ease.inCubic));
    if (p <= 0) return null;
    const sub = [meta.platforms.slice(0, 2).join(' · '), meta.genre].filter(Boolean).join('  /  ');

    return (
        <div style={{ position: 'absolute', left: 120, bottom: 56, display: 'flex', alignItems: 'center', gap: 18, opacity: clamp(p * 1.5), transform: `translateX(${(1 - p) * -80}px)` }}>
            <div style={{ width: 4, height: 64, background: accent, borderRadius: 2, boxShadow: `0 0 14px ${accent}` }} />
            <img src={posterSrc(meta.imageUrl)} alt="" style={{ width: 56, height: 72, objectFit: 'cover', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }} />
            <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.15, maxWidth: 820, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.title}</div>
                {sub && <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 4, letterSpacing: '0.06em' }}>{sub}</div>}
            </div>
        </div>
    );
}

// ── 브랜드 버그 (우하단) ────────────────────────────────────────────────
export function BrandBug({ t, scenes }) {
    const intro = scenes.find((s) => s.id === 'intro');
    const outro = scenes.find((s) => s.id === 'outro');
    const p = anim(t, (intro?.end ?? 0) - 0.2, 0.6) * (outro ? 1 - anim(t, outro.start - 0.4, 0.4) : 1);
    if (p <= 0) return null;
    return (
        <div style={{ position: 'absolute', right: 120, bottom: 66, display: 'flex', alignItems: 'center', gap: 14, opacity: p * 0.85 }}>
            <SignalMark height={18} />
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '0.32em', color: '#fff' }}>{BRAND_NAME.toUpperCase()}</div>
        </div>
    );
}

/** 마스크 가장자리를 따라가는 컨트롤러 색 외곽선 */
export function WipeOutline({ shape, wipe, color }) {
    if (wipe == null || wipe <= 0 || wipe >= 1) return null;
    const e = ease.inOutCubic(clamp(wipe));
    const opacity = Math.sin(clamp(wipe) * Math.PI);
    const strokes = [{ k: 1, w: 12, o: 1 }, { k: 0.86, w: 4, o: 0.5 }];
    return (
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity, filter: `drop-shadow(0 0 18px ${color})` }}>
            {strokes.map(({ k, w, o }) => (shape === 'circle'
                ? <circle key={k} cx={CX} cy={CY} r={1160 * e * k} fill="none" stroke={color} strokeWidth={w} opacity={o} />
                : <polygon key={k} points={polygonPoints(shape, e * k).map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" opacity={o} />
            ))}
        </svg>
    );
}
