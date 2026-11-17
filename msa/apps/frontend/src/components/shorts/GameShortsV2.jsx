// YouTube Shorts 2.0 모션그래픽 — /games/:id?view=shorts-v2&ids=442,671,1744&render=1&durations=g1:8.6,g2:8.0,g3:8.8
//
// 1080x1920 세로 풀스크린 결정적(pure t) 타임라인 엔진:
// - 0.00초 첫 프레임부터 1번 게임 커버·선명한 최종 할인가·할인율·역대최저가·핵심 요약이 즉시 노출
// - Phase 2: 3D 금속 방패 + 실시간 가격 이력 계단 차트 + 메타/유저 이중 링 대시보드
// - Phase 3: 초고속 ○△×□ 슬롯 릴 판정 + 하단/우측 세이프존(y <= 1356, x <= 890) 엄수
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ArrowDown, Flame, TrendingUp } from 'lucide-react';
import client from '../../api/client';
import { alpha, anim, clamp, ease, lerp, prog, shake } from '../longform/engine';
import { BRAND_NAME, NEUTRAL_ACCENT, SALE_RED, buildModel, fmt } from '../longform/gameModel';
import { FONT_FAMILY, LF_CONTRACT_VERSION, posterSrc, useLongformRuntime, useStageScale } from '../longform/runtime';
import { Grain, Odometer, SignalMark } from '../longform/primitives';
import { Backdrop, Vignette } from '../longform/chrome';
import { MiniPriceChart, MiniTierShield, QualityDashboard, VerdictReelBanner } from './ShortsCharts';

export const SHORTS_W = 1080;
export const SHORTS_H = 1920;

const WIPE_DUR = 0.34;
const DEFAULT_SLOT_DUR = 8.4;
const MIN_SLOT_DUR = 6.5;

