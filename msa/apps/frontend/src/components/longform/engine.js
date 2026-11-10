// 롱폼 모션그래픽 엔진 — 모든 연출은 시간 t(초)의 순수 함수로 계산한다.
// CSS transition/animation을 쓰지 않으므로 프레임 단위 렌더링(seek)에서도 결과가 항상 동일하다.

export const STAGE_W = 1920;
export const STAGE_H = 1080;

// 씬 경계 전환(PS 심볼 마스크 와이프) 길이. 경계 기준 앞뒤로 절반씩 걸친다.
export const TRANSITION = 0.8;

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, p) => a + (b - a) * p;

/** start부터 dur 동안 0→1로 진행하는 값 (구간 밖은 0 또는 1로 고정) */
export const prog = (t, start, dur) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur));

export const ease = {
    linear: (p) => p,
    inCubic: (p) => p * p * p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
    // 감쇠 진동 스프링 — 1을 살짝 넘었다가 안착
    spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(9.5 * p)),
};

/** start부터 dur 동안 easing이 적용된 0→1 */
export const anim = (t, start, dur, fn = ease.outCubic) => fn(prog(t, start, dur));

/** 결정적 의사난수 (같은 seed → 같은 수열) */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let r = Math.imul(a ^ (a >>> 15), 1 | a);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function hash1(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

/** 부드러운 1차원 노이즈 (-1~1). 카메라 흔들림·부유 모션용 */
export function noise1(x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}

/** 임팩트 시점 이후 감쇠하는 흔들림 오프셋 {x, y} */
export function shake(t, at, { duration = 0.45, amp = 14, freq = 38 } = {}) {
    const p = (t - at) / duration;
    if (p < 0 || p > 1) return { x: 0, y: 0 };
    const decay = Math.pow(1 - p, 2.2) * amp;
    return { x: noise1((t - at) * freq) * decay, y: noise1((t - at) * freq + 91.7) * decay };
}

/** '#rrggbb' 두 색을 p 비율로 섞는다 */
export function mixHex(a, b, p) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, clamp(p)));
    return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/** '#rrggbb' + alpha → 'rgba()' */
export function alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── 씬 타임라인 ─────────────────────────────────────────────────────────
// 씬 길이는 파이프라인이 내레이션(TTS) 길이에 맞춰 ?durations= 로 넘긴다. 없으면 기본값.
// minDuration은 핵심 연출이 끝까지 보이기 위한 최소 길이 (이보다 짧게 요청되면 늘린다).
export const SCENE_DEFS = {
    opening: { label: '오프닝', defaultDuration: 12, minDuration: 8 },
    intro:   { label: '인트로', defaultDuration: 6,  minDuration: 4.5 },
    price:   { label: '가격',   defaultDuration: 11, minDuration: 7 },
    defense: { label: '방어력', defaultDuration: 9,  minDuration: 6 },
    quality: { label: '품질',   defaultDuration: 10, minDuration: 6 },
    edition: { label: '에디션', defaultDuration: 8,  minDuration: 5.5 },
    verdict: { label: '판정',   defaultDuration: 8,  minDuration: 6 },
    outro:   { label: '아웃트로', defaultDuration: 8, minDuration: 6 },
};

/** "intro:6.2,price:11.4" → { intro: 6.2, price: 11.4 } */
export function parseDurations(str) {
    const out = {};
    if (!str) return out;
    for (const part of str.split(',')) {
        const [id, sec] = part.split(':').map((s) => s.trim());
        const n = Number(sec);
        if (SCENE_DEFS[id] && Number.isFinite(n) && n > 0) out[id] = n;
    }
    return out;
}

/** 씬 id 목록 + 길이 지정 → [{ id, label, start, end, duration }] */
export function buildTimeline(ids, overrides = {}) {
    let cursor = 0;
    const scenes = ids.map((id) => {
        const def = SCENE_DEFS[id];
        const duration = Math.max(def.minDuration, overrides[id] ?? def.defaultDuration);
        const scene = { id, label: def.label, start: cursor, end: cursor + duration, duration };
        cursor += duration;
        return scene;
    });
    return { scenes, total: cursor };
}

/**
 * 시각 t에 그려야 할 씬들. 경계 전후 TRANSITION/2 구간에서는 나가는 씬(아래)과
 * 들어오는 씬(위, 마스크 와이프 진행률 wipe)을 함께 돌려준다.
 */
export function visibleScenes(scenes, t) {
    const half = TRANSITION / 2;
    const out = [];
    scenes.forEach((s, i) => {
        const next = scenes[i + 1];
        const prev = scenes[i - 1];
        const from = prev ? s.start - half : -Infinity;
        const to = next ? s.end + half : Infinity;
        if (t < from || t >= to) return;
        const wipe = prev && t < s.start + half ? prog(t, s.start - half, TRANSITION) : null;
        out.push({ scene: s, index: i, lt: t - s.start, wipe });
    });
    return out;
}
