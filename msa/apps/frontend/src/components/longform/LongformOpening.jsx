// YouTube 롱폼 영상 전체 오프닝 — /games/:id?view=longform-opening&ids=1742,442,...
//
// ids 순서대로 커버를 깔고, 마감일·게임 수·최대 할인율로 첫 몇 초 안에 영상의 가치를 보여준다.
// 첫 화면 이탈을 줄이기 위해 로고 스팅 없이 커버가 바로 날아드는 장면으로 시작한다.
// 렌더 계약(render=1, seek, manifest, durations=opening:12)은 GameLongformCard와 같다.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import client from '../../api/client';
import { STAGE_H, STAGE_W, alpha, anim, buildTimeline, clamp, ease, lerp, parseDurations, prog } from './engine';
import { BRAND_NAME, NEUTRAL_ACCENT, SALE_RED, cleanTitle, fmt } from './gameModel';
import { FONT_FAMILY, LF_CONTRACT_VERSION, posterSrc, useLongformRuntime, useStageScale } from './runtime';
import { Grain, KineticText, SignalMark } from './primitives';
import { riseIn, slideIn } from './motion';
import { Backdrop, Vignette } from './chrome';

const COVER_W = 214;
const COVER_H = 285;
const GREEN = '#22c55e';

function toOpeningGame(g) {
    return {
        id: g.id,
        title: cleanTitle(g.title),
        imageUrl: g.imageUrl,
        current: g.currentPrice,
        rate: g.discountRate > 0 ? g.discountRate : 0,
        atlNew: Boolean(g.isAllTimeLowNew),
        saleEndDate: g.saleEndDate || null,
    };
}

function buildOpeningFacts(games, now) {
    const endDate = games.map((g) => g.saleEndDate).filter(Boolean).sort()[0] ?? null;
    const daysLeft = endDate ? differenceInCalendarDays(parseISO(endDate), now) : null;
    return {
        count: games.length,
        saleEndDate: endDate,
        daysLeft: daysLeft !== null && daysLeft >= 0 ? daysLeft : null,
        maxDiscount: Math.max(0, ...games.map((g) => g.rate)),
        allTimeLowNewCount: games.filter((g) => g.atlNew).length,
        games: games.map((g) => ({ id: g.id, title: g.title, currentPrice: g.current, discountRate: g.rate })),
    };
}

