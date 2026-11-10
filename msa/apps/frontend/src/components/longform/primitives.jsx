// 롱폼 공통 프리미티브 — 모든 컴포넌트는 시간 t만으로 모양이 결정된다 (CSS 애니메이션 없음).
import React, { useMemo } from 'react';
import { anim, clamp, ease, lerp, mulberry32, prog } from './engine';

// ── PS 심볼 (선 그리기 가능) ────────────────────────────────────────────
// viewBox 100 기준. draw(0~1)로 획이 그려지는 정도를 조절한다.
const SYMBOL_PATHS = {
    circle: <circle cx="50" cy="50" r="36" />,
    triangle: <path d="M50 13 L88 80 L12 80 Z" strokeLinejoin="round" />,
    cross: <path d="M20 20 L80 80 M80 20 L20 80" strokeLinecap="round" />,
    square: <rect x="17" y="17" width="66" height="66" rx="3" />,
};

export function PsSymbol({ kind, size = 100, color = '#fff', strokeWidth = 7, draw = 1, fill = 'none', glow = 0, style }) {
    return (
        <svg
            width={size} height={size} viewBox="0 0 100 100"
            style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${glow}px ${color})` : undefined, ...style }}
        >
            <g
                fill={fill} stroke={color} strokeWidth={strokeWidth}
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 - clamp(draw) }}
            >
                {React.cloneElement(SYMBOL_PATHS[kind], { pathLength: 1 })}
            </g>
        </svg>
    );
}

// ── 브랜드 마크: 가격신호등 (캡슐 + 램프 3개) ─────────────────────────
// lit: 램프별 밝기 0~1 [빨강, 노랑, 초록]. draw: 캡슐 외곽선이 그려지는 정도
export function SignalMark({ height = 40, lit = [1, 1, 1], draw = 1, glow = true, colors }) {
    const lamps = colors ?? ['#f87171', '#facc15', '#22c55e'];
    return (
        <svg width={height * (120 / 44)} height={height} viewBox="0 0 120 44" style={{ overflow: 'visible' }}>
            <rect x="2" y="2" width="116" height="40" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.85)" strokeWidth="3.5"
                pathLength={1} style={draw >= 1 ? undefined : { strokeDasharray: 1, strokeDashoffset: 1 - clamp(draw) }} />
            {lamps.map((c, i) => {
                const l = clamp(lit[i] ?? 0);
                return (
                    <circle key={i} cx={26 + i * 34} cy="22" r="11" fill={c} fillOpacity={0.18 + 0.82 * l}
                        style={{ filter: glow && l > 0.05 ? `drop-shadow(0 0 ${8 * l}px ${c})` : undefined }} />
                );
            })}
        </svg>
    );
}

// ── 키네틱 타이포: 글자 단위로 마스크 안에서 밀려 올라온다 ─────────────
// 한국어 줄바꿈을 위해 어절 단위로 묶고(nowrap), 어절 사이에서만 줄이 바뀐다.
export function KineticText({ text, t, start, stagger = 0.03, dur = 0.6, style, charStyle, mode = 'rise' }) {
    let i = 0;
    const words = String(text).split(' ');
    return (
        <span style={{ display: 'inline', ...style }}>
            {words.map((word, wi) => {
                // 마스크(overflow:hidden)는 등장하는 동안만 건다 — 끝난 뒤에도 걸면 글자 그림자가 사각형으로 잘린다
                const wordEnd = start + (i + Array.from(word).length - 1) * stagger + dur;
                const masking = mode === 'rise' && t < wordEnd;
                return (
                <React.Fragment key={wi}>
                    <span style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: masking ? 'hidden' : 'visible', paddingBottom: '0.08em', marginBottom: '-0.08em', verticalAlign: 'top' }}>
                        {Array.from(word).map((ch) => {
                            const p = prog(t, start + i++ * stagger, dur);
                            let transform;
                            let opacity = 1;
                            if (mode === 'slam') {
                                const e = ease.outBack(p, 2.2);
                                transform = `scale(${lerp(1.9, 1, e)})`;
                                opacity = clamp(p * 3);
                            } else {
                                transform = `translateY(${(1 - ease.outExpo(p)) * 110}%)`;
                            }
                            return (
                                <span key={i} style={{ display: 'inline-block', transform, opacity, transformOrigin: '50% 70%', ...charStyle }}>
                                    {ch}
                                </span>
                            );
                        })}
                    </span>
                    {wi < words.length - 1 && ' '}
                </React.Fragment>
                );
            })}
        </span>
    );
}

// ── 오도미터(슬롯 릴): 자릿수마다 독립적으로 회전하다 왼쪽부터 차례로 멈춘다 ──
// 아랫자리일수록 더 많이 돌고 늦게 멈춰서 "촤라락 → 탁" 리듬이 생긴다.
export function Odometer({ from, to, t, start, dur = 1.4, digitStyle, height = 1 }) {
    const fromDigits = String(Math.round(from));
    const toDigits = String(Math.round(to));
    const places = Math.max(fromDigits.length, toDigits.length);
    const digitAt = (s, k) => (k < s.length ? Number(s[s.length - 1 - k]) : 0);
    const fade = anim(t, start, dur * 0.6);
    const cellStyle = { height: `${height}em`, lineHeight: `${height}em`, ...digitStyle };

    const cols = [];
    for (let k = places - 1; k >= 0; k--) {
        const order = places - 1 - k; // 0 = 맨 앞자리
        const a = digitAt(fromDigits, k);
        const b = digitAt(toDigits, k);
        const spins = k === 0 ? 4 : k === 1 ? 3 : 2;
        const travel = ((b - a + 10) % 10) + 10 * spins;
        const delay = order * (dur * 0.08);
        const e = anim(t, start + delay, dur - delay, ease.outQuart);
        const pos = (a + travel * e) % 10;
        // 회전 속도(자릿수/초)에 비례한 모션 블러
        const speed = travel * (anim(t + 1 / 60, start + delay, dur - delay, ease.outQuart) - e) * 60;
        const blur = Math.min(7, speed * 0.22);
        // 자릿수가 줄어드는 경우(100,000 → 9,900) 사라지는 앞자리는 서서히 숨긴다
        const keep = k < toDigits.length;
        const opacity = keep ? 1 : 1 - fade;

        cols.push(
            <span key={`d${k}`} style={{ display: 'inline-block', height: `${height}em`, overflow: 'hidden', verticalAlign: 'top', opacity, maxWidth: keep ? undefined : `${(1 - fade) * 0.7}em` }}>
                <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${-pos * height}em)`, filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, idx) => <span key={idx} style={cellStyle}>{n}</span>)}
                </span>
            </span>,
        );
        if (k > 0 && k % 3 === 0) {
            const commaKeep = k < toDigits.length;
            cols.push(
                <span key={`c${k}`} style={{ display: 'inline-block', ...cellStyle, opacity: commaKeep ? 1 : 1 - fade, maxWidth: commaKeep ? undefined : `${(1 - fade) * 0.3}em`, overflow: 'hidden' }}>,</span>,
            );
        }
    }
    return <span style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}>{cols}</span>;
}

// ── 원형 게이지 ─────────────────────────────────────────────────────────
export function Ring({ size, stroke = 14, value, color, track = 'rgba(255,255,255,0.08)', glow = 18, children }) {
    const r = (size - stroke) / 2;
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(value)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ filter: `drop-shadow(0 0 ${glow}px ${color})` }}
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </div>
        </div>
    );
}

// ── 필름 그레인: 시드 고정 노이즈 타일을 프레임마다 다른 위치로 이동 ─────
function useNoiseTile() {
    return useMemo(() => {
        const size = 192;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        const rnd = mulberry32(20261110);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.floor(rnd() * 255);
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL('image/png');
    }, []);
}

export function Grain({ t, opacity = 0.07 }) {
    const tile = useNoiseTile();
    const frame = Math.floor(t * 24);
    const rnd = mulberry32(frame + 1);
    return (
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity, mixBlendMode: 'overlay',
            backgroundImage: `url(${tile})`, backgroundPosition: `${Math.floor(rnd() * 192)}px ${Math.floor(rnd() * 192)}px`,
        }} />
    );
}
