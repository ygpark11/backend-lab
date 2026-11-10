// 도형 마스크 전환 + 씬 카메라 (순수 함수)
// PS 심볼과 혼동되지 않도록 일반 도형(원·마름모·육각형)만 쓰고, 외곽선은 무대 강조색을 쓴다
import { STAGE_H, STAGE_W, clamp, ease, lerp } from './engine';

// ── PS 심볼 마스크 전환 ────────────────────────────────────────────────
// 들어오는 씬을 심볼 모양으로 잘라 키워서 화면을 덮는다. 테두리에는 컨트롤러 색 외곽선.
export const WIPE_SHAPES = ['circle', 'diamond', 'hexagon'];
export const CX = STAGE_W / 2;
export const CY = STAGE_H / 2;

export function polygonPoints(shape, e) {
    const rot = (1 - e) * 60 * (Math.PI / 180);
    const corners = shape === 'diamond' ? [0, 90, 180, 270] : [0, 60, 120, 180, 240, 300];
    // 내접원이 화면 대각선 절반(약 1101px)보다 커야 화면을 다 덮는다
    const r = (shape === 'diamond' ? 1600 : 1300) * e;
    return corners.map((deg) => {
        const ang = (deg * Math.PI) / 180 + rot;
        return [CX + Math.cos(ang) * r, CY + Math.sin(ang) * r];
    });
}

/** 진행률 wipe(0~1) → 들어오는 씬에 걸 clip-path */
export function wipeClip(shape, wipe) {
    const e = ease.inOutCubic(clamp(wipe));
    if (shape === 'circle') return `circle(${1160 * e}px at ${CX}px ${CY}px)`;
    return `polygon(${polygonPoints(shape, e).map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;
}

/** 씬 카메라: 씬 길이 동안 천천히 밀고 들어가며(push-in), 임팩트 흔들림을 더한다 */
export function cameraTransform(lt, duration, shakeOffset = { x: 0, y: 0 }) {
    const push = lerp(1, 1.035, ease.inOutSine(clamp(lt / duration)));
    return `translate(${shakeOffset.x}px, ${shakeOffset.y}px) scale(${push})`;
}
