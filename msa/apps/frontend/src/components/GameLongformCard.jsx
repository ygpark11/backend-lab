// 🎬 YouTube 롱폼 촬영 전용 카드 — 16:9 자동 시퀀스
// ?view=longform          → 아웃트로 없음 (~52s, 게임 1~6용)
// ?view=longform&final=true → 아웃트로 포함 (~61s, 마지막 게임용)
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    Circle, Triangle, X, Square, CalendarDays, Flame, Clock,
    Star, TrendingUp, TrendingDown, Bell, Sparkles,
    AlertTriangle, Check, Gem,
} from 'lucide-react';
import PSGameImage from './common/PSGameImage';
import { differenceInCalendarDays, parseISO } from 'date-fns';

// ── 유틸 ─────────────────────────────────────────────────────────────
function cleanTitle(title) {
    const langKw = ['한국어', '영어', '일본어', '중국어', '태국어', '독일어', '프랑스어', '스페인어'];
    const idx = langKw.map(k => title.indexOf(k)).filter(i => i !== -1);
    if (idx.length > 0) {
        const first = Math.min(...idx);
        const paren = title.lastIndexOf('(', first);
        if (paren > 0) title = title.slice(0, paren).trim();
    }
    return title.replace(/\s+PS[45][™]?\s*(?:[&]\s*PS[45][™]?)?$/, '').trim();
}
const fmt  = (n) => (n != null ? n.toLocaleString('ko-KR') : '—');
const fmtD = (s) => s?.replace(/-/g, '.') ?? '';

// ── 스프링 이징 (오버슈트 탄력) ──────────────────────────────────────
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
// 부드러운 감속 (모션 그래픽 표준)
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

// ── Scene 정의 ────────────────────────────────────────────────────────
// from = 이전 씬 to - TRANS 로 맞춰야 크로스페이드가 자연스러움
const SCENES_BASE = [
    { id: 'intro',   from: 1,    to: 9  },
    { id: 'price',   from: 8.4,  to: 19 },
    { id: 'quality', from: 18.4, to: 29 },
    { id: 'edition', from: 28.4, to: 40 },
    { id: 'verdict', from: 39.4, to: 51 },
];
const SCENE_OUTRO = { id: 'outro', from: 49, to: 58 };
const TRANS = 0.6;

// ── 씬별 보조 aurora 색상 ─────────────────────────────────────────────
// verdict 색 기반 베이스 aurora와 별개로 씬마다 분위기를 미세하게 전환
const SCENE_AUX_AURORA = {
    intro:   'transparent',
    price:   'rgba(234,179,8,0.07)',
    quality: 'rgba(168,85,247,0.06)',
    edition: 'rgba(59,130,246,0.07)',
    verdict: 'rgba(255,255,255,0.04)',
    outro:   'rgba(255,255,255,0.03)',
};

// ── panelStyle: Lens Blur Focus 포함 ─────────────────────────────────
// 씬 진입 시 blur(10px)→blur(0) 로 초점이 맞춰지는 연출
function panelStyle(scene, elapsed) {
    const base = { position: 'absolute', inset: 0 };
    const t = `opacity ${TRANS}s ease, filter ${TRANS * 1.4}s ${EASE_OUT}`;

    if (elapsed < scene.from || elapsed > scene.to + TRANS)
        return { ...base, opacity: 0, pointerEvents: 'none', zIndex: 0, filter: 'blur(10px)', transition: t };

    if (elapsed < scene.from + TRANS)
        return { ...base, opacity: 1, filter: 'blur(0px)', transition: t, zIndex: 3 };
    if (elapsed > scene.to - TRANS)
        return { ...base, opacity: 0, filter: 'blur(8px)', transition: t, zIndex: 1, pointerEvents: 'none' };

    return { ...base, opacity: 1, filter: 'blur(0px)', zIndex: 2 };
}

function useEntered(elapsed, threshold) { return elapsed >= threshold; }

// ── RAF 기반 타이머 (60fps 동기화, 실제 state 갱신은 0.1s 버킷) ──────
// setInterval 대비 CSS 트랜지션 트리거 타이밍이 프레임에 정확히 정렬됨
function useElapsed(total) {
    const [elapsed, setElapsed] = useState(0);
    const rafRef  = useRef(null);
    const startRef = useRef(null);
    const lastRef  = useRef(-1);

    useEffect(() => {
        startRef.current = performance.now();
        const tick = (now) => {
            const raw     = (now - startRef.current) / 1000;
            const rounded = Math.min(+(raw.toFixed(1)), total);
            if (rounded !== lastRef.current) {
                lastRef.current = rounded;
                setElapsed(rounded);
            }
            if (raw < total) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [total]);

    return elapsed;
}

// ── 숫자 카운터 ───────────────────────────────────────────────────────
function useCountUp(target, active, duration = 1200) {
    const [val, setVal] = useState(0);
    const raf = useRef(null);
    const t0  = useRef(null);
    useEffect(() => {
        if (!active) { setVal(0); return; }
        t0.current = performance.now();
        const tick = (now) => {
            const p = Math.min((now - t0.current) / duration, 1);
            setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [active, target, duration]);
    return val;
}

// ── Typographic Reveal ────────────────────────────────────────────────
// overflow:hidden + inner translateY → 마스크 안에서 밀고 올라오는 TV방송 연출
function RevealText({ children, active, delay = 0, duration = 0.75, style = {}, innerStyle = {} }) {
    return (
        <div style={{ overflow: 'hidden', ...style }}>
            <div style={{
                transform: active ? 'translateY(0)' : 'translateY(108%)',
                opacity:   active ? 1 : 0,
                transition: `transform ${duration}s ${delay}s ${EASE_OUT}, opacity ${duration * 0.5}s ${delay}s ease`,
                ...innerStyle,
            }}>
                {children}
            </div>
        </div>
    );
}

// ── Light Sweep ───────────────────────────────────────────────────────
// 씬 진입 시 사선 빛이 유리를 닦고 지나가는 효과 (1회 재생)
function LightSweep({ active }) {
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
            <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '45%',
                background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)',
                animation: active ? 'lfLightSweep 0.85s 0.05s ease-out forwards' : 'none',
                opacity: 0,
            }} />
        </div>
    );
}