function parseSlotDurations(str, count) {
    const out = Array(count).fill(DEFAULT_SLOT_DUR);
    if (!str) return out;
    for (const part of str.split(',')) {
        const [k, v] = part.split(':').map((s) => s.trim());
        const m = k?.match(/^g(\d+)$/i);
        const n = Number(v);
        if (m && Number.isFinite(n) && n > 0) {
            const idx = Number(m[1]) - 1;
            if (idx >= 0 && idx < count) out[idx] = Math.max(MIN_SLOT_DUR, n);
        }
    }
    return out;
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
    const slotDurs = parseSlotDurations(durationsParam, models.length);
    let cursor = 0;
    const scenes = models.map((model, i) => {
        const duration = slotDurs[i];
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

    const cues = [];
    const at = (scene, offset, type, extra = {}) => {
        const tVal = Math.max(0, Math.round((scene.start + offset) * 1000) / 1000);
        cues.push({ t: tVal, type, scene: scene.id, ...extra });
    };

    scenes.forEach((s, i) => {
        const m = models[i];
        const isFirst = i === 0;
        const impactAt = isFirst ? 0.14 : 0.34;
        const atlAt = isFirst ? 0.32 : 0.90;
        const verdictAt = Math.max(4.4, s.duration - 2.55);

        // 1번 게임은 0.00s부터 선명한 최종가 표시(오도미터 블러 없음), 2·3번 게임만 전환 직후 오도미터 틱 사운드 배치
        if (!isFirst && m.price.original) at(s, 0.08, 'tick', { duration: 0.78 });
        if (m.price.rate > 0) at(s, impactAt, 'impact');
        if (m.price.atl === 'new' || m.price.atl === 'equal') at(s, atlAt, 'chime');
        at(s, 2.2, 'flip');
        at(s, verdictAt + 0.48, 'impactBig');
        if (i < scenes.length - 1) at(s, s.duration - WIPE_DUR + 0.04, 'whoosh');
    });

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
    if (len <= 14) return 60;
    if (len <= 22) return 52;
    if (len <= 32) return 46;
    return 40;
}

function priceFontSize(priceText) {
    const len = priceText.length;
    if (len <= 6) return 124;
    if (len <= 7) return 110;
    return 94;
}

function FeatureBadges({ meta }) {
    const tags = [
        meta.isPs5ProEnhanced && { text: 'PS5 Pro', color: '#e2e8f0', bg: 'rgba(255,255,255,0.12)' },
        meta.isPlusExclusive && { text: 'PLUS 할인', color: '#facc15', bg: alpha('#facc15', 0.16) },
        meta.inCatalog && { text: 'PS+ 카탈로그', color: '#38bdf8', bg: alpha('#38bdf8', 0.16) },
    ].filter(Boolean);
    if (!tags.length) return null;
    return tags.map((tg) => (
        <span key={tg.text} style={{
            padding: '3px 10px', borderRadius: 8, fontSize: 18, fontWeight: 900,
            color: tg.color, background: tg.bg, border: `1px solid ${alpha(tg.color, 0.45)}`,
            whiteSpace: 'nowrap',
        }}>
            {tg.text}
        </span>
    ));
}

function TopHud({ t, scenes, activeIdx, endLabel }) {
    return (
        <div style={{
            position: 'absolute', top: 114, left: 64, right: 64, zIndex: 40,
            display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none',
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
                    <span style={{ color: '#fff' }}>{String(activeIdx + 1).padStart(2, '0')}</span> / {String(scenes.length).padStart(2, '0')}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
                {scenes.map((s) => {
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

function GameSlot({ model, lt, duration, isFirst, isLast, endLabel, slideY = 0, exitScale = 1, exitDim = 0 }) {
    const { meta, price, defense, quality, verdict } = model;
    const impactAt = isFirst ? 0.14 : 0.34;
    const dockAt = 2.15;
    const verdictAt = Math.max(4.4, duration - 2.55);
    const verdictLandAt = verdictAt + 0.48;

    const dockP = anim(lt, dockAt, 0.52, ease.inOutCubic);
    const activeAccent = lt >= verdictLandAt ? verdict.color : NEUTRAL_ACCENT;
    const sh = shake(lt, impactAt, { duration: 0.3, amp: 9, freq: 42 });

    // 1번 게임은 t=0.00부터 모든 핵심 정보가 흐림/오표기 없이 선명하게 보이도록 설계
    const heroScale = isFirst ? lerp(1.04, 1, anim(lt, 0, 0.22, ease.outQuart)) : 1;
    const g1PricePop = isFirst ? lerp(1.1, 1, anim(lt, 0, 0.24, ease.outBack)) : 1;
    const bob = Math.sin(lt * 2.2) * 5 * (1 - dockP);

    // Phase 1 포스터 중심(242 + 470/2 = 477)과 하단 안전영역(64..890, 중심 = 477)의 수직 축 일치
    const posterW = lerp(470, 200, dockP);
    const posterH = lerp(626, 266, dockP);
    const posterX = lerp(242, 64, dockP);
    const posterY = lerp(348, 200, dockP) + bob;
    const posterRot = lerp(-1.5, 0, dockP);

    const discountPop = isFirst ? anim(lt, 0, 0.22, ease.outBack) : anim(lt, 0.12, 0.28, ease.outBack);
    const discountScale = lerp(isFirst ? 1.16 : 1.75, 1, discountPop);
    const atlScale = isFirst ? lerp(1.1, 1, anim(lt, 0, 0.25, ease.outBack)) : anim(lt, 0.65, 0.32, ease.outBack);
    const atlOpacity = isFirst ? 1 : clamp(atlScale * 2);
    const strikeP = isFirst ? 1 : anim(lt, 0.10, 0.36, ease.outExpo);
    const hookRowP = isFirst ? lerp(0.7, 1, anim(lt, 0, 0.32, ease.outExpo)) : anim(lt, 0.55, 0.38, ease.outExpo);
    const sweep = ((lt - 0.35) % 2.4) / 0.9;

    const priceText = fmt(price.current);
    const heroPriceFont = priceFontSize(priceText);
    const tSize = titleFontSize(meta.title);
    const subTag = [meta.platforms.slice(0, 2).join(' · '), meta.genre].filter(Boolean).join(' · ');

    const hookChips = [
        price.savings > 0 && `${fmt(price.savings)}원 절약`,
        quality?.meta && `메타 ${quality.meta}점`,
        quality?.main && `메인 ${quality.main}시간`,
    ].filter(Boolean);

    const hasDefense = Boolean(defense);
    const chartWidth = hasDefense ? 584 : 826;
    const ctaP = isLast ? anim(lt, duration - 1.35, 0.35, ease.outExpo) : 0;
    const arrowBob = isLast ? Math.sin(lt * 7) * 4 : 0;

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            transform: `translateY(${slideY}px) scale(${exitScale})`,
            transformOrigin: 'center center',
        }}>
            <Backdrop t={lt} imageUrl={meta.imageUrl} accent={activeAccent} width={SHORTS_W} height={SHORTS_H} />

            {slideY > 1 && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 10,
                    background: NEUTRAL_ACCENT, boxShadow: `0 0 40px ${NEUTRAL_ACCENT}`,
                }} />
            )}

            <div style={{ position: 'absolute', inset: 0, transform: `translate(${sh.x}px, ${sh.y}px) scale(${heroScale})` }}>
                {/* Phase 1 상단 타이틀 */}
                <div style={{
                    position: 'absolute', left: 64, right: 64, top: 202,
                    opacity: 1 - clamp(dockP * 1.8),
                    transform: `translateY(${dockP * -28}px)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {subTag && (
                            <span style={{ fontSize: 23, fontWeight: 800, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.04em' }}>
                                {subTag}
                            </span>
                        )}
                        <FeatureBadges meta={meta} />
                    </div>
                    <div style={{
                        fontSize: tSize, fontWeight: 900, lineHeight: 1.13, letterSpacing: '-0.02em', color: '#fff',
                        textShadow: '0 8px 34px rgba(0,0,0,0.75)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {meta.title}
                    </div>
                </div>

                {/* Phase 2 도킹 헤더 (y=200..475 안쪽에 안전하게 수납) */}
                {dockP > 0.05 && (
                    <div style={{
                        position: 'absolute', left: 288, right: 64, top: 200, maxHeight: 278, overflow: 'hidden',
                        opacity: clamp((dockP - 0.2) * 1.5),
                        transform: `translateY(${(1 - dockP) * 24}px)`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                            {subTag && (
                                <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.62)' }}>
                                    {subTag}
                                </span>
                            )}
                            <FeatureBadges meta={meta} />
                        </div>
                        <div style={{
                            fontSize: Math.min(40, tSize), fontWeight: 900, lineHeight: 1.13, color: '#fff',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                            {meta.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 10 }}>
                            <span style={{ fontSize: 60, fontWeight: 900, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                                {priceText}원
                            </span>
                            {price.rate > 0 && (
                                <span style={{
                                    padding: '4px 14px', borderRadius: 12, background: SALE_RED, color: '#fff',
                                    fontSize: 28, fontWeight: 900,
                                }}>
                                    -{price.rate}%
                                </span>
                            )}
                        </div>
                        {price.original && (
                            <div style={{ fontSize: 25, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                                정가 <span style={{ textDecoration: 'line-through', textDecorationThickness: 2 }}>{fmt(price.original)}원</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 포스터 카드 (Phase 1 대형 → Phase 2 좌상단 연속 모핑) */}
                <div style={{
                    position: 'absolute', left: posterX, top: posterY, width: posterW, height: posterH,
                    transform: `rotate(${posterRot}deg)`, transformOrigin: 'center center',
                }}>
                    <div style={{
                        position: 'relative', width: '100%', height: '100%', borderRadius: lerp(28, 20, dockP), overflow: 'hidden',
                        boxShadow: `0 30px 90px rgba(0,0,0,0.8), 0 0 ${lerp(130, 50, dockP)}px ${alpha(activeAccent, 0.45)}`,
                        border: '2px solid rgba(255,255,255,0.22)', background: '#11131c',
                    }}>
                        {meta.imageUrl && (
                            <img src={posterSrc(meta.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
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
                            padding: '10px 20px', borderRadius: 16,
                            background: price.atl === 'new' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: '#fff', fontSize: 27, fontWeight: 900,
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.35)',
                            transform: `scale(${atlScale})`, opacity: atlOpacity * (1 - dockP),
                        }}>
                            {price.atl === 'new' ? <Flame size={26} strokeWidth={2.5} /> : <TrendingUp size={26} strokeWidth={2.5} />}
                            <span>{price.atl === 'new' ? '역대 최저가 갱신' : '역대 최저가 동률'}</span>
                        </div>
                    )}

                    {/* -85% 할인 스탬프 */}
                    {price.rate > 0 && dockP < 0.7 && (
                        <div style={{
                            position: 'absolute', right: -34, bottom: 24,
                            padding: '10px 28px', borderRadius: 22, background: SALE_RED, color: '#fff',
                            fontSize: 80, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08,
                            boxShadow: `0 16px 46px ${alpha(SALE_RED, 0.65)}`,
                            transform: `rotate(4deg) scale(${discountScale})`,
                            opacity: (isFirst ? 1 : clamp(discountPop * 2)) * (1 - dockP),
                        }}>
                            -{price.rate}%
                        </div>
                    )}
                </div>

                {/* Phase 1 대형 가격 + 핵심 요약 (g1은 t=0.00부터 선명한 최종가, g2/g3은 사각 클리핑 없는 drop-shadow Odometer) */}
                {dockP < 0.85 && (
                    <div style={{
                        position: 'absolute', left: 64, right: 190, top: 1002,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                        opacity: 1 - clamp(dockP * 1.6),
                        transform: `translateY(${dockP * -36}px)`,
                    }}>
                        {price.original && (
                            <div style={{ fontSize: 42, fontWeight: 800, color: 'rgba(255,255,255,0.56)', fontVariantNumeric: 'tabular-nums' }}>
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
                            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: 8, lineHeight: 1,
                            transform: `scale(${g1PricePop})`,
                            filter: `drop-shadow(0 0 28px ${alpha(SALE_RED, 0.35)}) drop-shadow(0 10px 24px rgba(0,0,0,0.75))`,
                        }}>
                            <span style={{ fontSize: heroPriceFont, fontWeight: 900, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                                {isFirst || !price.original
                                    ? priceText
                                    : <Odometer from={price.original} to={price.current} t={lt} start={0.08} dur={0.78} />}
                            </span>
                            <span style={{ fontSize: Math.round(heroPriceFont * 0.42), fontWeight: 900 }}>원</span>
                        </div>
                        {hookChips.length > 0 && (
                            <div style={{
                                marginTop: 22, padding: '10px 24px', borderRadius: 999,
                                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)',
                                fontSize: 25, fontWeight: 800, color: 'rgba(255,255,255,0.92)',
                                opacity: clamp(hookRowP * 1.4),
                                transform: `translateY(${(1 - hookRowP) * 12}px)`,
                            }}>
                                {hookChips.join('  ·  ')}
                            </div>
                        )}
                    </div>
                )}

                {/* Phase 2 상단: 3D 방패 + 실시간 가격 이력 계단 차트 (y: 500~784, left: 64..890) */}
                {dockP > 0.25 && (
                    <div style={{
                        position: 'absolute', left: 64, top: 500, width: 826, height: 284,
                        display: 'flex', gap: 18, alignItems: 'stretch',
                    }}>
                        {hasDefense && <MiniTierShield lt={lt} start={2.28} defense={defense} width={224} />}
                        <MiniPriceChart lt={lt} start={2.32} price={price} accent={activeAccent} width={chartWidth} height={284} />
                    </div>
                )}

                {/* Phase 2 하단: 메타·유저 이중 링 + 플레이타임 대시보드 (y: 804~1054, left: 64..890) */}
                {dockP > 0.35 && (
                    <div style={{ position: 'absolute', left: 64, top: 804, width: 826, height: 250 }}>
                        <QualityDashboard lt={lt} start={2.65} model={model} accent={activeAccent} width={826} height={250} />
                    </div>
                )}

                {/* Phase 3: 초고속 ○△×□ 슬롯 릴 판정 배너 (y: 1076~1268, left: 64..890) */}
                <div style={{ position: 'absolute', left: 64, top: 1076, width: 826, height: 192 }}>
                    <VerdictReelBanner lt={lt} verdictAt={verdictAt} verdict={verdict} width={826} height={192} />
                </div>

                {/* 마지막 게임 끝 1.35초: y <= 1356 안전 구역 내 관련 동영상 포인터 */}
                {isLast && ctaP > 0 && (
                    <div style={{
                        position: 'absolute', left: 64, top: 1288, width: 826, height: 68,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                        padding: '0 24px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.32)',
                        opacity: clamp(ctaP * 1.5),
                        transform: `translateY(${(1 - ctaP) * 18}px)`,
                    }}>
                        <span style={{ display: 'inline-flex', transform: `translateY(${arrowBob}px)`, color: NEUTRAL_ACCENT }}>
                            <ArrowDown size={24} strokeWidth={2.8} />
                        </span>
                        <span style={{ fontSize: 25, fontWeight: 800, color: '#fff' }}>
                            전체 할인 분석은 아래 관련 동영상 · ps-signal.com
                        </span>
                    </div>
                )}
            </div>

            <Vignette />
            <Grain t={lt} />
            {exitDim > 0 && <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: exitDim, pointerEvents: 'none' }} />}
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
    let activeIdx = scenes.findIndex((s) => t >= s.start && t < s.end);
    if (activeIdx === -1) activeIdx = scenes.length - 1;
    const currentScene = scenes[activeIdx];
    const nextScene = activeIdx < scenes.length - 1 ? scenes[activeIdx + 1] : null;
    const lt = Math.max(0, t - currentScene.start);

    const wipeProg = nextScene ? prog(t, currentScene.end - WIPE_DUR, WIPE_DUR) : 0;
    const wipeEase = ease.inOutCubic(wipeProg);

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{
                position: 'relative', width: SHORTS_W, height: SHORTS_H, flexShrink: 0, overflow: 'hidden',
                transform: `scale(${scale})`, fontFamily: FONT_FAMILY, color: '#fff', userSelect: 'none', WebkitFontSmoothing: 'antialiased',
            }}>
                <GameSlot
                    model={models[activeIdx]}
                    lt={lt}
                    duration={currentScene.duration}
                    isFirst={activeIdx === 0}
                    isLast={activeIdx === scenes.length - 1}
                    endLabel={endLabel}
                    exitScale={lerp(1, 0.95, wipeEase)}
                    exitDim={wipeEase * 0.45}
                />

                {nextScene && wipeProg > 0 && (
                    <GameSlot
                        model={models[activeIdx + 1]}
                        lt={0}
                        duration={nextScene.duration}
                        isFirst={false}
                        isLast={activeIdx + 1 === scenes.length - 1}
                        endLabel={endLabel}
                        slideY={(1 - wipeEase) * SHORTS_H}
                    />
                )}

                <TopHud t={t} scenes={scenes} activeIdx={wipeProg > 0.5 && nextScene ? activeIdx + 1 : activeIdx} endLabel={endLabel} />
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