function OpeningStage({ games, renderMode, freezeAt, durationsParam }) {
    const now = useMemo(() => new Date(), []);
    const facts = useMemo(() => buildOpeningFacts(games, now), [games, now]);
    const timeline = useMemo(() => buildTimeline(['opening'], parseDurations(durationsParam)), [durationsParam]);
    const dur = timeline.total;

    const manifest = useMemo(() => ({
        version: LF_CONTRACT_VERSION,
        kind: 'opening',
        width: STAGE_W,
        height: STAGE_H,
        total: dur,
        transition: 0,
        scenes: timeline.scenes.map((s) => ({ ...s, facts })),
        cues: [
            { t: 0, type: 'whoosh', scene: 'opening' },
            { t: 1.2, type: 'tick', scene: 'opening', duration: 0.6 },
            { t: 1.8, type: 'impact', scene: 'opening' },
            { t: 3.5, type: 'shine', scene: 'opening' },
            { t: Math.round((dur - 0.7) * 1000) / 1000, type: 'whoosh', scene: 'opening' },
        ],
    }), [dur, facts, timeline]);

    const imageUrls = useMemo(() => games.map((g) => g.imageUrl).filter(Boolean), [games]);
    const { t } = useLongformRuntime({ manifest, total: dur, imageUrls, renderMode, freezeAt });
    const scale = useStageScale(STAGE_W, STAGE_H);

    const accent = NEUTRAL_ACCENT;
    const exit = anim(t, dur - 0.7, 0.7, ease.inCubic);
    const endLabel = facts.saleEndDate
        ? `${Number(facts.saleEndDate.slice(5, 7))}월 ${Number(facts.saleEndDate.slice(8, 10))}일 마감`
        : '기간 한정 할인';
    const rowW = games.length * COVER_W + (games.length - 1) * 26;
    const rowX = (STAGE_W - rowW) / 2;
    const sweep = ((t - 3.5) % 3.2) / 1.1; // 3.2초마다 커버 위로 반사광이 지나감

    const chips = [
        facts.maxDiscount > 0 && { text: `최대 ${facts.maxDiscount}% 할인`, color: SALE_RED },
        facts.allTimeLowNewCount > 0 && { text: `역대 최저가 갱신 ${facts.allTimeLowNewCount}개`, color: GREEN },
    ].filter(Boolean);

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{
                position: 'relative', width: STAGE_W, height: STAGE_H, flexShrink: 0, overflow: 'hidden',
                transform: `scale(${scale})`, fontFamily: FONT_FAMILY, color: '#fff', userSelect: 'none', WebkitFontSmoothing: 'antialiased',
            }}>
                <Backdrop t={t} imageUrl={games[0]?.imageUrl} accent={accent} />

                <div style={{ position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.08, exit)})` }}>
                    {/* 헤드라인 */}
                    <div style={{ position: 'absolute', left: 120, top: 120, width: 1100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...riseIn(t, 0.1, 0.6, 16) }}>
                            <SignalMark height={22} />
                            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.75)' }}>
                                {BRAND_NAME.toUpperCase()}  ·  {endLabel}
                            </span>
                        </div>
                        <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em', marginTop: 18, textShadow: '0 8px 40px rgba(0,0,0,0.7)' }}>
                            <KineticText text="역대 최저가" t={t} start={0.3} stagger={0.04} dur={0.6} />
                            <br />
                            <KineticText text={`플스 명작 ${games.length}선`} t={t} start={0.55} stagger={0.04} dur={0.6} charStyle={{ color: accent }} />
                        </div>
                        <div style={{ fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 18, ...riseIn(t, 2.6, 0.7, 16) }}>
                            지금 사도 후회 없는 가격만 골랐어요
                        </div>
                    </div>

                    {/* 요약 칩 */}
                    <div style={{ position: 'absolute', right: 120, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
                        {chips.map((c, i) => (
                            <div key={c.text} style={{
                                padding: '14px 26px', borderRadius: 16, fontSize: 32, fontWeight: 900, color: c.color,
                                background: alpha(c.color === '#ffffff' ? '#ffffff' : c.color, c.color === '#ffffff' ? 0.08 : 0.14),
                                border: `1.5px solid ${alpha(c.color, 0.5)}`, boxShadow: `0 0 30px ${alpha(c.color, 0.2)}`,
                                ...slideIn(t, 1.8 + i * 0.15, 0.6, 80),
                            }}>
                                {c.text}
                            </div>
                        ))}
                    </div>

                    {/* 커버 라인업 */}
                    <div style={{ position: 'absolute', left: rowX, top: 600, width: rowW, height: COVER_H + 80, perspective: 1800 }}>
                        {games.map((g, i) => {
                            const fly = anim(t, i * 0.08, 0.9, ease.spring);
                            const bob = Math.sin(t * 1.1 + i * 0.9) * 6;
                            const badge = anim(t, 1.2 + i * 0.07, 0.45, ease.outBack);
                            const shineP = sweep - i * 0.08;
                            return (
                                <div key={g.id} style={{
                                    position: 'absolute', left: i * (COVER_W + 26), top: 0, width: COVER_W,
                                    transform: `translateY(${(1 - fly) * 520 + bob}px) rotateX(${(1 - fly) * 40 + 6}deg) rotateZ(${(1 - fly) * (i % 2 ? 8 : -8)}deg)`,
                                    opacity: clamp(fly * 2),
                                }}>
                                    <div style={{ position: 'relative', width: COVER_W, height: COVER_H, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', border: '1.5px solid rgba(255,255,255,0.18)' }}>
                                        {g.imageUrl && <img src={posterSrc(g.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />}
                                        {shineP > 0 && shineP < 1 && (
                                            <div style={{ position: 'absolute', top: -40, bottom: -40, width: 80, left: `${lerp(-60, 130, shineP)}%`, transform: 'skewX(-18deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
                                        )}
                                    </div>
                                    {g.rate > 0 && (
                                        <div style={{
                                            position: 'absolute', left: '50%', top: COVER_H - 26,
                                            transform: `translateX(-50%) scale(${lerp(1.8, 1, badge)})`, opacity: clamp(badge * 3),
                                            padding: '6px 16px', borderRadius: 12, background: SALE_RED, color: '#fff', fontSize: 30, fontWeight: 900,
                                            boxShadow: `0 8px 24px ${alpha(SALE_RED, 0.5)}`, whiteSpace: 'nowrap',
                                        }}>
                                            -{g.rate}%
                                        </div>
                                    )}
                                    <div style={{ marginTop: 40, textAlign: 'center', fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: clamp(badge) }}>
                                        {fmt(g.current)}원
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Vignette />
                <Grain t={t} />
                {exit > 0 && <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: exit }} />}
                {/* 첫 프레임부터 화면이 비지 않도록 아주 짧은 진입 페이드만 둔다 */}
                {t < 0.15 && <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 1 - prog(t, 0, 0.15) }} />}
            </div>
        </div>,
        document.body,
    );
}

/** ids 순서대로 게임을 불러온 뒤 스테이지를 띄운다 */
export default function LongformOpening({ firstGame }) {
    const { search } = useLocation();
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const idsParam = params.get('ids') || String(firstGame.id);
    const [games, setGames] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const ids = idsParam.split(',').map((s) => Number(s.trim())).filter(Boolean);
        Promise.all(ids.map((id) => (id === firstGame.id ? Promise.resolve(firstGame) : client.get(`/api/v1/games/${id}`).then((r) => r.data))))
            .then((list) => { if (!cancelled) setGames(list.map(toOpeningGame)); })
            .catch((e) => { if (!cancelled) setError(e); });
        return () => { cancelled = true; };
    }, [idsParam, firstGame]);

    if (error) {
        return <div style={{ color: '#fff', padding: 40 }}>오프닝용 게임 데이터를 불러오지 못했습니다: {String(error.message || error)}</div>;
    }
    if (!games) return null;
    return (
        <OpeningStage
            games={games}
            renderMode={params.get('render') === '1'}
            freezeAt={params.has('t') ? Number(params.get('t')) : null}
            durationsParam={params.get('durations')}
        />
    );
}
