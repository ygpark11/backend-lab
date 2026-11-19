// YouTube Shorts 2.0 모션그래픽 — /games/:id?view=shorts-v2&ids=442,671,1744&render=1&durations=g1:8.6,g2:8.0,g3:8.8
//
// 1080x1920 세로 풀스크린 결정적(pure t) 타임라인 엔진:
// - 0.00초 첫 프레임부터 1번 게임 커버·선명한 최종 할인가·할인율·역대최저가·핵심 요약이 즉시 노출
// - Phase 2: 포스터 좌상단 도킹 + 옆에 최대 크기 가격 재착지 + 평점·플레이타임 한 줄 3칸
// - Phase 3: 가격 신호등 슬롯 릴 판정 + 하단/우측 세이프존(y <= 1356, x <= 890) 엄수
// - 0~1.5초: 첫 프레임(쇼츠 탭 썸네일)에 "마감일 · TOP 3" 훅 문구
// - 마지막 게임 판정 착지 뒤 ps-signal.com 표기 (아웃트로는 durations에 outro:N을 넘길 때만)
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import client from '../../api/client';
import { alpha, anim, clamp, ease, lerp, prog, shake } from '../longform/engine';
import { BRAND_NAME, NEUTRAL_ACCENT, SALE_RED, buildModel, fmt } from '../longform/gameModel';
import { FONT_FAMILY, LF_CONTRACT_VERSION, posterSrc, useLongformRuntime, useStageScale } from '../longform/runtime';
import { Grain, SignalMark } from '../longform/primitives';
import { Backdrop, Vignette } from '../longform/chrome';
import { riseIn } from '../longform/motion';
import { StatsRow, VerdictReelBanner } from './ShortsCharts';

export const SHORTS_W = 1080;
export const SHORTS_H = 1920;

const WIPE_DUR = 0.34;
const DEFAULT_SLOT_DUR = 8.4;
// 아웃트로는 durations에 outro:N을 넘길 때만 붙는다 (기본 없음 — 쇼츠 반복 재생과 시청 비율 우선)
const MIN_SLOT_DUR = 6.5;

// 슬롯 내부 박자 (초). 쇼츠는 1.5~2초마다 화면에 새 사건이 있어야 스와이프를 막는다
//   0.0 히어로(포스터·할인율·가격) → 1.95 도킹 → 2.35 가격 재착지 → 2.65 평점·시간 → 3.1~3.6 판정 착지
const DOCK_AT = 1.95;
const DOCK_DUR = 0.5;
const PRICE_LAND_AT = 2.35;
const STATS_AT = 2.65;
const SPIN_DUR = 0.48;

/** 판정은 슬롯 길이와 무관하게 3.1~3.6초에 시작하고, 착지 후 최소 2.4초는 화면에 머문다 */
function slotTiming(duration, isFirst) {
    const verdictAt = clamp(duration - 2.9, 3.1, 3.6);
    return { impactAt: isFirst ? 0.14 : 0.32, atlAt: isFirst ? 0.32 : 0.55, verdictAt, landAt: verdictAt + SPIN_DUR };
}

function parseSlotDurations(str, count) {
    const slots = Array(count).fill(DEFAULT_SLOT_DUR);
    let outroDur = 0;
    if (!str) return { slots, outroDur };
    for (const part of str.split(',')) {
        const [k, v] = part.split(':').map((s) => s.trim());
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) continue;
        if (k?.toLowerCase() === 'outro') {
            outroDur = Math.max(1.8, n);
            continue;
        }
        const m = k?.match(/^g(\d+)$/i);
        if (m) {
            const idx = Number(m[1]) - 1;
            if (idx >= 0 && idx < count) slots[idx] = Math.max(MIN_SLOT_DUR, n);
        }
    }
    return { slots, outroDur };
}

function buildShortsFacts(model) {
    const { meta, price, defense, quality, verdict } = model;
    return {
        title: meta.title,
        genre: meta.genre,
        inCatalog: meta.inCatalog,
        isPs5ProEnhanced: meta.isPs5ProEnhanced,
        isPlusExclusive: meta.isPlusExclusive,
        currentPrice: price.current,
        originalPrice: price.original,
        discountRate: price.rate,
        savings: price.savings,
        lowestPrice: price.lowest,
        allTimeLow: price.atl,
        saleEndDate: price.saleEndDate,
        metaScore: quality?.meta ?? null,
        userScore: quality?.user ?? null,
        playtimeMain: quality?.main ?? null,
        pricePerHour: quality?.perHour ?? null,
        tier: defense?.tierText ?? null,
        discountCount: defense?.discountCount ?? null,
        verdict: verdict.key,
        verdictLabel: verdict.label,
    };
}