// ── SVG Score Ring ────────────────────────────────────────────────────
function ScoreRing({ score, max = 100, label, color, active, size = 150 }) {
    const r    = size * 0.41;
    const circ = 2 * Math.PI * r;
    const off  = circ * (1 - Math.min(score, max) / max);
    const disp = useCountUp(score, active);
    const fz   = Math.round(size * 0.3);
    return (
        // 오버슈트 스프링으로 링 전체가 탄력 있게 등장
        <div style={{
            position: 'relative', width: size, height: size, flexShrink: 0,
            transform: active ? 'scale(1)' : 'scale(0.6)',
            opacity:   active ? 1 : 0,
            transition: active
                ? `transform 0.65s 0.1s ${SPRING}, opacity 0.35s 0.1s ease`
                : 'none',
        }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={active ? off : circ}
                    style={{
                        transform: `rotate(-90deg)`, transformOrigin: `${size/2}px ${size/2}px`,
                        transition: active ? 'stroke-dashoffset 1.8s 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none',
                        filter: active ? `drop-shadow(0 0 12px ${color})` : 'none',
                    }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: fz, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>{disp}</div>
            </div>
        </div>
    );
}

// ── 가격 히스토리 라인차트 (SVG 애니메이션) ─────────────────────────
// 선이 왼쪽→오른쪽으로 직접 그려지는 cinematic reveal
// 색상: 회색(과거) → verdict 색(현재) 그라데이션
function PriceHistoryChart({ history, active, lowestPrice, color }) {
    const [progress, setProgress] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!active) { setProgress(0); return; }
        const DELAY = 150, DUR = 2000;
        let start = null;
        const tick = (now) => {
            if (!start) start = now;
            const t = Math.min(Math.max(now - start - DELAY, 0) / DUR, 1);
            setProgress(1 - Math.pow(1 - t, 3)); // easeOutCubic
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [active]);

    if (!history?.length) return null;

    const W = 1000, H = 260;
    const PAD = { top: 20, right: 110, bottom: 46, left: 10 };
    const cW  = W - PAD.left - PAD.right;
    const cH  = H - PAD.top  - PAD.bottom;
    const n   = history.length;

    const prices = history.map(h => h.price);
    const allP   = lowestPrice > 0 ? [...prices, lowestPrice] : prices;
    const maxP   = Math.max(...allP), minP = Math.min(...allP);
    const range  = maxP - minP || 1;

    const toX = (i) => PAD.left + (n < 2 ? cW / 2 : (i / (n - 1)) * cW);
    const toY = (p)  => PAD.top + cH - ((p - minP) / range) * cH;

    const pts = history.map((h, i) => [toX(i), toY(h.price)]);

    // Cubic bezier 스무딩 (수평 핸들 → 오버슈트 없음)
    const linePath = pts.reduce((acc, [x, y], i) => {
        if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        const [px, py] = pts[i - 1];
        const cx1 = (px + (x - px) * 0.45).toFixed(1);
        const cx2 = (x  - (x - px) * 0.45).toFixed(1);
        return `${acc} C ${cx1} ${py.toFixed(1)}, ${cx2} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');

    const [lx, ly] = pts[pts.length - 1];
    const [fx]     = pts[0];
    const baseY    = PAD.top + cH;
    const areaPath = `${linePath} L ${lx.toFixed(1)} ${baseY} L ${fx.toFixed(1)} ${baseY} Z`;

    const atlY    = lowestPrice > 0 ? toY(lowestPrice) : null;
    const clipW   = Math.max(0, (cW + PAD.right + 20) * progress);
    const showDot = progress > 0.88;
    const showAtl = progress > 0.4;
    const fmtL    = (p) => p >= 10000 ? `${(p / 10000).toFixed(1)}만` : p.toLocaleString();

    return (
        <svg viewBox={`0 0 ${W} ${H}`}
             style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible', fontFamily: 'inherit' }}>
            <defs>
                {/* 라인 클립: 왼쪽→오른쪽 reveal */}
                <clipPath id="phcClip">
                    <rect x={PAD.left - 5} y={0} width={clipW} height={H} />
                </clipPath>
                {/* 라인 색상: 회색 → verdict 색 */}
                <linearGradient id="phcLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
                    <stop offset="60%"  stopColor={color} stopOpacity="0.7" />
                    <stop offset="100%" stopColor={color} />
                </linearGradient>
                {/* 영역 채우기: 위→아래 페이드 */}
                <linearGradient id="phcArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
                {/* 라인 glow */}
                <filter id="phcGlow" x="-10%" y="-80%" width="120%" height="260%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                {/* 끝점 dot glow */}
                <filter id="phcDotGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* 서브 그리드 (매우 희미) */}
            {[0.33, 0.67].map(t => (
                <line key={t}
                    x1={PAD.left} y1={PAD.top + cH * (1 - t)}
                    x2={W - PAD.right} y2={PAD.top + cH * (1 - t)}
                    stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                />
            ))}

            {/* 역대최저가 기준선 — 라인이 절반 그려진 후 페이드인 */}
            {atlY !== null && (
                <g opacity={showAtl ? 1 : 0} style={{ transition: 'opacity 0.7s ease' }}>
                    <line x1={PAD.left} y1={atlY} x2={W - PAD.right} y2={atlY}
                          stroke="rgba(34,197,94,0.4)" strokeWidth="1.5" strokeDasharray="8,5" />
                    <text x={W - PAD.right + 10} y={atlY - 4}
                          fill="rgba(34,197,94,0.6)" fontSize="15" fontWeight="900">역대최저</text>
                    <text x={W - PAD.right + 10} y={atlY + 20}
                          fill="#22c55e" fontSize="24" fontWeight="900">{fmtL(lowestPrice)}</text>
                </g>
            )}

            {/* 영역 채우기 (클립) */}
            <path d={areaPath} fill="url(#phcArea)" clipPath="url(#phcClip)" />

            {/* 메인 라인 (클립 + glow) */}
            <path d={linePath} fill="none"
                  stroke="url(#phcLine)" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  clipPath="url(#phcClip)"
                  filter="url(#phcGlow)"
            />

            {/* 데이터 포인트 dot — 라인이 지나간 자리에 순차 등장 */}
            {pts.map(([x, y], i) => {
                const threshold = n < 2 ? 0.5 : i / (n - 1);
                const visible   = i < n - 1 && progress > threshold + 0.08;
                return (
                    <circle key={i} cx={x} cy={y}
                            r={visible ? 4.5 : 0} fill={color} fillOpacity={0.6}
                            style={{ transition: 'r 0.25s ease' }} />
                );
            })}

            {/* 현재가 끝점 — 대형 pulse dot */}
            {showDot && (
                <g filter="url(#phcDotGlow)">
                    <circle cx={lx} cy={ly} r={9} fill={color}
                            style={{ animation: 'lfBarPulse 2s 0.3s ease-in-out infinite' }} />
                    <circle cx={lx} cy={ly} r={18} fill="none"
                            stroke={color} strokeWidth="1.5" strokeOpacity="0.35"
                            style={{ animation: 'lfBarPulse 2s 0.3s ease-in-out infinite' }} />
                </g>
            )}

            {/* 날짜 레이블 */}
            {pts.map(([x], i) => {
                const show = n <= 3
                    ? true
                    : i === 0 || i === n - 1 || (n >= 5 && i % Math.floor(n / 4) === 0);
                if (!show) return null;
                return (
                    <text key={i} x={i === n - 1 ? Math.min(x, W - PAD.right - 10) : x}
                          y={H - 2} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                          fill="rgba(255,255,255,0.3)" fontSize="19" fontWeight="700">
                        {history[i].date.slice(5).replace('-', '/')}
                    </text>
                );
            })}
        </svg>
    );
}

// ── Ambient 파티클 ────────────────────────────────────────────────────
function AmbientParticles({ color }) {
    const items = useMemo(() =>
        Array.from({ length: 8 }, (_, i) => ({
            id: i, sym: ['₩', '%', '↑', '★', '↓', '◆', '¥', '↗'][i % 8],
            x: 10 + (i * 11) % 80, y: 10 + (i * 17) % 80,
            size: 18 + (i * 7) % 20, delay: i * 1.1, dur: 8 + (i * 1.3) % 6,
        })), []);
    const c = color.replace(/[\d.]+\)$/, '0.07)');
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {items.map(p => (
                <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size, fontWeight: 900, color: c, animation: `lfFloat ${p.dur}s ${p.delay}s ease-in-out infinite` }}>{p.sym}</div>
            ))}
        </div>
    );
}

// ── Confetti ─────────────────────────────────────────────────────────
function Confetti({ active }) {
    const items = useMemo(() =>
        Array.from({ length: 24 }, (_, i) => ({
            id: i, sym: ['★', '✦', '♦', '+', '◆', '·', '✧', '⬟'][i % 8],
            x: 2 + Math.random() * 96, y: 10 + Math.random() * 80,
            color: ['#22c55e', '#facc15', '#60a5fa', '#f87171', '#a78bfa'][i % 5],
            size: 14 + Math.random() * 14, delay: Math.random() * 2.5,
        })), []);
    if (!active) return null;
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {items.map(p => (
                <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size, fontWeight: 900, color: p.color, animation: `lfConfetti 3s ${p.delay}s ease-out forwards` }}>{p.sym}</div>
            ))}
        </div>
    );
}

// ── Scene 헤더 ─────────────────────────────────────────────────────────
function SceneHeader({ num, label, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
            <div style={{ width: 6, height: 48, background: color, borderRadius: 3, boxShadow: `0 0 18px ${color}, 0 0 40px ${color}60`, flexShrink: 0 }} />
            <div>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)', lineHeight: 1 }}>
                    {String(num).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', lineHeight: 1.1, textShadow: `0 0 40px ${color}80, 0 2px 24px rgba(0,0,0,0.95)` }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

// ── 판정별 설정 ───────────────────────────────────────────────────────
const VCFG = {
    BUY_NOW: {
        label: '지금 사세요', color: '#22c55e',
        auroraA: 'rgba(34,197,94,0.30)', auroraB: 'rgba(20,184,166,0.18)', auroraC: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.45)', glow: 'rgba(34,197,94,',
        icon: (sz) => (
            <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.55)', boxShadow: '0 0 50px rgba(34,197,94,0.65)', animation: 'pulse 2s ease-in-out infinite' }} />
                <Circle style={{ position: 'relative', zIndex: 1, width: sz, height: sz, color: '#22c55e', padding: sz * 0.1, filter: 'drop-shadow(0 0 18px rgba(34,197,94,1))' }} />
            </div>
        ),
    },
    GOOD_OFFER: {
        label: '괜찮은 가격', color: '#facc15',
        auroraA: 'rgba(234,179,8,0.28)', auroraB: 'rgba(245,158,11,0.18)', auroraC: 'rgba(234,179,8,0.10)',
        border: 'rgba(234,179,8,0.45)', glow: 'rgba(234,179,8,',
        icon: (sz) => (
            <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(234,179,8,0.55)', boxShadow: '0 0 50px rgba(234,179,8,0.65)', animation: 'pulse 2s ease-in-out infinite' }} />
                <Triangle style={{ position: 'relative', zIndex: 1, width: sz, height: sz, color: '#facc15', padding: sz * 0.1, filter: 'drop-shadow(0 0 18px rgba(234,179,8,1))' }} />
            </div>
        ),
    },
    WAIT: {
        label: '기다리세요', color: '#f87171',
        auroraA: 'rgba(239,68,68,0.28)', auroraB: 'rgba(168,85,247,0.18)', auroraC: 'rgba(239,68,68,0.10)',
        border: 'rgba(239,68,68,0.45)', glow: 'rgba(239,68,68,',
        icon: (sz) => (
            <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.55)', boxShadow: '0 0 50px rgba(239,68,68,0.65)', animation: 'pulse 2s ease-in-out infinite' }} />
                <X style={{ position: 'relative', zIndex: 1, width: sz, height: sz, color: '#f87171', padding: sz * 0.09, filter: 'drop-shadow(0 0 18px rgba(239,68,68,1))' }} />
            </div>
        ),
    },
    TRACKING: {
        label: '추적 중', color: '#60a5fa',
        auroraA: 'rgba(59,130,246,0.28)', auroraB: 'rgba(99,102,241,0.18)', auroraC: 'rgba(59,130,246,0.10)',
        border: 'rgba(59,130,246,0.45)', glow: 'rgba(59,130,246,',
        icon: (sz) => (
            <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.55)', boxShadow: '0 0 50px rgba(59,130,246,0.65)', animation: 'pulse 2s ease-in-out infinite' }} />
                <Square style={{ position: 'relative', zIndex: 1, width: sz, height: sz, color: '#60a5fa', padding: sz * 0.1, fill: 'rgba(59,130,246,0.2)', filter: 'drop-shadow(0 0 18px rgba(59,130,246,1))' }} />
            </div>
        ),
    },
};

// ── 소형 판정 아이콘 (에디션 행용) ────────────────────────────────────
function MiniVerdictDot({ verdict }) {
    const colors = { BUY_NOW: '#22c55e', GOOD_OFFER: '#facc15', WAIT: '#f87171', TRACKING: '#60a5fa' };
    const c = colors[verdict] ?? 'rgba(255,255,255,0.4)';
    const icons = { BUY_NOW: Circle, GOOD_OFFER: Triangle, WAIT: X, TRACKING: Square };
    const Icon = icons[verdict] ?? Circle;
    return <Icon style={{ width: 14, height: 14, color: c, flexShrink: 0 }} />;
}

// ── fadeIn 헬퍼 (단순 opacity+translateY) ────────────────────────────
const fadeIn = (active, delay = 0, dur = 0.75) => ({
    opacity: active ? 1 : 0,
    transform: active ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity ${dur}s ${delay}s ease, transform ${dur}s ${delay}s ${EASE_OUT}`,
});

// ═══════════════════════════════════════════════════════════════════════
export default function GameLongformCard({ game, showOutro = false }) {
    const SCENES = showOutro ? [...SCENES_BASE, SCENE_OUTRO] : SCENES_BASE;
    const TOTAL  = showOutro ? 58 : 49;

    const elapsed = useElapsed(TOTAL);

    const cfg   = VCFG[game.priceVerdict] ?? VCFG.TRACKING;
    const isBuy = game.priceVerdict === 'BUY_NOW' || game.priceVerdict === 'GOOD_OFFER';
    const title = cleanTitle(game.title);

    // ── 씬별 보조 aurora 색상 (씬 전환마다 분위기 미세 변조) ──
    const currentSceneId = [...SCENES].reverse().find(s => elapsed >= s.from)?.id ?? 'intro';

    // ── 씬별 이미지 parallax transform + filter ──
    const IMAGE_SCENE_TRANSFORM = {
        intro:   'scale(1) rotate(0deg) translateX(0px) translateY(0px)',
        price:   'scale(1.04) rotate(-0.6deg) translateY(-10px)',
        quality: 'scale(1.05) rotate(0.8deg) translateX(5px)',
        edition: 'scale(1.03) rotate(-0.4deg) translateX(-5px) translateY(4px)',
        verdict: 'scale(1.06) rotate(0deg) translateY(-12px)',
        outro:   'scale(1.02) rotate(0deg) translateY(0px)',
    };
    const IMAGE_SCENE_FILTER = {
        intro:   'brightness(1) saturate(1)',
        price:   'brightness(0.94) saturate(1.2)',
        quality: 'brightness(1.06) saturate(1.3)',
        edition: 'brightness(0.97) saturate(1.1)',
        verdict: 'brightness(1.1) saturate(1.35)',
        outro:   'brightness(0.88) saturate(0.9)',
    };
    const auxAuroraColor = SCENE_AUX_AURORA[currentSceneId] ?? 'transparent';

    // ── 가격 데이터 ──
    const daysLeft      = game.saleEndDate && game.discountRate > 0
        ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : null;
    const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

    // ── 방어력 (null 안전 처리) ──
    const defMonthsPerSale = (game.defenseInfo?.monthsPerSale > 0)  ? game.defenseInfo.monthsPerSale  : null;
    const defDiscountCount = (game.defenseInfo?.discountCount > 0)  ? game.defenseInfo.discountCount  : null;
    const defMaxRate       = (game.defenseInfo?.maxRate       > 0)  ? game.defenseInfo.maxRate        : null;
    const defNextSale      = game.defenseInfo?.nextSaleEstimate || null;
    const hasDefenseInfo   = !!(defMonthsPerSale || defNextSale);

    // ── 방어력 티어 시각화 (DefenseTrophyCard에서 차용, 영상용 dark 스타일) ──
    const defTierRaw  = game.defenseInfo?.tier ?? null;
    const defTierLetter = defTierRaw
        ? (defTierRaw.includes('신작') ? 'N' : defTierRaw === '관측 중' ? '?' : defTierRaw[0])
        : null;
    const DEF_TIER_CFG = {
        S: { color: '#C8C8D8', glow: 'rgba(200,200,216,', label: 'Platinum', desc: '거의 할인하지 않음' },
        A: { color: '#D4AF37', glow: 'rgba(212,175,55,',  label: 'Gold',     desc: '할인에 보수적' },
        B: { color: '#A8A9B4', glow: 'rgba(168,169,180,', label: 'Silver',   desc: '가끔 할인' },
        C: { color: '#CD7F32', glow: 'rgba(205,127,50,',  label: 'Bronze',   desc: '주기적으로 할인' },
        D: { color: '#C0392B', glow: 'rgba(192,57,43,',   label: 'Iron',     desc: '자주 할인됨' },
        N: { color: '#2DD4BF', glow: 'rgba(45,212,191,',  label: 'New',      desc: '신규 출시' },
    };
    const defCfg = (defTierLetter && DEF_TIER_CFG[defTierLetter])
        ?? { color: 'rgba(255,255,255,0.4)', glow: 'rgba(255,255,255,', label: '—', desc: '데이터 부족' };

    // ── 품질 ──
    const mcScore      = game.mcMetaScore  || null;
    const mcUser       = game.mcUserScore  > 0 ? game.mcUserScore       : null;
    const mcCount      = game.mcMetaCount  > 0 ? game.mcMetaCount       : null;
    const mcUserCount  = game.mcUserCount  > 0 ? game.mcUserCount       : null;
    const igdbScore    = game.igdbCriticScore ? Math.round(game.igdbCriticScore) : null;
    const igdbUser     = game.igdbUserScore > 0 ? Math.round(game.igdbUserScore) : null;
    const igdbUserCount     = game.igdbUserCount  > 0 ? Math.round(game.igdbUserCount)  : null;
    const igdbCriticCount   = game.igdbCriticCount > 0 ? game.igdbCriticCount            : null;
    const hasScores = !!(mcScore || igdbScore);

    const hltbMain   = game.hltbMainStory     > 0 ? game.hltbMainStory     : null;
    const hltbExtra  = game.hltbMainExtra     > 0 ? game.hltbMainExtra     : null;
    const hltbComp   = game.hltbCompletionist > 0 ? game.hltbCompletionist : null;
    const pricePerHr = (hltbMain && game.currentPrice > 0) ? Math.round(game.currentPrice / hltbMain) : null;

    // ── 에디션 ──
    const myEditionContents = game.familyGames?.find(e => e.id === game.id)?.editionContents ?? [];
    const allEditions = (game.familyGames ?? []);
    const hasEditions = allEditions.length > 1;

    // 에디션 가격 인사이트 — hero 배너용 (가격 역전/업그레이드 기회)
    const editionHeroBadge = (() => {
        if (!hasEditions) return null;
        for (const ed of allEditions) {
            if (ed.id === game.id) continue;
            const priceGap = ed.currentPrice  - game.currentPrice;
            const origGap  = ed.originalPrice - game.originalPrice;
            const isHigher = origGap > 0;
            const isLower  = origGap < 0;
            if (isHigher && priceGap < 0)
                return { Icon: Flame,        color: '#22c55e', bg: 'rgba(34,197,94,0.13)',  border: 'rgba(34,197,94,0.45)',
                         text: '상위 에디션이 오히려 더 저렴합니다',
                         sub: `${cleanTitle(ed.name)} — ${fmt(ed.currentPrice)}원` };
            if (isLower && priceGap > 0)
                return { Icon: AlertTriangle, color: '#f87171', bg: 'rgba(239,68,68,0.13)',  border: 'rgba(239,68,68,0.45)',
                         text: '하위 에디션인데 더 비쌉니다',
                         sub: `현재 에디션보다 ${fmt(priceGap)}원 더 비싼 상황` };
            if (isHigher && priceGap >= 0 && priceGap <= 15000 && ed.discountRate > 0)
                return { Icon: TrendingUp,   color: '#facc15', bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.38)',
                         text: `${fmt(priceGap)}원 추가로 상위 에디션 선택 가능`,
                         sub: cleanTitle(ed.name) };
            if (isLower && priceGap < 0)
                return { Icon: TrendingDown, color: '#60a5fa', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.38)',
                         text: `기본 에디션으로 ${fmt(Math.abs(priceGap))}원 절약 가능`,
                         sub: cleanTitle(ed.name) };
        }
        return null;
    })();

    // ── Scene 패널 스타일 ──
    const S = {};
    SCENES.forEach(s => { S[s.id] = panelStyle(s, elapsed); });

    // ── 진입 타이밍 플래그 ──
    // 씬 content 등장은 씬이 완전히 fade-in 된 후(from + TRANS)부터 시작
    const IN = {
        introCover:   useEntered(elapsed, SCENES_BASE[0].from + 0.1),
        introVerdict: useEntered(elapsed, SCENES_BASE[0].from + 0.4),
        introTitle:   useEntered(elapsed, SCENES_BASE[0].from + 0.8),
        introPrice:   useEntered(elapsed, SCENES_BASE[0].from + 1.3),
        priceHero:    useEntered(elapsed, SCENES_BASE[1].from + TRANS + 0.1),
        priceBadge:   useEntered(elapsed, SCENES_BASE[1].from + TRANS + 0.5),
        quality:      useEntered(elapsed, SCENES_BASE[2].from + TRANS + 0.1),
        qualityPlay:  useEntered(elapsed, SCENES_BASE[2].from + TRANS + 0.6),
        edition:      useEntered(elapsed, SCENES_BASE[3].from + TRANS + 0.1),
        editionItems: useEntered(elapsed, SCENES_BASE[3].from + TRANS + 0.5),
        verdict:      useEntered(elapsed, SCENES_BASE[4].from + TRANS + 0.1),
        verdictSub:   useEntered(elapsed, SCENES_BASE[4].from + TRANS + 0.6),
        // outro 플래그: showOutro 여부와 무관하게 항상 선언 (hooks 규칙)
        outroTitle:   useEntered(elapsed, SCENE_OUTRO.from + 0.4),
        outroSub:     useEntered(elapsed, SCENE_OUTRO.from + 0.7),
        outroIcons:   useEntered(elapsed, SCENE_OUTRO.from + 0.9),
        outroCta:     useEntered(elapsed, SCENE_OUTRO.from + 1.2),
    };

    // ── Light Sweep 트리거 (씬 완전 진입 후 1회) ──
    const SWEEP = {
        price:   useEntered(elapsed, SCENES_BASE[1].from + TRANS * 0.5),
        quality: useEntered(elapsed, SCENES_BASE[2].from + TRANS * 0.5),
        edition: useEntered(elapsed, SCENES_BASE[3].from + TRANS * 0.5),
        verdict: useEntered(elapsed, SCENES_BASE[4].from + TRANS * 0.5),
    };

    // ── one-shot active flags (씬 종료 후 false 안 됨 → 차트/링 리셋 방지) ──
    const priceChartActive = elapsed >= SCENES_BASE[1].from + TRANS;
    const qualityActive    = elapsed >= SCENES_BASE[2].from + TRANS;
    const verdictActive    = elapsed >= SCENES_BASE[4].from + TRANS;

    // ── 품질 씬 — 스코어 count-up + 색상 (항상 선언, hooks 규칙) ──
    const mainScore   = (mcScore ?? igdbScore) ?? 0;
    const scoreColor  = mainScore >= 75 ? '#22c55e' : mainScore >= 50 ? '#facc15' : '#f87171';
    const scoreCountUp = useCountUp(mainScore, qualityActive, 900);

    // ── 판정 근거 한 줄 (씬4 타이틀 대체) ──
    const verdictReason = (() => {
        if (game.priceVerdict === 'BUY_NOW') {
            if (game.isAllTimeLowNew) return '역대 최저가 갱신 — 지금이 최적의 구매 시점';
            return '현재 가격은 구매하기에 충분히 좋은 타이밍';
        }
        if (game.priceVerdict === 'GOOD_OFFER') {
            if (game.lowestPrice > 0 && game.currentPrice > game.lowestPrice)
                return `역대최저 ${fmt(game.lowestPrice)}원 기록 있음 — 나쁘지 않지만 최선은 아님`;
            return '합리적인 가격이지만 더 기다릴 여지 있음';
        }
        if (game.priceVerdict === 'WAIT') {
            if (game.lowestPrice > 0 && game.currentPrice > game.lowestPrice)
                return `역대최저 ${fmt(game.lowestPrice)}원까지 ${fmt(game.currentPrice - game.lowestPrice)}원 더 기다리세요`;
            if (defNextSale) return '다음 할인 시즌까지 구매를 미루는 것을 추천';
            return '지금은 구매 타이밍이 아닙니다';
        }
        return '충분한 데이터 수집 후 판정 예정';
    })();

    const progressPct = Math.max(0, Math.min(100, (elapsed / TOTAL) * 100));
    const HPAD = '52px';

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#080810', overflow: 'hidden', display: 'flex', userSelect: 'none' }}>

            {/* ── Aurora 배경 (씬별 보조 색상 포함) ── */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: '55%', height: '75%', background: cfg.auroraA, borderRadius: '50%', filter: 'blur(75px)', animation: 'lfPulseAurora 8s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '-15%', left: '8%', width: '50%', height: '65%', background: cfg.auroraB, borderRadius: '50%', filter: 'blur(90px)', animation: 'lfPulseAurora 11s 3s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: '25%', left: '-8%', width: '30%', height: '45%', background: cfg.auroraC, borderRadius: '50%', filter: 'blur(60px)', animation: 'lfPulseAurora 14s 6s ease-in-out infinite' }} />
                {/* 씬별 보조 aurora: 2초 트랜지션으로 분위기 전환 */}
                <div style={{ position: 'absolute', top: '35%', left: '30%', width: '55%', height: '55%', background: auxAuroraColor, borderRadius: '50%', filter: 'blur(80px)', transition: 'background 2s ease', animation: 'lfPulseAurora 12s 4s ease-in-out infinite' }} />
            </div>

            <AmbientParticles color={cfg.border} />

            {/* 외곽 프레임 */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none', border: `2px solid ${cfg.border}`, boxShadow: `inset 0 0 80px ${cfg.glow}0.06)` }} />

            {/* ── Progress bar + 씬 마커 ── */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, zIndex: 65, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: cfg.color, boxShadow: `0 0 12px ${cfg.glow}0.9)`, transition: 'width 0.1s linear' }} />
                {/* 씬 경계 마커 */}
                {SCENES.map(s => {
                    const pct       = Math.max(0, Math.min(100, ((s.from - 3) / (TOTAL - 3)) * 100));
                    const isReached = elapsed >= s.from;
                    return (
                        <div key={s.id} style={{
                            position: 'absolute', top: 0, bottom: 0, left: `${pct}%`,
                            width: 2, borderRadius: 1,
                            background: isReached ? cfg.color : 'rgba(255,255,255,0.25)',
                            boxShadow: isReached ? `0 0 6px ${cfg.glow}0.9)` : 'none',
                            transition: 'background 0.4s, box-shadow 0.4s',
                            animation: isReached ? 'none' : 'lfMarkerPulse 2s ease-in-out infinite',
                        }} />
                    );
                })}
            </div>

            {/* ════ 왼쪽: 커버 (33%) ════ */}
            <div style={{ width: '33%', height: '100%', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
                {/* 씬별 parallax 래퍼: kenBurns와 분리된 별도 레이어 */}
                <div style={{
                    width: '100%', height: '100%',
                    transform: IMAGE_SCENE_TRANSFORM[currentSceneId] ?? 'scale(1)',
                    filter: IMAGE_SCENE_FILTER[currentSceneId] ?? 'brightness(1)',
                    transition: 'transform 2.2s cubic-bezier(0.25,0.46,0.45,0.94), filter 2s ease',
                    willChange: 'transform, filter',
                }}>
                    <div style={{ width: '100%', height: '100%', animation: 'kenBurns 58s ease-in-out forwards' }}>
                        <PSGameImage src={game.imageUrl} alt={title} priority width={640} className="w-full h-full object-cover object-top" />
                    </div>
                </div>
                {/* 우측으로 짙어지는 그라데이션 + 하단 페이드 */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 40%, #080810 100%), linear-gradient(to bottom, rgba(8,8,16,0.45) 0%, transparent 22%, transparent 60%, rgba(8,8,16,0.85) 100%)' }} />


                {/* PV + Apple 스타일 메타 정보 — 뱃지 없이 타이포그래피만으로 위계 */}
                <div style={{ position: 'absolute', bottom: 24, left: 18, right: 12, display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {/* verdict 색상 얇은 룰 — 인증 구역 선언 */}
                    <div style={{ width: '60%', height: 1.5, background: cfg.color, opacity: 0.65, borderRadius: 1, boxShadow: `0 0 8px ${cfg.glow}0.5)` }} />

                    {/* 장르 — editorial uppercase */}
                    {game.genres?.[0] && (
                        <div style={{
                            fontSize: 18, fontWeight: 900, letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.92)',
                            textShadow: '0 2px 20px rgba(0,0,0,1)',
                        }}>
                            {game.genres[0]}
                        </div>
                    )}

                    {/* 플랫폼 + 속성 — dot separator 인라인, 뱃지 없음 */}
                    {(() => {
                        const items = [
                            ...(game.platforms?.slice(0, 2) ?? []).map(p => ({ text: p, color: 'rgba(255,255,255,0.68)' })),
                            game.isPs5ProEnhanced ? { text: 'PS5 Pro', color: 'rgba(226,232,240,0.9)' } : null,
                            game.isPlusExclusive  ? { text: 'PS Plus', color: '#fde047'               } : null,
                        ].filter(Boolean);
                        if (!items.length) return null;
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
                                {items.map((item, i) => (
                                    <React.Fragment key={item.text}>
                                        <span style={{
                                            fontSize: 13, fontWeight: 900, letterSpacing: '0.06em',
                                            color: item.color,
                                            textShadow: '0 1px 14px rgba(0,0,0,1)',
                                        }}>{item.text}</span>
                                        {i < items.length - 1 && (
                                            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, margin: '0 9px' }}>·</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ════ 오른쪽: 씬 패널 (67%) ════ */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* 게임 아트 배경 */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url(${game.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(50px) brightness(0.06) saturate(1.3)' }} />
                {/* 밝은 커버 이미지 대비 텍스트 가독성 보장용 세이프티 그라데이션 */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to right, rgba(8,8,16,0.35) 0%, transparent 40%)' }} />

                {/* ─────────── Scene 1: 가격 분석 ─────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2, overflow: 'hidden', ...S.price }}>
                    <LightSweep active={SWEEP.price} />

                    {/* ── Ghost: 현재가 배경 타이포 ── */}
                    <div style={{
                        position: 'absolute', bottom: '18%', left: '-2%', right: 0,
                        fontSize: 'clamp(120px,18vw,220px)', fontWeight: 900, letterSpacing: '-0.05em',
                        color: '#fff', opacity: 0.028, lineHeight: 1,
                        pointerEvents: 'none', userSelect: 'none', zIndex: 0,
                        transform: IN.priceHero ? 'translateY(0)' : 'translateY(30px)',
                        transition: `transform 1.4s 0.2s ${EASE_OUT}`,
                        whiteSpace: 'nowrap',
                    }}>
                        {fmt(game.currentPrice)}
                    </div>

                    {/* ── 상단: 씬 헤더 ── */}
                    <div style={{ flexShrink: 0, padding: `26px ${HPAD} 0`, position: 'relative', zIndex: 1 }}>
                        <SceneHeader num={1} label="가격 분석" color={cfg.color} />
                    </div>

                    {/* ── 히어로 영역: 가격(좌) ↔ 할인율(우) ── */}
                    <div style={{
                        flexShrink: 0, position: 'relative', zIndex: 1,
                        padding: `16px ${HPAD} 0`,
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    }}>
                        {/* 좌: 현재가 */}
                        <div>
                            <RevealText active={IN.priceHero} duration={0.7}>
                                <div style={{
                                    fontSize: 96, fontWeight: 900, letterSpacing: '-0.04em',
                                    color: '#fff', lineHeight: 1,
                                    filter: isBuy ? `drop-shadow(0 0 30px ${cfg.glow}0.4))` : 'none',
                                }}>
                                    {fmt(game.currentPrice)}<span style={{ fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.28)', marginLeft: 10 }}>원</span>
                                </div>
                            </RevealText>
                            {/* 정가 취소선 */}
                            {game.originalPrice > 0 && game.discountRate > 0 && (
                                <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.28)', textDecoration: 'line-through', marginTop: 6, ...fadeIn(IN.priceHero, 0.25) }}>
                                    {fmt(game.originalPrice)}원
                                </div>
                            )}
                        </div>

                        {/* 우: 할인율 — 오른쪽 끝에서 충돌하듯 등장 */}
                        {game.discountRate > 0 && (
                            <RevealText active={IN.priceHero} delay={0.08} duration={0.65} style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontSize: 56, fontWeight: 900, letterSpacing: '-0.03em',
                                    color: cfg.color, lineHeight: 1,
                                    filter: `drop-shadow(0 0 28px ${cfg.glow}0.65))`,
                                }}>
                                    -{game.discountRate}%
                                </div>
                            </RevealText>
                        )}
                    </div>

                    {/* ── 뱃지 row ── */}
                    <div style={{ flexShrink: 0, display: 'flex', gap: 10, flexWrap: 'wrap', padding: `12px ${HPAD} 0`, position: 'relative', zIndex: 1 }}>
                        {isBuy && game.originalPrice > game.currentPrice && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
                                padding: '8px 18px', borderRadius: 10,
                                transform: IN.priceBadge ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(14px)',
                                opacity: IN.priceBadge ? 1 : 0,
                                transition: `transform 0.55s ${SPRING}, opacity 0.35s ease`,
                            }}>
                                <TrendingDown style={{ width: 18, height: 18, color: '#22c55e' }} />
                                <span style={{ fontSize: 17, fontWeight: 900, color: '#22c55e' }}>{fmt(game.originalPrice - game.currentPrice)}원 절약</span>
                            </div>
                        )}
                        {isBuy ? (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: game.isAllTimeLowNew ? `${cfg.glow}0.16)` : `${cfg.glow}0.08)`,
                                border: `1px solid ${cfg.glow}${game.isAllTimeLowNew ? '0.55' : '0.28'})`,
                                padding: '8px 18px', borderRadius: 10, position: 'relative', overflow: 'hidden',
                                boxShadow: game.isAllTimeLowNew ? `0 0 24px ${cfg.glow}0.3)` : 'none',
                                transform: IN.priceBadge ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(14px)',
                                opacity: IN.priceBadge ? 1 : 0,
                                transition: `transform 0.55s 0.08s ${SPRING}, opacity 0.35s 0.08s ease`,
                            }}>
                                {game.isAllTimeLowNew && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)', animation: 'shimmer 2s infinite' }} />}
                                <Flame style={{ width: 18, height: 18, color: cfg.color, position: 'relative' }} />
                                <span style={{ fontSize: 17, fontWeight: 900, color: cfg.color, position: 'relative' }}>
                                    {game.isAllTimeLowNew ? '역대최저가 갱신!' : game.priceVerdict === 'BUY_NOW' ? '역대최저가 동일' : `역대최저 ${fmt(game.lowestPrice)}원 근접`}
                                </span>
                            </div>
                        ) : game.lowestPrice > 0 && game.currentPrice > game.lowestPrice ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
                                padding: '8px 18px', borderRadius: 10,
                                transform: IN.priceBadge ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(12px)',
                                opacity: IN.priceBadge ? 1 : 0,
                                transition: `transform 0.55s ${SPRING}, opacity 0.35s ease`,
                            }}>
                                <TrendingUp style={{ width: 18, height: 18, color: '#f87171' }} />
                                <span style={{ fontSize: 17, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>
                                    지금 사면 <span style={{ color: '#fbbf24' }}>+{fmt(game.currentPrice - game.lowestPrice)}원</span> 손해
                                </span>
                            </div>
                        ) : null}
                    </div>

                    {/* ── 바차트: 나머지 공간 전부 ── */}
                    {(game.priceHistory?.length ?? 0) > 1 ? (
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `12px ${HPAD} 0`, position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8, flexShrink: 0 }}>PRICE HISTORY</div>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <PriceHistoryChart history={game.priceHistory.slice(-8)} active={priceChartActive} lowestPrice={game.lowestPrice} color={cfg.color} />
                            </div>
                        </div>
                    ) : <div style={{ flex: 1 }} />}

                    {/* ── 마감일 strip ── */}
                    {daysLeft !== null && daysLeft >= 0 && (
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: `12px ${HPAD}`, borderTop: `1px solid ${isClosingSoon ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`, position: 'relative', zIndex: 1 }}>
                            <CalendarDays style={{ width: 18, height: 18, color: isClosingSoon ? '#f87171' : 'rgba(255,255,255,0.55)', ...(isClosingSoon && { animation: 'pulse 1s infinite' }) }} />
                            <span style={{ fontSize: 16, fontWeight: 900, color: isClosingSoon ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                                {isClosingSoon ? `막차! ${fmtD(game.saleEndDate)} 마감` : `할인 종료 ${fmtD(game.saleEndDate)}`}
                            </span>
                        </div>
                    )}
                </div>

                {/* ─────────── Scene 2: 품질 검증 ─────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2, overflow: 'hidden', ...S.quality }}>
                    <LightSweep active={SWEEP.quality} />

                    {/* ── Ghost 배경: 점수가 화면을 압도 ── */}
                    {hasScores && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
                        }}>
                            <div style={{
                                fontSize: 480, fontWeight: 900, letterSpacing: '-0.06em',
                                color: scoreColor, lineHeight: 1,
                                opacity: qualityActive ? 0.055 : 0,
                                transform: IN.quality ? 'scale(1) translateY(8%)' : 'scale(0.7) translateY(8%)',
                                transition: `opacity 1.8s ease, transform 1.4s ${EASE_OUT}`,
                                userSelect: 'none',
                            }}>
                                {mainScore}
                            </div>
                        </div>
                    )}

                    {/* ── 배경 glow burst ── */}
                    <div style={{
                        position: 'absolute', top: '35%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 500, height: 500,
                        background: `${scoreColor}14`,
                        borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
                        opacity: qualityActive ? 1 : 0,
                        transition: 'opacity 1.5s ease',
                    }} />

                    {/* ── 씬 헤더 (좌상단 작게) ── */}
                    <div style={{ flexShrink: 0, padding: `24px ${HPAD} 0`, position: 'relative', zIndex: 1 }}>
                        <SceneHeader num={2} label="품질 검증" color={cfg.color} />
                    </div>

                    {/* ── 중앙: 점수 + 출처 ── */}
                    {hasScores ? (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            position: 'relative', zIndex: 1, gap: 0,
                            padding: `0 ${HPAD}`,
                        }}>
                            {/* 전문가 N인이 선택한 */}
                            {(mcCount || igdbCriticCount) && (
                                <RevealText active={IN.quality} delay={0.2} duration={0.6}>
                                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12, textAlign: 'center' }}>
                                        전문가 {(mcCount ?? igdbCriticCount).toLocaleString()}인이 선택한
                                    </div>
                                </RevealText>
                            )}

                            {/* 메인 점수 — 화면 중앙을 지배 */}
                            <div style={{
                                fontSize: 210, fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.05em',
                                color: scoreColor,
                                filter: qualityActive ? `drop-shadow(0 0 80px ${scoreColor}) drop-shadow(0 0 40px ${scoreColor})` : 'none',
                                transform: IN.quality ? 'scale(1)' : 'scale(0.3)',
                                opacity: IN.quality ? 1 : 0,
                                transition: `transform 0.9s 0.4s ${SPRING}, opacity 0.45s 0.4s ease, filter 1.2s 0.4s ease`,
                                textAlign: 'center',
                            }}>
                                {scoreCountUp}
                            </div>

                            {/* 출처 레이블 */}
                            <div style={{
                                fontSize: 14, fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.38)', marginTop: 14,
                                ...fadeIn(IN.quality, 0.9),
                            }}>
                                {mcScore ? 'METACRITIC' : 'IGDB'}
                            </div>
                        </div>
                    ) : (
                        /* 평점 없을 때: 플레이타임만 중앙에 크게 */
                        hltbMain ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: `0 ${HPAD}` }}>
                                <RevealText active={IN.qualityPlay} duration={0.8}>
                                    <div style={{ fontSize: 56, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>
                                        {Math.round(hltbMain)}시간의<br/>대모험
                                    </div>
                                </RevealText>
                                {pricePerHr && (
                                    <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color, marginTop: 18, ...fadeIn(IN.qualityPlay, 0.4) }}>
                                        {fmt(pricePerHr)}원 / 시간
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 둘 다 없을 때: 퍼블리셔/장르 */
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, gap: 16, ...fadeIn(IN.quality, 0) }}>
                                {game.publisher && <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{game.publisher}</div>}
                                {game.genres?.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                        {game.genres.map(g => (
                                            <span key={g} style={{ fontSize: 14, fontWeight: 900, padding: '6px 16px', borderRadius: 24, background: `${cfg.glow}0.12)`, border: `1px solid ${cfg.glow}0.3)`, color: cfg.color }}>{g}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {/* ── 하단 데이터 Strip ── */}
                    {(hasScores || hltbMain) && (() => {
                        const strips = [
                            (mcUser || igdbUser) ? {
                                key: 'user', label: '유저 평점',
                                main: (mcUser?.toFixed(1) ?? igdbUser) + '',
                                sub: (mcUserCount ?? igdbUserCount) ? `${(mcUserCount ?? igdbUserCount).toLocaleString()}명` : null,
                                color: '#fff',
                            } : null,
                            hltbMain ? {
                                key: 'time', label: '플레이타임',
                                main: `${Math.round(hltbMain)}시간`,
                                sub: hltbExtra ? `서브 ${Math.round(hltbExtra)}시간` : null,
                                color: '#fff',
                            } : null,
                            pricePerHr ? {
                                key: 'pph', label: '시간당 가격',
                                main: `${fmt(pricePerHr)}원`,
                                sub: '/ 시간',
                                color: cfg.color,
                            } : null,
                        ].filter(Boolean);

                        return strips.length > 0 ? (
                            <div style={{
                                flexShrink: 0, display: 'flex',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative', zIndex: 1,
                                ...fadeIn(IN.qualityPlay, 0),
                            }}>
                                {strips.map((s, i) => (
                                    <div key={s.key} style={{
                                        flex: 1, display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        padding: '20px 12px',
                                        borderRight: i < strips.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                                    }}>
                                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>{s.label}</div>
                                        <div style={{ fontSize: 38, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.main}</div>
                                        {s.sub && <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>{s.sub}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : null;
                    })()}
                </div>

                {/* ─────────── Scene 3: 에디션 비교 / 할인 이력 ─────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2, overflow: 'hidden', ...S.edition }}>
                    <LightSweep active={SWEEP.edition} />

                    {/* 씬 헤더 */}
                    <div style={{ flexShrink: 0, padding: `24px ${HPAD} 0`, position: 'relative', zIndex: 1 }}>
                        <SceneHeader num={3} label={hasEditions ? '에디션 비교' : '할인 패턴'} color={cfg.color} />
                    </div>

                    {hasEditions ? (
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `16px ${HPAD} 0`, gap: 0, position: 'relative', zIndex: 1 }}>

                            {/* ── 가격 인사이트 hero 배너 ── */}
                            {editionHeroBadge && (() => {
                                const HeroIcon = editionHeroBadge.Icon;
                                return (
                                    <div style={{
                                        flexShrink: 0, marginBottom: 14,
                                        padding: '18px 22px',
                                        background: editionHeroBadge.bg,
                                        border: `1.5px solid ${editionHeroBadge.border}`,
                                        borderRadius: 16,
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        position: 'relative', overflow: 'hidden',
                                        ...fadeIn(IN.edition, 0.1),
                                    }}>
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'shimmer 4s 1s ease-in-out infinite', pointerEvents: 'none' }} />
                                        <HeroIcon style={{ width: 30, height: 30, color: editionHeroBadge.color, flexShrink: 0, filter: `drop-shadow(0 0 10px ${editionHeroBadge.color}80)`, position: 'relative' }} />
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ fontSize: 22, fontWeight: 900, color: editionHeroBadge.color, lineHeight: 1.2 }}>{editionHeroBadge.text}</div>
                                            {editionHeroBadge.sub && <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>{editionHeroBadge.sub}</div>}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── 에디션 카드 (2개 이하면 나란히, 3개+면 세로) ── */}
                            <div style={{
                                flex: 1, minHeight: 0,
                                display: 'flex',
                                flexDirection: allEditions.length <= 2 ? 'row' : 'column',
                                gap: 12,
                            }}>
                                {allEditions.map((ed, i) => {
                                    const isCurrent   = ed.id === game.id;
                                    const hasContents = (ed.editionContents?.length ?? 0) > 0;
                                    const edColor     = VCFG[ed.priceVerdict]?.color ?? cfg.color;

                                    return (
                                        <div key={ed.id} style={{
                                            flex: allEditions.length <= 2 && !hasContents ? '0 0 36%' : 1,
                                            minHeight: 0, position: 'relative', overflow: 'hidden',
                                            background: isCurrent
                                                ? `linear-gradient(135deg, ${cfg.glow}0.14) 0%, ${cfg.glow}0.06) 100%)`
                                                : 'rgba(255,255,255,0.04)',
                                            border: isCurrent
                                                ? `2px solid ${cfg.glow}0.5)`
                                                : '1px solid rgba(255,255,255,0.09)',
                                            borderRadius: 20,
                                            padding: allEditions.length <= 2 ? '20px 22px' : '14px 20px',
                                            boxShadow: isCurrent ? `0 0 40px ${cfg.glow}0.15), inset 0 1px 0 ${cfg.glow}0.2)` : 'none',
                                            opacity:   IN.editionItems ? 1 : 0,
                                            transform: IN.editionItems
                                                ? 'translateY(0) scale(1)'
                                                : `translateY(${i % 2 === 0 ? '-' : ''}24px) scale(0.95)`,
                                            transition: `opacity 0.5s ${i * 0.12}s ease, transform 0.6s ${i * 0.12}s ${SPRING}`,
                                        }}>
                                            {/* NOW 뱃지 */}
                                            {isCurrent && (
                                                <div style={{
                                                    position: 'absolute', top: 14, right: 16,
                                                    fontSize: 9, fontWeight: 900, color: '#fff',
                                                    background: cfg.color, padding: '3px 10px', borderRadius: 5,
                                                    letterSpacing: '0.12em',
                                                    boxShadow: `0 0 12px ${cfg.glow}0.6)`,
                                                }}>NOW</div>
                                            )}

                                            {/* 에디션명 */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <MiniVerdictDot verdict={ed.priceVerdict} />
                                                <div style={{
                                                    fontSize: 14, fontWeight: 900,
                                                    color: isCurrent ? '#fff' : 'rgba(255,255,255,0.7)',
                                                    lineHeight: 1.3, flex: 1,
                                                }}>
                                                    {cleanTitle(ed.name)}
                                                </div>
                                            </div>

                                            {/* 가격 정보 — 크게 */}
                                            <div style={{ marginBottom: 14 }}>
                                                {ed.discountRate > 0 && (
                                                    <div style={{ fontSize: 14, fontWeight: 900, color: edColor, marginBottom: 4 }}>-{ed.discountRate}%</div>
                                                )}
                                                <div style={{ fontSize: allEditions.length <= 2 ? 46 : 30, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>
                                                    {fmt(ed.currentPrice)}<span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginLeft: 5 }}>원</span>
                                                </div>
                                                {ed.discountRate > 0 && (
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through', marginTop: 4 }}>{fmt(ed.originalPrice)}원</div>
                                                )}
                                            </div>

                                            {/* 구성품 bullet 리스트 or 기본판 안내 */}
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
                                                {hasContents ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                                        {ed.editionContents.slice(0, 4).map((item, idx) => (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                                <div style={{
                                                                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 7,
                                                                    background: isCurrent ? cfg.color : 'rgba(255,255,255,0.35)',
                                                                    boxShadow: isCurrent ? `0 0 6px ${cfg.color}` : 'none',
                                                                }} />
                                                                <span style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.58)', lineHeight: 1.4 }}>{item}</span>
                                                            </div>
                                                        ))}
                                                        {ed.editionContents.length > 4 && (
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', paddingLeft: 15 }}>
                                                                외 {ed.editionContents.length - 4}가지 포함
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>BASE EDITION</div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>추가 콘텐츠 없음</div>
                                                        {ed.platforms?.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                                                                {ed.platforms.slice(0, 3).map(p => (
                                                                    <span key={p} style={{ fontSize: 11, fontWeight: 900, color: '#93c5fd', background: 'rgba(30,58,138,0.7)', border: '1px solid rgba(147,197,253,0.35)', padding: '3px 10px', borderRadius: 6 }}>{p}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── 다음 할인 예상 (총할인/역대최저할인 제거 — 가격분석 씬과 중복) ── */}
                            {defNextSale && (
                                <div style={{ flexShrink: 0, padding: '14px 0 20px', ...fadeIn(IN.editionItems, 0.45) }}>
                                    <div style={{
                                        position: 'relative', overflow: 'hidden',
                                        background: `${cfg.glow}0.07)`, border: `1px solid ${cfg.glow}0.22)`,
                                        borderRadius: 16, padding: '16px 22px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)' }}>다음 할인 예상</div>
                                        <div style={{ fontSize: 30, fontWeight: 900, color: cfg.color, lineHeight: 1, filter: `drop-shadow(0 0 14px ${cfg.color}70)` }}>
                                            {defNextSale.slice(0, 7).replace('-', '년 ')}월
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── 에디션 없음: 할인 패턴을 화면 중앙에 크게 ── */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${HPAD} 24px`, gap: 20, position: 'relative', zIndex: 1 }}>

                            {/* Ghost 배경 수치 */}
                            {defMaxRate && (
                                <div style={{
                                    position: 'absolute', right: '-4%', top: '50%', transform: 'translateY(-55%)',
                                    fontSize: 320, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.06em',
                                    color: cfg.color, opacity: 0.04, pointerEvents: 'none', userSelect: 'none',
                                }}>
                                    -{defMaxRate}%
                                </div>
                            )}

                            {/* 수치 카드 행 */}
                            {(defDiscountCount !== null || defMaxRate || defMonthsPerSale) && (
                                <div style={{ display: 'flex', gap: 14, ...fadeIn(IN.editionItems, 0) }}>
                                    {defDiscountCount !== null && (
                                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '22px 24px' }}>
                                            <div style={{ position: 'absolute', right: 6, bottom: -14, fontSize: 90, fontWeight: 900, color: 'rgba(255,255,255,0.035)', lineHeight: 1, userSelect: 'none' }}>#</div>
                                            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>총 할인 횟수</div>
                                            <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{defDiscountCount}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>회</div>
                                        </div>
                                    )}
                                    {defMaxRate && (
                                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: `${cfg.glow}0.1)`, border: `1px solid ${cfg.glow}0.32)`, borderRadius: 20, padding: '22px 24px', boxShadow: `0 0 40px ${cfg.glow}0.14)` }}>
                                            <div style={{ position: 'absolute', right: 2, bottom: -14, fontSize: 90, fontWeight: 900, color: `${cfg.glow}0.07)`, lineHeight: 1, userSelect: 'none' }}>%</div>
                                            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>역대 최저 할인율</div>
                                            <div style={{ fontSize: 60, fontWeight: 900, color: cfg.color, lineHeight: 1, filter: `drop-shadow(0 0 22px ${cfg.color})` }}>-{defMaxRate}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, marginTop: 6, opacity: 0.65 }}>%</div>
                                        </div>
                                    )}
                                    {defMonthsPerSale && (
                                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '22px 24px' }}>
                                            <div style={{ position: 'absolute', right: 6, bottom: -14, fontSize: 90, fontWeight: 900, color: 'rgba(255,255,255,0.03)', lineHeight: 1, userSelect: 'none' }}>M</div>
                                            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>할인 주기</div>
                                            <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1 }}>~{Math.round(defMonthsPerSale)}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>개월마다</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 다음 할인 예상 — 강조 배너 */}
                            {defNextSale && (
                                <div style={{
                                    position: 'relative', overflow: 'hidden',
                                    padding: '24px 28px',
                                    background: `linear-gradient(135deg, ${cfg.glow}0.12) 0%, ${cfg.glow}0.05) 100%)`,
                                    border: `1px solid ${cfg.glow}0.32)`,
                                    borderRadius: 20, boxShadow: `0 0 40px ${cfg.glow}0.14)`,
                                    ...fadeIn(IN.editionItems, 0.15),
                                }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', animation: 'shimmer 4s 1.5s ease-in-out infinite', pointerEvents: 'none' }} />
                                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>다음 할인 예상 시점</div>
                                    <div style={{ fontSize: 44, fontWeight: 900, color: cfg.color, filter: `drop-shadow(0 0 20px ${cfg.color}80)` }}>
                                        {defNextSale.slice(0, 7).replace('-', '년 ')}월
                                    </div>
                                </div>
                            )}

                            {/* 데이터 없을 때 */}
                            {!defDiscountCount && !defNextSale && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, ...fadeIn(IN.edition, 0) }}>
                                    {game.publisher && <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{game.publisher}</div>}
                                    {game.genres?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                            {game.genres.map(g => (
                                                <span key={g} style={{ fontSize: 15, fontWeight: 900, padding: '7px 18px', borderRadius: 24, background: `${cfg.glow}0.12)`, border: `1px solid ${cfg.glow}0.3)`, color: cfg.color }}>{g}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─────────── Scene 4: 최종 판정 ─────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center', position: 'relative', zIndex: 2, padding: `28px ${HPAD}`, ...S.verdict }}>
                    <LightSweep active={SWEEP.verdict} />
                    <Confetti active={verdictActive && game.priceVerdict === 'BUY_NOW'} />

                    {/* 판정 아이콘 — TRACKING: 레이더 링 추가 */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {game.priceVerdict === 'TRACKING' && verdictActive && (<>
                            <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(96,165,250,0.3)', animation: 'lfRadarPulse 2.5s ease-out infinite' }} />
                            <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(96,165,250,0.2)', animation: 'lfRadarPulse 2.5s 1.25s ease-out infinite' }} />
                        </>)}
                        <div style={{
                            transform: IN.verdict ? 'scale(1)' : 'scale(0.4)',
                            opacity:   IN.verdict ? 1 : 0,
                            transition: `transform 0.7s ${SPRING}, opacity 0.35s ease`,
                        }}>
                            {cfg.icon(152)}
                        </div>
                    </div>

                    {/* 판정 라벨 — Typographic Reveal + GOOD_OFFER shimmer */}
                    <div style={{ position: 'relative' }}>
                        <RevealText active={IN.verdict} delay={0.15} duration={0.65}>
                            <div style={{
                                fontSize: 88, fontWeight: 900, color: cfg.color, lineHeight: 1,
                                filter: `drop-shadow(0 0 44px ${cfg.glow}0.65))`,
                                animation: verdictActive && game.priceVerdict === 'WAIT' ? 'lfGlitch 3s ease-in-out infinite' : 'none',
                            }}>{cfg.label}</div>
                        </RevealText>
                        {game.priceVerdict === 'GOOD_OFFER' && verdictActive && (
                            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 8 }}>
                                <div style={{ width: '55%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(250,204,21,0.18), transparent)', animation: 'shimmer 3s 1.5s ease-in-out infinite' }} />
                            </div>
                        )}
                    </div>

                    {/* 구매 근거 한 줄 */}
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.01em', wordBreak: 'keep-all', maxWidth: 560, lineHeight: 1.45, textAlign: 'center', ...fadeIn(IN.verdict, 0.3) }}>
                        {verdictReason}
                    </div>

                    {/* WAIT: 다음 할인 예상 서브 */}
                    {game.priceVerdict === 'WAIT' && defNextSale && (
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.68)', ...fadeIn(IN.verdict, 0.45) }}>
                            다음 할인 예상: <span style={{ color: cfg.color, fontWeight: 900 }}>{defNextSale.slice(0, 7).replace('-', '년 ')}월</span>
                        </div>
                    )}

                    {/* 핵심 지표 — 에디토리얼 컬럼 */}
                    {(() => {
                        const colDivider = { borderRight: '1px solid rgba(255,255,255,0.1)' };
                        const colBase = (delay) => ({
                            flex: 1, padding: '4px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            transform: IN.verdictSub ? 'translateY(0)' : 'translateY(20px)',
                            opacity:   IN.verdictSub ? 1 : 0,
                            transition: `transform 0.65s ${delay}s ${SPRING}, opacity 0.45s ${delay}s ease`,
                        });
                        const labelStyle = { fontSize: 10, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 2 };
                        const numStyle   = (color = '#fff') => ({ fontSize: 42, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em' });
                        const subStyle   = { fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 };

                        const cols = [];

                        // 가격 컬럼 — 항상 존재
                        cols.push(
                            <div key="price" style={{ ...colBase(0), ...colDivider }}>
                                <div style={labelStyle}>PRICE</div>
                                {game.discountRate > 0
                                    ? <div style={numStyle(cfg.color)}>-{game.discountRate}%</div>
                                    : <div style={numStyle()}>{fmt(game.currentPrice)}원</div>
                                }
                                {game.discountRate > 0 && (
                                    <div style={subStyle}>{fmt(game.currentPrice)}원</div>
                                )}
                                {game.isAllTimeLowNew && (
                                    <div style={{ fontSize: 12, fontWeight: 900, color: cfg.color, letterSpacing: '0.1em', marginTop: 2 }}>ALL TIME LOW</div>
                                )}
                                {!isBuy && game.lowestPrice > 0 && game.currentPrice > game.lowestPrice && (
                                    <div style={{ ...subStyle, color: '#f87171', marginTop: 2 }}>-{fmt(game.currentPrice - game.lowestPrice)}원 더 기다리면</div>
                                )}
                            </div>
                        );

                        // 평점 컬럼
                        if (hasScores) {
                            const scoreNum = mcScore ?? igdbScore;
                            const scoreLabel = mcScore ? 'METACRITIC' : 'IGDB';
                            cols.push(
                                <div key="score" style={{ ...colBase(0.1), ...colDivider }}>
                                    <div style={labelStyle}>{scoreLabel}</div>
                                    <div style={numStyle()}>{scoreNum}</div>
                                    {mcUser && <div style={subStyle}>유저 {mcUser.toFixed(1)}</div>}
                                </div>
                            );
                        }

                        // 플레이타임 컬럼
                        if (hltbMain) {
                            cols.push(
                                <div key="hltb" style={{ ...colBase(0.2) }}>
                                    <div style={labelStyle}>PLAY TIME</div>
                                    <div style={numStyle()}>{Math.round(hltbMain)}<span style={{ fontSize: 20, fontWeight: 700, marginLeft: 4, opacity: 0.7 }}>hr</span></div>
                                    {pricePerHr && <div style={{ ...subStyle, color: cfg.color }}>{fmt(pricePerHr)}원 / hr</div>}
                                </div>
                            );
                        }

                        // 평점·플레이타임 모두 없을 때 — 퍼블리셔 컬럼
                        if (!hasScores && !hltbMain && game.publisher) {
                            cols.push(
                                <div key="pub" style={{ ...colBase(0.1) }}>
                                    <div style={labelStyle}>PUBLISHER</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.25, textAlign: 'center' }}>{game.publisher}</div>
                                </div>
                            );
                        }

                        return (
                            <div style={{ display: 'flex', width: '100%', maxWidth: 700, alignItems: 'flex-start' }}>
                                {cols}
                            </div>
                        );
                    })()}

                </div>

                {/* ─────────── Scene 5: 아웃트로 ─────────── */}
                {showOutro && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', position: 'relative', zIndex: 2, padding: `28px ${HPAD}`, ...panelStyle(SCENE_OUTRO, elapsed) }}>
                        <RevealText active={IN.outroTitle} duration={0.8}>
                            <div style={{ fontSize: 66, fontWeight: 900, color: '#fff', letterSpacing: '0.02em', filter: 'drop-shadow(0 0 32px rgba(255,255,255,0.28))', textShadow: '0 2px 40px rgba(0,0,0,0.95)' }}>
                                ps-signal.com
                            </div>
                        </RevealText>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.16em', ...fadeIn(IN.outroSub, 0) }}>PS 가격 추적 서비스</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '8px 0', ...fadeIn(IN.outroIcons, 0) }}>
                            {[
                                { Icon: TrendingDown, text: '실시간 가격 추적' },
                                { Icon: Star,         text: '역대최저 달성 알림' },
                                { Icon: Bell,         text: '다음 세일 예상 알림' },
                            ].map(({ Icon, text }) => (
                                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 19, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                                    <Icon style={{ width: 22, height: 22, flexShrink: 0 }} />
                                    {text}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8, ...fadeIn(IN.outroCta, 0) }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 24, fontWeight: 900, color: '#fff' }}>
                                <Bell style={{ width: 24, height: 24 }} />
                                구독하면 다음 세일 알림 받아요
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.62)' }}>댓글로 보고 싶은 게임 알려주세요 👇</div>
                        </div>
                    </div>
                )}

            </div>{/* end right column */}

            {/* ════ 인트로 전체화면 오버레이 ════ */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, ...panelStyle(SCENES_BASE[0], elapsed) }}>
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: '-30px', backgroundImage: `url(${game.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(28px) brightness(0.3) saturate(1.5)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${cfg.glow}0.22) 0%, rgba(8,8,16,0.5) 60%)` }} />
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100%' }}>
                    {/* 인트로 커버 이미지 */}
                    <div style={{ width: '42%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '44px 24px 44px 60px' }}>
                        <div style={{
                            width: '100%', maxWidth: 340, aspectRatio: '3/4', borderRadius: 20, overflow: 'hidden',
                            boxShadow: `0 0 80px ${cfg.glow}0.48), 0 40px 80px rgba(0,0,0,0.75)`,
                            border: `2px solid ${cfg.glow}0.48)`,
                            transform: IN.introCover ? 'scale(1) translateX(0)' : 'scale(0.85) translateX(-32px)',
                            opacity:   IN.introCover ? 1 : 0,
                            transition: `opacity 1.1s ease, transform 1.1s ${EASE_OUT}`,
                        }}>
                            <PSGameImage src={game.imageUrl} alt={title} priority width={400} className="w-full h-full object-cover object-top" />
                        </div>
                    </div>
                    {/* 인트로 텍스트 */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '44px 60px 44px 32px', gap: 28 }}>
                        {/* 판정 아이콘 + 라벨 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                            <div style={{
                                transform: IN.introVerdict ? 'scale(1)' : 'scale(0.5)',
                                opacity:   IN.introVerdict ? 1 : 0,
                                transition: `transform 0.65s ${SPRING}, opacity 0.35s ease`,
                            }}>
                                {cfg.icon(108)}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>PRICE VERDICT</div>
                                <RevealText active={IN.introVerdict} delay={0.1} duration={0.65}>
                                    <div style={{ fontSize: 66, fontWeight: 900, color: cfg.color, lineHeight: 1, filter: `drop-shadow(0 0 26px ${cfg.glow}0.65))`}}>{cfg.label}</div>
                                </RevealText>
                            </div>
                        </div>
                        {/* 게임 타이틀 */}
                        <RevealText active={IN.introTitle} delay={0} duration={0.8}>
                            <h1 style={{
                                fontSize: 56, fontWeight: 900, color: '#fff', lineHeight: 1.15, wordBreak: 'keep-all',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                filter: 'drop-shadow(0 4px 28px rgba(0,0,0,0.98))', textShadow: '0 2px 32px rgba(0,0,0,0.95)',
                            }}>{title}</h1>
                        </RevealText>
                        {/* 퍼블리셔 / 장르 */}
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center', ...fadeIn(IN.introTitle, 0.1) }}>
                            {game.publisher && <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.52)', textShadow: '0 1px 8px rgba(0,0,0,0.95)' }}>{game.publisher}</span>}
                            {game.publisher && game.genres?.[0] && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.28)', flexShrink: 0 }} />}
                            {game.genres?.[0] && <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', textShadow: '0 1px 8px rgba(0,0,0,0.95)' }}>{game.genres[0]}</span>}
                        </div>
                        {/* 가격 */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
                            <RevealText active={IN.introPrice} delay={0} duration={0.7}>
                                <span style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1, filter: isBuy ? `drop-shadow(0 0 30px ${cfg.glow}0.48))` : 'none', textShadow: '0 2px 32px rgba(0,0,0,0.95)' }}>
                                    {fmt(game.currentPrice)}<span style={{ fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,0.32)', marginLeft: 8 }}>원</span>
                                </span>
                            </RevealText>
                            {game.discountRate > 0 && (
                                <RevealText active={IN.introPrice} delay={0.1} duration={0.65}>
                                    <span style={{ fontSize: 38, fontWeight: 900, color: cfg.color, filter: `drop-shadow(0 0 16px ${cfg.glow}0.75))` }}>-{game.discountRate}%</span>
                                </RevealText>
                            )}
                        </div>
                        {/* ATL 뱃지 (BUY_NOW) */}
                        {isBuy && game.isAllTimeLowNew && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 12, alignSelf: 'flex-start',
                                background: `${cfg.glow}0.15)`, border: `1px solid ${cfg.glow}0.58)`,
                                padding: '12px 26px', borderRadius: 14, boxShadow: `0 0 30px ${cfg.glow}0.3)`,
                                position: 'relative', overflow: 'hidden',
                                transform: IN.introPrice ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(14px)',
                                opacity:   IN.introPrice ? 1 : 0,
                                transition: `transform 0.6s 0.2s ${SPRING}, opacity 0.4s 0.2s ease`,
                            }}>
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)', animation: 'shimmer 2s infinite' }} />
                                <Flame style={{ width: 22, height: 22, color: cfg.color, position: 'relative' }} />
                                <span style={{ fontSize: 22, fontWeight: 900, color: cfg.color, position: 'relative' }}>역대최저가 갱신!</span>
                            </div>
                        )}
                        {/* WAIT 뱃지 — 역대최저까지 얼마나 남았는지 */}
                        {game.priceVerdict === 'WAIT' && game.lowestPrice > 0 && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 12, alignSelf: 'flex-start',
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.48)',
                                padding: '12px 26px', borderRadius: 14,
                                transform: IN.introPrice ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(14px)',
                                opacity:   IN.introPrice ? 1 : 0,
                                transition: `transform 0.6s 0.2s ${SPRING}, opacity 0.4s 0.2s ease`,
                            }}>
                                <TrendingDown style={{ width: 22, height: 22, color: '#f87171' }} />
                                <span style={{ fontSize: 20, fontWeight: 900, color: '#f87171' }}>
                                    {game.currentPrice > game.lowestPrice
                                        ? `역대최저까지 ${fmt(game.currentPrice - game.lowestPrice)}원 남음`
                                        : `역대최저 ${fmt(game.lowestPrice)}원 대기`}
                                </span>
                            </div>
                        )}
                        {/* TRACKING 뱃지 */}
                        {game.priceVerdict === 'TRACKING' && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 12, alignSelf: 'flex-start',
                                background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.48)',
                                padding: '12px 26px', borderRadius: 14,
                                transform: IN.introPrice ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(14px)',
                                opacity:   IN.introPrice ? 1 : 0,
                                transition: `transform 0.6s 0.2s ${SPRING}, opacity 0.4s 0.2s ease`,
                            }}>
                                <Square style={{ width: 22, height: 22, color: '#60a5fa', fill: 'rgba(59,130,246,0.2)' }} />
                                <span style={{ fontSize: 20, fontWeight: 900, color: '#60a5fa' }}>가격 추적 중 — 알림 설정하기</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
