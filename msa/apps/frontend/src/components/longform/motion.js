// 시간 t 기반 모션 헬퍼 (스타일 객체/값을 돌려주는 순수 함수)
import { anim, clamp, ease, lerp } from './engine';

/** 숫자 카운트업 값 */
export function countUp(value, t, start, dur = 1.2, decimals = 0) {
    const v = lerp(0, value, anim(t, start, dur, ease.outCubic));
    return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('ko-KR');
}

/** 위로 떠오르며 등장하는 블록 스타일 */
export function riseIn(t, start, dur = 0.7, dist = 28) {
    const p = anim(t, start, dur, ease.outExpo);
    return { opacity: clamp(p * 1.6), transform: `translateY(${(1 - p) * dist}px)` };
}

/** 오른쪽/왼쪽에서 미끄러져 등장 */
export function slideIn(t, start, dur = 0.7, dist = 60) {
    const p = anim(t, start, dur, ease.outExpo);
    return { opacity: clamp(p * 1.6), transform: `translateX(${(1 - p) * dist}px)` };
}