function buildShortsManifest(models, durationsParam) {
    const { slots, outroDur } = parseSlotDurations(durationsParam, models.length);
    let cursor = 0;
    const gameScenes = models.map((model, i) => {
        const duration = slots[i];
        const scene = {
            id: `g${i + 1}`,
            label: `${i + 1}번 게임`,
            gameId: model.gameId,
            start: Math.round(cursor * 1000) / 1000,
            end: Math.round((cursor + duration) * 1000) / 1000,
            duration,
            facts: buildShortsFacts(model),
        };
        cursor += duration;
        return scene;
    });

    const outroScene = outroDur > 0 ? {
        id: 'outro',
        label: '아웃트로',
        start: Math.round(cursor * 1000) / 1000,
        end: Math.round((cursor + outroDur) * 1000) / 1000,
        duration: outroDur,
    } : null;
    cursor += outroDur;
    const scenes = outroScene ? [...gameScenes, outroScene] : gameScenes;

    const cues = [];
    const at = (scene, offset, type, extra = {}) => {
        const tVal = Math.max(0, Math.round((scene.start + offset) * 1000) / 1000);
        cues.push({ t: tVal, type, scene: scene.id, ...extra });
    };

    gameScenes.forEach((s, i) => {
        const m = models[i];
        const { impactAt, atlAt, landAt } = slotTiming(s.duration, i === 0);

        if (m.price.rate > 0) at(s, impactAt, 'impact');
        if (m.price.atl === 'new' || m.price.atl === 'equal') at(s, atlAt, 'chime');
        at(s, DOCK_AT - 0.08, 'whoosh');
        if (m.quality?.meta || m.quality?.user || m.quality?.main) at(s, STATS_AT, 'tick', { duration: 0.6 });
        at(s, landAt, 'impactBig');
        if (i < gameScenes.length - 1 || outroScene) at(s, s.duration - WIPE_DUR + 0.04, 'whoosh');
    });

    if (outroScene) at(outroScene, 0.82, 'click');

    return {
        version: LF_CONTRACT_VERSION,
        kind: 'shorts-v2',
        width: SHORTS_W,
        height: SHORTS_H,
        total: Math.round(cursor * 1000) / 1000,
        transition: WIPE_DUR,
        scenes,
        cues,
    };
}

function titleFontSize(title) {
    const len = title.length;
    if (len <= 14) return 64;
    if (len <= 22) return 56;
    if (len <= 32) return 48;
    return 42;
}

function priceFontSize(priceText) {
    const len = priceText.length;
    if (len <= 6) return 132;
    if (len <= 7) return 118;
    return 100;
}

/** 판정 사유를 쇼츠용 한 구절로 줄인다 (전체 문장은 폰에서 읽히지 않는다) */
function shortVerdictReason(model) {
    const { verdict, price } = model;
    const gap = price.lowest > 0 ? price.current - price.lowest : 0;
    if (verdict.key === 'BUY_NOW') return price.atl === 'new' ? '지금이 역대 최저가' : '역대 최저가와 같은 가격';
    if (verdict.key === 'GOOD_OFFER') return gap > 0 ? `역대 최저보다 ${fmt(gap)}원 비쌈` : '합리적인 가격';
    if (verdict.key === 'WAIT') return gap > 0 ? `역대 최저는 ${fmt(price.lowest)}원` : '지금은 살 때가 아님';
    return '가격 데이터 수집 중';
}

/** 쇼츠 화면에서는 의미 없는 "Standard Edition" 꼬리를 뗀다 (가격이 다른 상위 에디션 이름은 유지) */
function displayTitle(title) {
    return title.replace(/\s*[-:]?\s*(Standard|스탠다드|스탠더드)\s*(Edition|에디션)\s*$/i, '').trim() || title;
}

/** 구매 판단에 영향을 주는 혜택만 배지로 (PS5 Pro·플랫폼·장르는 쇼츠에서 소음) */
function BenefitBadges({ meta, size = 26 }) {
    const tags = [
        meta.isPlusExclusive && { text: 'PLUS 할인', color: '#facc15' },
        meta.inCatalog && { text: 'PS+ 카탈로그', color: '#38bdf8' },
    ].filter(Boolean);
    return tags.map((tg) => (
        <span key={tg.text} style={{
            padding: '5px 14px', borderRadius: 10, fontSize: size, fontWeight: 900, lineHeight: 1.2,
            color: tg.color, background: alpha(tg.color, 0.16), border: `1.5px solid ${alpha(tg.color, 0.5)}`,
            whiteSpace: 'nowrap',
        }}>
            {tg.text}
        </span>
    ));
}

