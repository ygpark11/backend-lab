// YouTube Shorts 2.0 모션그래픽 — /games/:id?view=shorts-v2&ids=442,671,1744&render=1&durations=g1:8.6,g2:8.0,g3:8.8
//
// 1080x1920 세로 풀스크린 결정적(pure t) 타임라인 엔진:
// - 0.00초 첫 프레임부터 1번 게임 커버·가격·할인율이 즉시 노출 (공통 인트로 제거로 스와이프 이탈 방어)
// - 게임당 8~9초 압축(총 24~27초), 아웃트로 없이 마지막 게임 직후 루프
// - YouTube Shorts UI 세이프존(상단 120px, 우측 175px 버튼 열, 하단 450px 제목/관련동영상) 엄수
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import client from '../../api/client';
import { alpha, anim, clamp, ease, lerp, prog, shake } from '../longform/engine';
import { BRAND_NAME, NEUTRAL_ACCENT, SALE_RED, buildModel, fmt } from '../longform/gameModel';
import { FONT_FAMILY, LF_CONTRACT_VERSION, posterSrc, useLongformRuntime, useStageScale } from '../longform/runtime';
import { Grain, Odometer, PsSymbol, Ring, SignalMark } from '../longform/primitives';
import { Backdrop, Vignette } from '../longform/chrome';

export const SHORTS_W = 1080;
export const SHORTS_H = 1920;

const GREEN = '#22c55e';
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
        currentPrice: price.current,
        originalPrice: price.original,
        discountRate: price.rate,
        savings: price.savings,
        lowestPrice: price.lowest,
        allTimeLow: price.atl,
        saleEndDate: price.saleEndDate,
        metaScore: quality?.meta ?? null,
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
        const tickAt = isFirst ? 0.0 : 0.12;
        const impactAt = isFirst ? 0.22 : 0.45;
        const atlAt = isFirst ? 0.85 : 1.05;
        const verdictAt = Math.max(4.6, s.duration - 2.2);

        if (m.price.original) at(s, tickAt, 'tick', { duration: 0.95 });
        if (m.price.rate > 0) at(s, impactAt, 'impact');
        if (m.price.atl === 'new' || m.price.atl === 'equal') at(s, atlAt, 'chime');
        at(s, 2.25, 'flip');
        at(s, verdictAt, 'impactBig');
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
    if (len <= 14) return 58;
    if (len <= 22) return 50;
    if (len <= 32) return 44;
    return 38;
}

function priceFontSize(priceText) {
    const len = priceText.length;
    if (len <= 6) return 126;
    if (len <= 7) return 112;
    return 96;
}

