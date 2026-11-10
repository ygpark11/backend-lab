// YouTube 롱폼 촬영 전용 16:9 모션그래픽 카드 — /games/:id?view=longform
//
// URL 파라미터
//   final=true                  마지막 게임: 아웃트로 포함
//   durations=intro:6,price:11  씬별 길이(초). 내레이션 길이에 맞춰 파이프라인이 지정 (없으면 기본값)
//   index=3&count=7             "GAME 03 / 07" 표시 (선택)
//   render=1                    프레임 단위 렌더 모드 — window.__LF.seek(t)로만 시간이 흐름
//   t=12.5                      미리보기에서 특정 시각 고정 (디버그)
// 파이프라인 계약은 shorts-automation/docs/LONGFORM_RENDER_CONTRACT.md 참고
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { STAGE_H, STAGE_W, TRANSITION, anim, buildTimeline, mixHex, parseDurations, shake, visibleScenes } from './engine';
import { NEUTRAL_ACCENT, buildCues, buildModel, sceneFacts } from './gameModel';
import { FONT_FAMILY, LF_CONTRACT_VERSION, useLongformRuntime, useStageScale } from './runtime';
import { Grain } from './primitives';
import { Backdrop, BrandBug, LowerThird, ProgressHud, Vignette, WipeOutline } from './chrome';
import { WIPE_SHAPES, cameraTransform, wipeClip } from './transitions';
import IntroScene from './scenes/IntroScene';
import PriceScene from './scenes/PriceScene';
import DefenseScene from './scenes/DefenseScene';
import QualityScene from './scenes/QualityScene';
import EditionScene from './scenes/EditionScene';
import VerdictScene, { VERDICT_LAND } from './scenes/VerdictScene';
import OutroScene from './scenes/OutroScene';

const SCENE_COMPONENTS = {
    intro: IntroScene,
    price: PriceScene,
    defense: DefenseScene,
    quality: QualityScene,
    edition: EditionScene,
    verdict: VerdictScene,
    outro: OutroScene,
};

// 씬별 임팩트(카메라 흔들림) 시점 — 씬 로컬 시간 기준
const IMPACTS = {
    intro: [{ at: 1.15, amp: 10 }],
    price: [{ at: 2.4, amp: 16 }],
    verdict: [{ at: VERDICT_LAND, amp: 24, duration: 0.6 }],
};

function sceneShake(id, lt) {
    return (IMPACTS[id] ?? []).reduce((acc, imp) => {
        const s = shake(lt, imp.at, { amp: imp.amp, duration: imp.duration });
        return { x: acc.x + s.x, y: acc.y + s.y };
    }, { x: 0, y: 0 });
}

export default function GameLongformCard({ game, showOutro = false }) {
    const { search } = useLocation();
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const renderMode = params.get('render') === '1';
    const freezeAt = params.has('t') ? Number(params.get('t')) : null;
    const durationsParam = params.get('durations');
    const index = Number(params.get('index')) || null;
    const count = Number(params.get('count')) || null;

    // 렌더 기준 시각은 한 번만 고정 (프레임마다 D-day 등이 바뀌지 않도록)
    const now = useMemo(() => new Date(), []);
    const model = useMemo(
        () => buildModel(game, { now, final: showOutro, index, count }),
        [game, now, showOutro, index, count],
    );
    const timeline = useMemo(
        () => buildTimeline(model.sceneIds, parseDurations(durationsParam)),
        [model.sceneIds, durationsParam],
    );
    const manifest = useMemo(() => ({
        version: LF_CONTRACT_VERSION,
        gameId: model.gameId,
        title: model.meta.title,
        verdict: model.verdict.key,
        width: STAGE_W,
        height: STAGE_H,
        total: timeline.total,
        transition: TRANSITION,
        scenes: timeline.scenes.map((s) => ({
            id: s.id, label: s.label, start: s.start, end: s.end, duration: s.duration, facts: sceneFacts(model, s.id),
        })),
        cues: buildCues(model, timeline.scenes),
    }), [model, timeline]);

    const { t } = useLongformRuntime({ manifest, total: timeline.total, imageUrls: [game.imageUrl], renderMode, freezeAt });
    const scale = useStageScale(STAGE_W, STAGE_H);

    // 판정 착지 순간부터 무대 전체 강조색이 판정 색으로 물든다
    const verdictScene = timeline.scenes.find((s) => s.id === 'verdict');
    const accent = verdictScene
        ? mixHex(NEUTRAL_ACCENT, model.verdict.color, anim(t, verdictScene.start + VERDICT_LAND, 0.8))
        : model.verdict.color;

    const visible = visibleScenes(timeline.scenes, t);

    // 상위 페이지 래퍼의 transform 때문에 fixed 기준이 어긋나지 않도록 body에 직접 렌더링한다
    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{
                position: 'relative', width: STAGE_W, height: STAGE_H, flexShrink: 0, overflow: 'hidden',
                transform: `scale(${scale})`, fontFamily: FONT_FAMILY, color: '#fff', userSelect: 'none',
                WebkitFontSmoothing: 'antialiased',
            }}>
                <Backdrop t={t} imageUrl={model.meta.imageUrl} accent={accent} />

                {visible.map(({ scene, index: i, lt, wipe }) => {
                    const Scene = SCENE_COMPONENTS[scene.id];
                    const shape = WIPE_SHAPES[(i - 1 + WIPE_SHAPES.length) % WIPE_SHAPES.length];
                    const wiping = wipe != null;
                    return (
                        <div key={scene.id} style={{ position: 'absolute', inset: 0, clipPath: wiping ? wipeClip(shape, wipe) : undefined }}>
                            {/* 와이프 중에는 들어오는 씬 아래에 같은 배경을 깔아 나가는 씬이 비치지 않게 한다 */}
                            {wiping && <Backdrop t={t} imageUrl={model.meta.imageUrl} accent={accent} />}
                            <div style={{ position: 'absolute', inset: 0, transform: cameraTransform(lt, scene.duration, sceneShake(scene.id, lt)) }}>
                                <Scene lt={lt} dur={scene.duration} model={model} accent={accent} nowMs={model.nowMs} />
                            </div>
                        </div>
                    );
                })}
                {visible.filter((v) => v.wipe != null).map((v) => (
                    <WipeOutline key={`wipe-${v.scene.id}`} shape={WIPE_SHAPES[(v.index - 1 + WIPE_SHAPES.length) % WIPE_SHAPES.length]} wipe={v.wipe} color={accent} />
                ))}

                <ProgressHud t={t} scenes={timeline.scenes} accent={accent} meta={model.meta} />
                <LowerThird t={t} scenes={timeline.scenes} meta={model.meta} accent={accent} />
                <BrandBug t={t} scenes={timeline.scenes} />
                <Vignette />
                <Grain t={t} />
            </div>
        </div>,
        document.body,
    );
}