function AtlBadge({ atl, size = 30 }) {
    if (atl !== 'new' && atl !== 'equal') return null;
    const isNew = atl === 'new';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 12,
            background: isNew ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            border: '1.5px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: size, fontWeight: 900, whiteSpace: 'nowrap',
            boxShadow: '0 10px 26px rgba(0,0,0,0.45)',
        }}>
            {isNew ? <Flame size={size} strokeWidth={2.5} /> : <TrendingUp size={size} strokeWidth={2.5} />}
            {isNew ? '역대 최저가 갱신' : '역대 최저가 동률'}
        </span>
    );
}

const HOOK_HOLD = 1.5;

/**
 * 첫 프레임 훅: "11/30 마감 / 역대 최저가 TOP 3" — 0프레임부터 완성된 상태로 보인다.
 * 쇼츠 탭 목록(폰 폭의 약 1/3 칸)에서도 읽히도록 크게 걸었다가 HUD 자리로 빨려 들어간다
 */
function HookBanner({ t, date, title, out }) {
    const pop = lerp(1.05, 1, anim(t, 0, 0.22, ease.outBack));
    return (
        <div style={{
            position: 'absolute', top: 100, left: 64, right: 64, zIndex: 45, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            transformOrigin: 'left top',
            transform: `translateY(${out * -30}px) scale(${pop * lerp(1, 0.45, out)})`,
            opacity: 1 - out,
        }}>
            <span style={{
                padding: '6px 22px', borderRadius: 14, background: SALE_RED, color: '#fff',
                fontSize: 52, fontWeight: 900, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                boxShadow: `0 10px 30px ${alpha(SALE_RED, 0.55)}`,
            }}>
                {date}
            </span>
            <span style={{
                fontSize: 96, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', color: '#fff', whiteSpace: 'nowrap',
                textShadow: '0 8px 30px rgba(0,0,0,0.85)',
            }}>
                {title}
            </span>
        </div>
    );
}