function TopHud({ t, scenes, activeIdx, endLabel }) {
    return (
        <div style={{
            position: 'absolute', top: 108, left: 64, right: 64, zIndex: 40,
            display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'none',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <SignalMark height={22} />
                    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.85)' }}>
                        {BRAND_NAME.toUpperCase()}
                    </span>
                    <span style={{
                        padding: '5px 16px', borderRadius: 999, fontSize: 22, fontWeight: 900, color: SALE_RED,
                        background: alpha(SALE_RED, 0.16), border: `1.5px solid ${alpha(SALE_RED, 0.55)}`,
                    }}>
                        {endLabel}
                    </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>
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

function StatCard({ showP, accent, label, mainText, subText, leftSlot }) {
    if (showP <= 0) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 22, padding: '22px 26px', borderRadius: 24,
            background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${alpha(accent, 0.3)}`,
            boxShadow: `0 14px 36px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)`,
            opacity: clamp(showP * 1.6),
            transform: `translateY(${(1 - showP) * 36}px)`,
        }}>
            {leftSlot}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.18, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mainText}
                </div>
                {subText && (
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.72)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subText}
                    </div>
                )}
            </div>
        </div>
    );
}

function GameSlot({ model, lt, duration, isFirst, isLast, endLabel, slideY = 0 }) {
    const { meta, price, defense, quality, verdict } = model;
    const impactAt = isFirst ? 0.22 : 0.45;
    const tickAt = isFirst ? -0.12 : 0.12;
    const atlAt = isFirst ? 0.85 : 1.05;
    const dockAt = 2.25;
    const verdictAt = Math.max(4.6, duration - 2.2);

    const dockP = anim(lt, dockAt, 0.55, ease.inOutCubic);
    const verdictP = anim(lt, verdictAt, 0.5, ease.outBack);
    const activeAccent = lt >= verdictAt ? verdict.color : NEUTRAL_ACCENT;
    const sh = shake(lt, impactAt, { duration: 0.35, amp: 10, freq: 42 });

    // 0.00s에 화면이 비지 않도록 g1은 첫 프레임부터 포스터·타이틀·가격·할인율이 즉시 보이게 설정
    const heroScale = isFirst ? lerp(1.06, 1, anim(lt, 0, 0.25, ease.outQuart)) : 1;
    const bob = Math.sin(lt * 2.2) * 5 * (1 - dockP);

    // 포스터 크기/위치 보간: 상단 중앙 대형(460x613) -> Phase 2 좌상단 컴팩트(224x298)
    const posterW = lerp(460, 224, dockP);
    const posterH = lerp(613, 298, dockP);
    const posterX = lerp(310, 64, dockP);
    const posterY = lerp(380, 214, dockP) + bob;
    const posterRot = lerp(-1.8, 0, dockP);

    const discountPop = isFirst ? anim(lt, 0, impactAt, ease.outBack) : anim(lt, impactAt - 0.18, 0.32, ease.outBack);
    const discountScale = lerp(isFirst ? 1.45 : 1.9, 1, discountPop);
    const atlPop = anim(lt, atlAt, 0.36, ease.outBack);
    const strikeP = isFirst ? lerp(0.35, 1, anim(lt, 0, 0.35, ease.outExpo)) : anim(lt, 0.12, 0.45, ease.outExpo);
    const savingsP = anim(lt, 1.05, 0.42, ease.outExpo);
    const sweep = ((lt - 0.5) % 2.4) / 0.9;

    const priceText = fmt(price.current);
    const heroPriceFont = priceFontSize(priceText);
    const tSize = titleFontSize(meta.title);
    const subTag = [meta.platforms.slice(0, 2).join(' · '), meta.genre].filter(Boolean).join(' · ');

    // Phase 2 스펙 카드 구성 (최대 3장)
    const specCards = [];
    if (defense) {
        specCards.push({
            key: 'defense',
            accent: defense.tier.metal[1],
            label: '할인 방어력',
            mainText: `${defense.tierText} (${defense.tier.desc})`,
            subText: [
                defense.discountCount > 0 && `누적 ${defense.discountCount}회 할인`,
                defense.monthsPerSale && `평균 ${Math.round(defense.monthsPerSale * 10) / 10}개월 주기`,
            ].filter(Boolean).join(' · ') || '가격 이력 추적 중',
            leftSlot: (
                <div style={{
                    width: 84, height: 84, borderRadius: 20, flexShrink: 0,
                    background: `linear-gradient(135deg, ${defense.tier.metal[0]}, ${defense.tier.metal[1]})`,
                    color: '#0b0c12', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 44, fontWeight: 900, boxShadow: `0 10px 26px ${alpha(defense.tier.metal[1], 0.4)}`,
                }}>
                    {defense.tierKey}
                </div>
            ),
        });
    }
    if (quality && (quality.meta || quality.main)) {
        const metaVal = quality.meta ?? 0;
        const ringFill = anim(lt, 2.65, 0.9, ease.outCubic);
        specCards.push({
            key: 'quality',
            accent: metaVal >= 85 ? GREEN : NEUTRAL_ACCENT,
            label: '평가 · 플레이 볼륨',
            mainText: quality.main ? `메인 ${quality.main}시간` : `메타크리틱 ${metaVal}점`,
            subText: [
                quality.perHour && `시간당 ${fmt(quality.perHour)}원`,
                quality.tags?.[0]?.name,
            ].filter(Boolean).join(' · ') || '검증된 타이틀',
            leftSlot: quality.meta ? (
                <Ring size={94} stroke={10} value={(metaVal / 100) * ringFill} color={metaVal >= 85 ? GREEN : NEUTRAL_ACCENT} glow={12}>
                    <span style={{ fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{Math.round(metaVal * ringFill)}</span>
                </Ring>
            ) : (
                <div style={{
                    width: 84, height: 84, borderRadius: 20, flexShrink: 0,
                    background: alpha(NEUTRAL_ACCENT, 0.2), border: `1.5px solid ${alpha(NEUTRAL_ACCENT, 0.5)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: NEUTRAL_ACCENT,
                }}>
                    {quality.main}H
                </div>
            ),
        });
    }
    specCards.push({
        key: 'bonus',
        accent: meta.inCatalog ? '#38bdf8' : SALE_RED,
        label: meta.inCatalog ? '구독 혜택' : '할인 요약',
        mainText: meta.inCatalog ? 'PS Plus 카탈로그 포함' : (price.savings > 0 ? `${fmt(price.savings)}원 절약` : endLabel),
        subText: meta.inCatalog ? `구독자는 무료 플레이 · ${endLabel}` : (price.lowest ? `역대 최저 ${fmt(price.lowest)}원 · ${endLabel}` : endLabel),
        leftSlot: (
            <div style={{
                width: 84, height: 84, borderRadius: 20, flexShrink: 0,
                background: alpha(meta.inCatalog ? '#38bdf8' : SALE_RED, 0.18),
                border: `1.5px solid ${alpha(meta.inCatalog ? '#38bdf8' : SALE_RED, 0.5)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 900, color: meta.inCatalog ? '#38bdf8' : SALE_RED,
            }}>
                {meta.inCatalog ? 'PS+' : `-${price.rate}%`}
            </div>
        ),
    });

    const showSpecs = specCards.slice(0, 3);
    const ctaP = isLast ? anim(lt, duration - 1.4, 0.4, ease.outExpo) : 0;

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            transform: `translateY(${slideY}px)`,
        }}>
            <Backdrop t={lt} imageUrl={meta.imageUrl} accent={activeAccent} width={SHORTS_W} height={SHORTS_H} />

            {/* 슬롯 전환 시 상단 발광 바 */}
            {slideY > 1 && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 8,
                    background: NEUTRAL_ACCENT, boxShadow: `0 0 36px ${NEUTRAL_ACCENT}`,
                }} />
            )}

            <div style={{ position: 'absolute', inset: 0, transform: `translate(${sh.x}px, ${sh.y}px) scale(${heroScale})` }}>
                {/* Phase 1 상단 타이틀 */}
                <div style={{
                    position: 'absolute', left: 64, right: 64, top: 216,
                    opacity: 1 - clamp(dockP * 1.8),
                    transform: `translateY(${dockP * -30}px)`,
                }}>
                    {subTag && (
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginBottom: 8 }}>
                            {subTag}
                        </div>
                    )}
                    <div style={{
                        fontSize: tSize, fontWeight: 900, lineHeight: 1.14, letterSpacing: '-0.02em', color: '#fff',
                        textShadow: '0 8px 34px rgba(0,0,0,0.75)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {meta.title}
                    </div>
                </div>

                {/* Phase 2 도킹 헤더 (우측 타이틀 + 가격 요약) */}
                {dockP > 0.05 && (
                    <div style={{
                        position: 'absolute', left: 318, right: 64, top: 218,
                        opacity: clamp((dockP - 0.2) * 1.5),
                        transform: `translateY(${(1 - dockP) * 28}px)`,
                    }}>
                        {subTag && (
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
                                {subTag}
                            </div>
                        )}
                        <div style={{
                            fontSize: Math.min(44, tSize), fontWeight: 900, lineHeight: 1.15, color: '#fff',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                            {meta.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 18 }}>
                            <span style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                                {priceText}원
                            </span>
                            {price.rate > 0 && (
                                <span style={{
                                    padding: '4px 14px', borderRadius: 12, background: SALE_RED, color: '#fff',
                                    fontSize: 30, fontWeight: 900,
                                }}>
                                    -{price.rate}%
                                </span>
                            )}
                        </div>
                        {price.original && (
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textDecoration: 'line-through', marginTop: 4 }}>
                                정가 {fmt(price.original)}원
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

                    {/* 역대 최저가 배지 */}
                    {(price.atl === 'new' || price.atl === 'equal') && dockP < 0.7 && (
                        <div style={{
                            position: 'absolute', left: -24, top: 24,
                            padding: '10px 22px', borderRadius: 16,
                            background: price.atl === 'new' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: '#fff', fontSize: 28, fontWeight: 900,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.35)',
                            transform: `scale(${atlPop})`, opacity: clamp(atlPop * 2) * (1 - dockP),
                        }}>
                            {price.atl === 'new' ? '🔥 역대 최저가 갱신' : '✨ 역대 최저가 동률'}
                        </div>
                    )}

                    {/* -85% 할인 스탬프 */}
                    {price.rate > 0 && dockP < 0.7 && (
                        <div style={{
                            position: 'absolute', right: -34, bottom: 24,
                            padding: '10px 28px', borderRadius: 22, background: SALE_RED, color: '#fff',
                            fontSize: 82, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08,
                            boxShadow: `0 16px 46px ${alpha(SALE_RED, 0.65)}`,
                            transform: `rotate(4deg) scale(${discountScale})`,
                            opacity: (isFirst ? 1 : clamp(discountPop * 2)) * (1 - dockP),
                        }}>
                            -{price.rate}%
                        </div>
                    )}
                </div>

                {/* Phase 1 대형 가격 롤링 (y: 1030~1350, 우측 UI 회피) */}
                {dockP < 0.85 && (
                    <div style={{
                        position: 'absolute', left: 64, right: 170, top: 1035,
                        opacity: 1 - clamp(dockP * 1.6),
                        transform: `translateY(${dockP * -40}px)`,
                    }}>
                        {price.original && (
                            <div style={{ position: 'relative', display: 'inline-block', fontSize: 44, fontWeight: 800, color: 'rgba(255,255,255,0.52)', fontVariantNumeric: 'tabular-nums' }}>
                                정가 {fmt(price.original)}원
                                <div style={{
                                    position: 'absolute', left: -4, top: '52%', height: 5, borderRadius: 3, background: SALE_RED,
                                    width: `${strikeP * 104}%`,
                                }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, lineHeight: 1 }}>
                            <span style={{
                                fontSize: heroPriceFont, fontWeight: 900, letterSpacing: '-0.05em',
                                textShadow: `0 0 60px ${alpha(SALE_RED, 0.4)}, 0 10px 30px rgba(0,0,0,0.75)`,
                            }}>
                                {price.original
                                    ? <Odometer from={price.original} to={price.current} t={lt} start={tickAt} dur={1.1} />
                                    : fmt(price.current)}
                            </span>
                            <span style={{ fontSize: Math.round(heroPriceFont * 0.42), fontWeight: 900 }}>원</span>
                        </div>
                        {price.savings > 0 && (
                            <div style={{
                                marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 10,
                                padding: '8px 20px', borderRadius: 14,
                                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
                                fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
                                opacity: clamp(savingsP * 1.5), transform: `translateY(${(1 - savingsP) * 14}px)`,
                            }}>
                                <span>{fmt(price.savings)}원 절약</span>
                                {price.atl === 'new' && <span style={{ color: GREEN }}>· 사상 최저</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Phase 2 스펙 카드 (y: 550~1120, x: 64..905 안전 영역) */}
                {dockP > 0.3 && (
                    <div style={{
                        position: 'absolute', left: 64, right: 175, top: 556,
                        display: 'flex', flexDirection: 'column', gap: 18,
                    }}>
                        {showSpecs.map((card, idx) => (
                            <StatCard
                                key={card.key}
                                showP={anim(lt, 2.48 + idx * 0.14, 0.42, ease.outExpo)}
                                accent={card.accent}
                                label={card.label}
                                mainText={card.mainText}
                                subText={card.subText}
                                leftSlot={card.leftSlot}
                            />
                        ))}
                    </div>
                )}

                {/* Phase 3 판정 배지 (y: 1140~1335, x: 64..905 안전 영역) */}
                {verdictP > 0 && (
                    <div style={{
                        position: 'absolute', left: 64, right: 175, top: 1146,
                        padding: '24px 28px', borderRadius: 26,
                        background: alpha(verdict.color, 0.15),
                        border: `2px solid ${alpha(verdict.color, 0.65)}`,
                        boxShadow: `0 18px 50px rgba(0,0,0,0.6), 0 0 60px ${alpha(verdict.color, 0.3)}`,
                        display: 'flex', alignItems: 'center', gap: 22,
                        opacity: clamp(verdictP * 1.8),
                        transform: `scale(${lerp(0.9, 1, verdictP)})`,
                    }}>
                        <PsSymbol
                            kind={verdict.symbol}
                            size={66}
                            color={verdict.color}
                            strokeWidth={9}
                            draw={anim(lt, verdictAt + 0.05, 0.35)}
                            glow={12}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 44, fontWeight: 900, color: verdict.color, lineHeight: 1.1 }}>
                                {verdict.label}
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginTop: 6, lineHeight: 1.3 }}>
                                {verdict.reason}
                            </div>
                        </div>
                    </div>
                )}

                {/* 마지막 게임 끝 1.4초: 아래 '관련 동영상' 링크 유도 포인터 (y: 1370) */}
                {isLast && ctaP > 0 && (
                    <div style={{
                        position: 'absolute', left: 64, right: 175, top: 1368,
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 22px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.32)',
                        opacity: clamp(ctaP * 1.5),
                        transform: `translateY(${(1 - ctaP) * 20}px)`,
                    }}>
                        <span style={{ fontSize: 24, color: NEUTRAL_ACCENT, fontWeight: 900 }}>▼</span>
                        <span style={{ fontSize: 23, fontWeight: 800, color: '#fff' }}>
                            전체 할인 분석은 아래 관련 동영상 · ps-signal.com
                        </span>
                    </div>
                )}
            </div>

            <Vignette />
            <Grain t={lt} />
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

    // 다음 게임으로의 쾌속 수직 와이프 (현재 슬롯 마지막 WIPE_DUR 동안 아래에서 위로 진입)
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
                    slideY={wipeEase * -120}
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