function TopHud({ t, gameScenes, activeIdx, endLabel, opacity = 1 }) {
    if (opacity <= 0.01) return null;
    return (
        <div style={{
            position: 'absolute', top: 114, left: 64, right: 64, zIndex: 40,
            display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none',
            opacity,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <SignalMark height={24} />
                    <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.88)' }}>
                        {BRAND_NAME.toUpperCase()}
                    </span>
                    <span style={{
                        padding: '5px 16px', borderRadius: 999, fontSize: 23, fontWeight: 900, color: SALE_RED,
                        background: alpha(SALE_RED, 0.16), border: `1.5px solid ${alpha(SALE_RED, 0.55)}`,
                    }}>
                        {endLabel}
                    </span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: '#fff' }}>{String(activeIdx + 1).padStart(2, '0')}</span> / {String(gameScenes.length).padStart(2, '0')}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
                {gameScenes.map((s) => {
                    const fill = prog(t, s.start, s.duration);
                    return (
                        <div key={s.id} style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${fill * 100}%`,
                                background: NEUTRAL_ACCENT, boxShadow: `0 0 12px ${NEUTRAL_ACCENT}`,
                            }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 화면 배치 (1080x1920). 하단 영역(y > 1356)과 우측 액션 버튼 열(x > 890, 화면 중하단)은 비운다
const DOCK = { x: 64, y: 214, w: 340, h: 454 };
const DOCK_COL_X = DOCK.x + DOCK.w + 32;
const STATS_Y = 708;
const VERDICT_Y = 980;

function GameSlot({ model, lt, duration, isFirst, isLast = false, hasHook = false, slideY = 0, exitScale = 1, exitDim = 0, blur = 0 }) {
    const { meta, price, quality, verdict } = model;
    const { impactAt, verdictAt, landAt } = slotTiming(duration, isFirst);

    const dockP = anim(lt, DOCK_AT, DOCK_DUR, ease.inOutCubic);
    const activeAccent = lt >= landAt ? verdict.color : NEUTRAL_ACCENT;
    const sh1 = shake(lt, impactAt, { duration: 0.3, amp: 9, freq: 42 });
    const sh2 = shake(lt, landAt, { duration: 0.32, amp: 11, freq: 40 });

    // Phase 1 히어로: 0프레임부터 선명한 할인가 + 스케일 팝
    const heroScale = isFirst ? lerp(1.04, 1, anim(lt, 0, 0.22, ease.outQuart)) : 1;
    const pricePop = isFirst
        ? lerp(1.1, 1, anim(lt, 0, 0.24, ease.outBack))
        : lerp(1.18, 1, anim(lt, 0.08, 0.28, ease.outBack));
    const bob = Math.sin(lt * 2.2) * 5 * (1 - dockP);

    const posterW = lerp(470, DOCK.w, dockP);
    const posterH = lerp(626, DOCK.h, dockP);
    const posterX = lerp(242, DOCK.x, dockP);
    const posterY = lerp(348, DOCK.y, dockP) + bob;
    const posterRot = lerp(-1.5, 0, dockP);
    // 도킹 후 포스터를 아주 천천히 확대해 정지 화면 느낌을 없앤다 (Ken Burns)
    const kenBurns = 1 + 0.07 * prog(lt, DOCK_AT + DOCK_DUR, Math.max(1, duration - DOCK_AT - DOCK_DUR));

    const discountPop = isFirst ? anim(lt, 0, 0.22, ease.outBack) : anim(lt, 0.12, 0.28, ease.outBack);
    const discountScale = lerp(isFirst ? 1.16 : 1.65, 1, discountPop);
    const atlScale = isFirst ? lerp(1.1, 1, anim(lt, 0, 0.25, ease.outBack)) : anim(lt, 0.25, 0.32, ease.outBack);
    const atlOpacity = isFirst ? 1 : clamp(atlScale * 2);
    const strikeP = isFirst ? 1 : anim(lt, 0.08, 0.34, ease.outExpo);
    const sweep = ((lt - 0.35) % 2.4) / 0.9;

    // Phase 2: 히어로 가격이 줄어들며 사라지고, 같은 가격이 포스터 옆에 다시 꽂힌다
    // 히어로 가격은 도킹 가격이 착지하는 순간까지 남겨 가격이 화면에서 끊기지 않게 한다
    const heroExit = anim(lt, PRICE_LAND_AT - 0.2, 0.32, ease.inOutCubic);
    const dockPriceP = anim(lt, PRICE_LAND_AT, 0.38, ease.outBack);
    const dockColP = anim(lt, DOCK_AT + 0.28, 0.4, ease.outExpo);
    const chipsP = anim(lt, PRICE_LAND_AT + 0.14, 0.34, ease.outBack);
    const flash = lt >= landAt ? Math.pow(1 - prog(lt, landAt, 0.4), 2) : 0;

    const title = displayTitle(meta.title);
    const priceText = fmt(price.current);
    const heroPriceFont = priceFontSize(priceText);
    const tSize = titleFontSize(title);
    const dockTitleSize = title.length <= 18 ? 48 : 42;

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            transform: `translateY(${slideY}px) scale(${exitScale})`,
            transformOrigin: 'center center',
            filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
        }}>
            <Backdrop t={lt} imageUrl={meta.imageUrl} accent={activeAccent} width={SHORTS_W} height={SHORTS_H} />

            {slideY > 1 && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 10,
                    background: NEUTRAL_ACCENT, boxShadow: `0 0 40px ${NEUTRAL_ACCENT}`,
                }} />
            )}

            <div style={{ position: 'absolute', inset: 0, transform: `translate(${sh1.x + sh2.x}px, ${sh1.y + sh2.y}px) scale(${heroScale})` }}>
                {/* Phase 1 상단 타이틀 (첫 게임은 이 자리를 훅 문구가 쓰고, 제목은 도킹 컬럼에서 나온다) */}
                {!hasHook && <div style={{
                    position: 'absolute', left: 64, right: 64, top: 206,
                    opacity: 1 - clamp(dockP * 1.8),
                    transform: `translateY(${dockP * -28}px)`,
                }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <BenefitBadges meta={meta} />
                    </div>
                    <div style={{
                        fontSize: tSize, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.02em', color: '#fff',
                        textShadow: '0 8px 34px rgba(0,0,0,0.75)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {title}
                    </div>
                </div>}

                {/* 포스터 카드 (Phase 1 대형 → Phase 2 좌상단 연속 모핑) */}
                <div style={{
                    position: 'absolute', left: posterX, top: posterY, width: posterW, height: posterH,
                    transform: `rotate(${posterRot}deg)`, transformOrigin: 'center center',
                }}>
                    <div style={{
                        position: 'relative', width: '100%', height: '100%', borderRadius: lerp(28, 22, dockP), overflow: 'hidden',
                        boxShadow: `0 30px 90px rgba(0,0,0,0.8), 0 0 ${lerp(130, 70, dockP)}px ${alpha(activeAccent, 0.45)}`,
                        border: `2px solid ${lt >= landAt ? alpha(verdict.color, 0.7) : 'rgba(255,255,255,0.22)'}`, background: '#11131c',
                    }}>
                        {meta.imageUrl && (
                            <img src={posterSrc(meta.imageUrl)} alt="" style={{
                                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
                                transform: `scale(${kenBurns})`, transformOrigin: 'center 30%',
                            }} />
                        )}
                        {sweep > 0 && sweep < 1 && dockP < 0.5 && (
                            <div style={{
                                position: 'absolute', top: -60, bottom: -60, width: 140, left: `${lerp(-50, 140, sweep)}%`,
                                transform: 'skewX(-18deg)',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)',
                            }} />
                        )}
                    </div>

                    {/* 역대 최저가 배지 (t=0.00부터 즉시 노출) */}
                    {(price.atl === 'new' || price.atl === 'equal') && dockP < 0.7 && (
                        <div style={{
                            position: 'absolute', left: -24, top: 24,
                            transform: `scale(${atlScale})`, transformOrigin: 'left center', opacity: atlOpacity * (1 - dockP),
                        }}>
                            <AtlBadge atl={price.atl} size={30} />
                        </div>
                    )}

                    {/* -85% 할인 스탬프 */}
                    {price.rate > 0 && dockP < 0.7 && (
                        <div style={{
                            position: 'absolute', right: -34, bottom: 24,
                            padding: '10px 28px', borderRadius: 22, background: SALE_RED, color: '#fff',
                            fontSize: 84, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08,
                            boxShadow: `0 16px 46px ${alpha(SALE_RED, 0.65)}`,
                            transform: `rotate(4deg) scale(${discountScale})`,
                            opacity: (isFirst ? 1 : clamp(discountPop * 2)) * (1 - dockP),
                        }}>
                            -{price.rate}%
                        </div>
                    )}
                </div>

                {/* Phase 1 대형 가격 — 도킹 때 제자리에서 줄어들며 사라지고, 포스터 옆에 다시 꽂힌다 */}
                {heroExit < 1 && (
                    <div style={{
                        position: 'absolute', left: 64, right: 190, top: 1004,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                        opacity: 1 - clamp(heroExit * 1.4),
                        transform: `translateY(${heroExit * -90}px) scale(${lerp(1, 0.82, heroExit)})`,
                    }}>
                        {price.original && (
                            <div style={{ fontSize: 46, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                                정가{' '}
                                <span style={{ position: 'relative', display: 'inline-block' }}>
                                    {fmt(price.original)}원
                                    <span style={{
                                        position: 'absolute', left: -4, top: '52%', height: 5, borderRadius: 3, background: SALE_RED,
                                        width: `${strikeP * 104}%`,
                                    }} />
                                </span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: 10, lineHeight: 1,
                            transform: `scale(${pricePop})`,
                            filter: `drop-shadow(0 0 28px ${alpha(SALE_RED, 0.35)}) drop-shadow(0 10px 24px rgba(0,0,0,0.75))`,
                        }}>
                            <span style={{ fontSize: heroPriceFont, fontWeight: 900, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                                {priceText}
                            </span>
                            <span style={{ fontSize: Math.round(heroPriceFont * 0.42), fontWeight: 900 }}>원</span>
                        </div>
                    </div>
                )}

                {/* Phase 2 도킹 컬럼: 제목 → 가격(최대 크기) → 할인율·역대최저·혜택 */}
                {(dockColP > 0 || dockPriceP > 0) && (
                    <div style={{
                        position: 'absolute', left: DOCK_COL_X, right: 64, top: DOCK.y, height: DOCK.h,
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
                    }}>
                        <div style={{
                            fontSize: dockTitleSize, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.02em', color: '#fff',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            opacity: clamp(dockColP * 1.6), transform: `translateX(${(1 - dockColP) * 40}px)`,
                        }}>
                            {title}
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'baseline', gap: 6, lineHeight: 1, transformOrigin: 'left center',
                            opacity: clamp(dockPriceP * 2.2), transform: `scale(${lerp(1.45, 1, dockPriceP)})`,
                            filter: `drop-shadow(0 0 26px ${alpha(SALE_RED, 0.3)}) drop-shadow(0 10px 22px rgba(0,0,0,0.7))`,
                        }}>
                            <span style={{ fontSize: 104, fontWeight: 900, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>{priceText}</span>
                            <span style={{ fontSize: 44, fontWeight: 900 }}>원</span>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                            opacity: clamp(chipsP * 2), transform: `translateY(${(1 - clamp(chipsP)) * 18}px)`,
                        }}>
                            {price.rate > 0 && (
                                <span style={{
                                    padding: '4px 16px', borderRadius: 12, background: SALE_RED, color: '#fff',
                                    fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15,
                                    boxShadow: `0 10px 26px ${alpha(SALE_RED, 0.5)}`,
                                }}>
                                    -{price.rate}%
                                </span>
                            )}
                            <AtlBadge atl={price.atl} size={28} />
                            <BenefitBadges meta={meta} size={24} />
                        </div>
                    </div>
                )}

                {/* Phase 2 평점·시간 한 줄 (v1 카드의 정보 위계) */}
                {(quality?.meta || quality?.user || quality?.main) && lt >= STATS_AT - 0.1 && (
                    <div style={{ position: 'absolute', left: 64, top: STATS_Y }}>
                        <StatsRow lt={lt} start={STATS_AT} model={model} width={826} height={232} />
                    </div>
                )}

                {/* Phase 3 가격 신호등 판정 */}
                <div style={{ position: 'absolute', left: 64, top: VERDICT_Y }}>
                    <VerdictReelBanner
                        lt={lt} verdictAt={verdictAt} landAt={landAt} verdict={verdict}
                        reason={shortVerdictReason(model)} width={826} height={296}
                    />
                </div>

                {/* 마지막 게임: 판정 착지 뒤 사이트 표기 (아웃트로 대신, 하단 쇼츠 UI 위 안전영역) */}
                {isLast && lt >= landAt + 0.5 && (
                    <div style={{
                        position: 'absolute', left: 64, top: VERDICT_Y + 296 + 26,
                        display: 'flex', alignItems: 'center', gap: 14,
                        ...riseIn(lt, landAt + 0.5, 0.45, 18),
                    }}>
                        <SignalMark height={26} />
                        <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.92)' }}>ps-signal.com</span>
                        <span style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>실시간 최저가 확인</span>
                    </div>
                )}
            </div>

            {/* 판정 착지 순간 화면 전체에 판정색 플래시 */}
            {flash > 0.01 && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `radial-gradient(circle at 50% 54%, ${alpha(verdict.color, 0.4)}, transparent 70%)`,
                    opacity: flash,
                }} />
            )}
            <Vignette />
            <Grain t={lt} />
            {exitDim > 0 && <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: exitDim, pointerEvents: 'none' }} />}
        </div>
    );
}

/** 기존 쇼츠 아웃트로(assets/outro.html) 디자인을 60fps 결정적 모션으로 재현 */
function OutroScene({ lt, slideY = 0 }) {
    const glowScale = 0.94 + Math.sin(lt * 2.2) * 0.08;
    const btnIn = anim(lt, 0.05, 0.38, ease.outBack);
    const brandIn = anim(lt, 0.22, 0.42, ease.outExpo);

    // 커서 비행 (0.18~0.78) → 클릭(0.82~1.04) → 파장
    const curFly = anim(lt, 0.16, 0.62, ease.outCubic);
    const clickP = prog(lt, 0.78, 0.28);
    const pressDown = clickP > 0 && clickP < 1 ? Math.sin(clickP * Math.PI) : 0;
    const rippleP = prog(lt, 0.84, 0.65);
    const badgePulse = 1 + Math.sin(Math.max(0, lt - 0.5) * 3.5) * 0.03;

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden', background: '#000',
            transform: `translateY(${slideY}px)`,
        }}>
            {slideY > 1 && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 10,
                    background: NEUTRAL_ACCENT, boxShadow: `0 0 40px ${NEUTRAL_ACCENT}`,
                }} />
            )}

            <div style={{
                position: 'absolute', top: '46%', left: '50%',
                width: 900, height: 900,
                transform: `translate(-50%, -50%) scale(${glowScale})`,
                background: 'radial-gradient(circle, rgba(220,38,38,0.24) 0%, rgba(0,112,209,0.16) 50%, transparent 75%)',
                filter: 'blur(140px)', pointerEvents: 'none',
            }} />

            {/* 쇼츠 하단 UI 침범 방지를 위해 상단/중앙 안전영역 중심으로 배치 */}
            <div style={{
                position: 'relative', zIndex: 10, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                paddingBottom: 180,
            }}>
                <div style={{
                    position: 'relative', marginBottom: 78,
                    opacity: clamp(btnIn * 1.6),
                    transform: `scale(${lerp(0.72, 1, btnIn)}) translateY(${(1 - btnIn) * 32}px)`,
                }}>
                    <div style={{
                        background: '#8b0000', borderRadius: 46, padding: '12px 14px 24px 14px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(239,68,68,0.38)',
                        border: '6px solid #e11d48',
                    }}>
                        <div style={{
                            background: '#fff', borderRadius: 36, padding: '36px 82px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transform: `translate(${pressDown * 4}px, ${pressDown * 8}px)`,
                            boxShadow: pressDown > 0.3
                                ? 'inset 0 -2px 0 #cbd5e1, 0 4px 10px rgba(0,0,0,0.3)'
                                : 'inset 0 -8px 0 #cbd5e1, 0 10px 20px rgba(0,0,0,0.25)',
                        }}>
                            <span style={{
                                fontSize: 90, fontWeight: 900, fontStyle: 'italic', color: '#dc2626',
                                letterSpacing: 2,
                                textShadow: '0 2px 0 #991b1b, 0 4px 0 #991b1b, 0 6px 0 #7f1d1d, 0 10px 15px rgba(0,0,0,0.4)',
                            }}>
                                SUBSCRIBE
                            </span>
                        </div>
                    </div>

                    {rippleP > 0 && rippleP < 1 && (
                        <div style={{
                            position: 'absolute', bottom: 18, right: 26, width: 44, height: 44,
                            border: '5px solid rgba(220,38,38,0.85)', borderRadius: '50%',
                            transform: `scale(${lerp(0.4, 3.6, ease.outCubic(rippleP))})`,
                            opacity: 1 - rippleP, pointerEvents: 'none',
                        }} />
                    )}

                    <div style={{
                        position: 'absolute', width: 100, height: 100, bottom: -38, right: -28, zIndex: 20,
                        filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.75))',
                        opacity: clamp(curFly * 2),
                        transform: `translate(${lerp(110, -4 * pressDown, curFly)}px, ${lerp(110, -4 * pressDown, curFly)}px) scale(${lerp(1.25, 1 - 0.14 * pressDown, curFly)})`,
                    }}>
                        <svg viewBox="0 0 100 100" fill="none" style={{ width: '100%', height: '100%' }}>
                            <path d="M15 15L42 85L54 54L85 42L15 15Z" fill="#FFFFFF" stroke="#000000" strokeWidth="6" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    opacity: clamp(brandIn * 1.5),
                    transform: `translateY(${(1 - brandIn) * 28}px)`,
                }}>
                    <div style={{
                        fontSize: 88, fontWeight: 900, letterSpacing: '-2px', color: '#fff',
                        textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(255,255,255,0.3)',
                        marginBottom: 14, borderBottom: '5px solid #fff', paddingBottom: 6,
                    }}>
                        ps-signal.com
                    </div>
                    <div style={{
                        backgroundColor: '#facc15', color: '#000', fontSize: 42, fontWeight: 900,
                        padding: '10px 26px',
                        boxShadow: '0 10px 28px rgba(250,204,21,0.45)',
                        transform: `scale(${badgePulse})`,
                    }}>
                        more info
                    </div>
                </div>
            </div>

            <Grain t={lt} opacity={0.05} />
        </div>
    );
}

function ShortsV2Stage({ models, renderMode, freezeAt, durationsParam }) {
    const manifest = useMemo(() => buildShortsManifest(models, durationsParam), [models, durationsParam]);
    const imageUrls = useMemo(() => models.map((m) => m.meta.imageUrl).filter(Boolean), [models]);
    const { t } = useLongformRuntime({ manifest, total: manifest.total, imageUrls, renderMode, freezeAt });
    const scale = useStageScale(SHORTS_W, SHORTS_H);

    const endDate = models.map((m) => m.price.saleEndDate).filter(Boolean).sort()[0] ?? null;
    const endLabel = endDate ? `${Number(endDate.slice(5, 7))}월 ${Number(endDate.slice(8, 10))}일 마감` : '기간 한정';

    const scenes = manifest.scenes;
    const gameScenes = scenes.slice(0, models.length);
    let activeIdx = scenes.findIndex((s) => t >= s.start && t < s.end);
    if (activeIdx === -1) activeIdx = scenes.length - 1;
    const currentScene = scenes[activeIdx];
    const nextScene = activeIdx < scenes.length - 1 ? scenes[activeIdx + 1] : null;
    const lt = Math.max(0, t - currentScene.start);

    const wipeProg = nextScene ? prog(t, currentScene.end - WIPE_DUR, WIPE_DUR) : 0;
    const wipeEase = ease.inOutCubic(wipeProg);
    // 와이프 속도에 비례한 모션 블러 (세로 휩팬 느낌)
    const wipeBlur = Math.sin(wipeProg * Math.PI) * 7;
    // 0~1.5초: 첫 프레임(=쇼츠 탭 썸네일)에 "마감일 · TOP 3" 약속을 크게 걸었다가 HUD 자리로 넘긴다
    const hookOut = anim(t, HOOK_HOLD, 0.35, ease.inOutCubic);
    const hudBase = currentScene.id === 'outro' ? 0 : nextScene?.id === 'outro' ? 1 - wipeEase : 1;
    const hudOpacity = hudBase * clamp((t - HOOK_HOLD - 0.15) / 0.3);
    const hookTitle = models.every((m) => m.price.atl === 'new' || m.price.atl === 'equal')
        ? `역대 최저가 TOP ${models.length}`
        : `할인 추천 TOP ${models.length}`;
    const hookDate = endDate ? `${Number(endDate.slice(5, 7))}/${Number(endDate.slice(8, 10))} 마감` : '기간 한정';
    const hudIdx = currentScene.id === 'outro'
        ? models.length - 1
        : (nextScene && nextScene.id !== 'outro' && wipeProg > 0.85 ? activeIdx + 1 : activeIdx);

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{
                position: 'relative', width: SHORTS_W, height: SHORTS_H, flexShrink: 0, overflow: 'hidden',
                transform: `scale(${scale})`, fontFamily: FONT_FAMILY, color: '#fff', userSelect: 'none', WebkitFontSmoothing: 'antialiased',
            }}>
                {currentScene.id === 'outro' ? (
                    <OutroScene lt={lt} />
                ) : (
                    <GameSlot
                        model={models[activeIdx]}
                        lt={lt}
                        duration={currentScene.duration}
                        isFirst={activeIdx === 0}
                        isLast={activeIdx === models.length - 1}
                        hasHook={activeIdx === 0}
                        exitScale={lerp(1, 0.95, wipeEase)}
                        exitDim={wipeEase * 0.45}
                        blur={wipeBlur}
                    />
                )}

                {nextScene && wipeProg > 0 && (
                    nextScene.id === 'outro' ? (
                        <OutroScene lt={0} slideY={(1 - wipeEase) * SHORTS_H} />
                    ) : (
                        <GameSlot
                            model={models[activeIdx + 1]}
                            lt={0}
                            duration={nextScene.duration}
                            isFirst={false}
                            isLast={activeIdx + 1 === models.length - 1}
                            slideY={(1 - wipeEase) * SHORTS_H}
                            blur={wipeBlur}
                        />
                    )
                )}

                <TopHud t={t} gameScenes={gameScenes} activeIdx={hudIdx} endLabel={endLabel} opacity={hudOpacity} />
                {hookOut < 1 && <HookBanner t={t} date={hookDate} title={hookTitle} out={hookOut} />}
            </div>
        </div>,
        document.body,
    );
}

/** ids 순서대로 3개 게임을 불러와 쇼츠 2.0 타임라인 스테이지를 렌더한다 */
export default function GameShortsV2({ firstGame }) {
    const { search } = useLocation();
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const idsParam = params.get('ids') || String(firstGame.id);
    const [models, setModels] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const now = new Date();
        const ids = idsParam.split(',').map((s) => Number(s.trim())).filter(Boolean);
        Promise.all(ids.map((id) => (id === firstGame.id ? Promise.resolve(firstGame) : client.get(`/api/v1/games/${id}`).then((r) => r.data))))
            .then((list) => {
                if (!cancelled) {
                    setModels(list.map((g, i) => buildModel(g, { now, index: i + 1, count: list.length })));
                }
            })
            .catch((e) => { if (!cancelled) setError(e); });
        return () => { cancelled = true; };
    }, [idsParam, firstGame]);

    if (error) return <div style={{ color: '#fff', padding: 40 }}>쇼츠용 게임 데이터를 불러오지 못했습니다: {String(error.message || error)}</div>;
    if (!models) return null;

    return (
        <ShortsV2Stage
            models={models}
            renderMode={params.get('render') === '1'}
            freezeAt={params.has('t') ? Number(params.get('t')) : null}
            durationsParam={params.get('durations')}
        />
    );
}
