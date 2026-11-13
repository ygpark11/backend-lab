// YouTube 롱폼 썸네일 — /games/:id?view=longform-thumbnail&ids=1742,442,...&main=442&label=파판7 리버스
//
// 1280x720 정지 이미지 1장을 찍기 위한 화면이다 (파이프라인이 스크린샷으로 저장).
// 목록에서 168px 폭으로 줄어들어도 읽히도록 요소를 셋으로 줄였다: 가격 / "역대 최저가 N선" / 대표 게임 커버.
// 표시 값은 모두 API 데이터다. "1위"·"사면 안 되는 게임" 같은 문구는 쓰지 않는다 (BUY_NOW만 다루는 영상이므로).
// PS 심볼은 판정 칩의 ○ 하나만 판정 색(초록)으로 쓴다.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import client from '../../api/client';
import { STAGE_H, STAGE_W, alpha } from './engine';
import { BRAND_NAME, NEUTRAL_ACCENT, SALE_RED, cleanTitle, fmt } from './gameModel';
import { FONT_FAMILY, LF_CONTRACT_VERSION, posterSrc, useLongformRuntime, useStageScale } from './runtime';
import { Grain, PsSymbol, SignalMark } from './primitives';
import { Backdrop, Vignette } from './chrome';

const GREEN = '#22c55e';
const POSTER_W = 580;
const POSTER_H = 773;

function toThumbGame(g) {
    return {
        id: g.id,
        title: cleanTitle(g.title),
        imageUrl: g.imageUrl,
        current: g.currentPrice,
        original: g.originalPrice,
        rate: g.discountRate > 0 ? g.discountRate : 0,
        atlNew: Boolean(g.isAllTimeLowNew),
        buyNow: g.priceVerdict === 'BUY_NOW',
        saleEndDate: g.saleEndDate || null,
    };
}

function ThumbnailStage({ games, main, label }) {
    const endDate = games.map((g) => g.saleEndDate).filter(Boolean).sort()[0] ?? null;
    const endLabel = endDate ? `${Number(endDate.slice(5, 7))}월 ${Number(endDate.slice(8, 10))}일 마감` : '기간 한정';
    const { id: mainId, current: currentPrice, rate: discountRate } = main;
    const gameCount = games.length;

    const manifest = useMemo(() => ({
        version: LF_CONTRACT_VERSION,
        kind: 'thumbnail',
        width: STAGE_W,
        height: STAGE_H,
        total: 1,
        transition: 0,
        scenes: [],
        cues: [],
        facts: { count: gameCount, saleEndDate: endDate, mainId, currentPrice, discountRate },
    }), [gameCount, endDate, mainId, currentPrice, discountRate]);

    const { ready } = useLongformRuntime({ manifest, total: 1, imageUrls: [main.imageUrl].filter(Boolean), renderMode: true, freezeAt: 0 });
    const scale = useStageScale(STAGE_W, STAGE_H);

    const priceText = fmt(main.current);
    const priceSize = Math.min(300, Math.round(1000 / (priceText.length * 0.52 + 0.9)));
    const name = label || main.title;

    return createPortal(
        <div data-thumbnail-ready={ready ? '1' : '0'} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{
                position: 'relative', width: STAGE_W, height: STAGE_H, flexShrink: 0, overflow: 'hidden',
                transform: `scale(${scale})`, fontFamily: FONT_FAMILY, color: '#fff', userSelect: 'none', WebkitFontSmoothing: 'antialiased',
            }}>
                <Backdrop t={6} imageUrl={main.imageUrl} accent={NEUTRAL_ACCENT} />

                {/* 좌측: 브랜드 / 마감 / 게임명 / 가격 / 헤드라인 */}
                <div style={{ position: 'absolute', left: 96, top: 84, width: 1100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                        <SignalMark height={34} />
                        <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.8)' }}>{BRAND_NAME.toUpperCase()}</span>
                        <span style={{
                            marginLeft: 10, padding: '8px 24px', borderRadius: 14, fontSize: 40, fontWeight: 900, color: SALE_RED,
                            background: alpha(SALE_RED, 0.16), border: `2px solid ${alpha(SALE_RED, 0.6)}`,
                        }}>{endLabel}</span>
                    </div>

                    <div style={{ marginTop: 48, fontSize: 76, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em', textShadow: '0 6px 30px rgba(0,0,0,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name}
                    </div>

                    {main.original > main.current && (
                        <div style={{ marginTop: 6, fontSize: 54, fontWeight: 800, color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through', textDecorationThickness: 4 }}>
                            {fmt(main.original)}원
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, lineHeight: 1, marginTop: -4 }}>
                        <span style={{ fontSize: priceSize, fontWeight: 900, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 80px ${alpha(SALE_RED, 0.45)}, 0 10px 40px rgba(0,0,0,0.75)` }}>{priceText}</span>
                        <span style={{ fontSize: Math.round(priceSize * 0.4), fontWeight: 900, textShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>원</span>
                    </div>

                    <div style={{ marginTop: 34, fontSize: 132, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', textShadow: '0 8px 40px rgba(0,0,0,0.7)' }}>
                        역대 최저가 <span style={{ color: NEUTRAL_ACCENT }}>{games.length}선</span>
                    </div>

                    {main.buyNow && (
                        <div style={{
                            marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 30px 12px 22px', borderRadius: 999,
                            background: alpha(GREEN, 0.16), border: `2px solid ${alpha(GREEN, 0.6)}`, fontSize: 50, fontWeight: 900, color: GREEN,
                        }}>
                            <PsSymbol kind="circle" size={54} color={GREEN} strokeWidth={9} />
                            지금 사세요
                        </div>
                    )}
                </div>

                {/* 우측: 대표 게임 커버 */}
                <div style={{ position: 'absolute', left: 1200, top: 150, width: POSTER_W, transform: 'rotate(4deg)' }}>
                    <div style={{ position: 'relative', width: POSTER_W, height: POSTER_H, borderRadius: 26, overflow: 'hidden', boxShadow: `0 40px 100px rgba(0,0,0,0.75), 0 0 160px ${alpha(NEUTRAL_ACCENT, 0.5)}`, border: '2px solid rgba(255,255,255,0.22)' }}>
                        {main.imageUrl && <img src={posterSrc(main.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />}
                    </div>
                    {main.rate > 0 && (
                        <div style={{
                            position: 'absolute', left: -70, bottom: 40, padding: '8px 32px', borderRadius: 24, background: SALE_RED, color: '#fff',
                            fontSize: 150, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, boxShadow: `0 16px 50px ${alpha(SALE_RED, 0.6)}`, transform: 'rotate(-4deg)',
                        }}>
                            -{main.rate}%
                        </div>
                    )}
                </div>

                <Vignette />
                <Grain t={0} />
            </div>
        </div>,
        document.body,
    );
}

/** ids로 게임을 불러와 대표 게임(main, 기본은 ids[0])으로 썸네일을 그린다 */
export default function LongformThumbnail({ firstGame }) {
    const { search } = useLocation();
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const idsParam = params.get('ids') || String(firstGame.id);
    const [games, setGames] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const ids = idsParam.split(',').map((s) => Number(s.trim())).filter(Boolean);
        Promise.all(ids.map((id) => (id === firstGame.id ? Promise.resolve(firstGame) : client.get(`/api/v1/games/${id}`).then((r) => r.data))))
            .then((list) => { if (!cancelled) setGames(list.map(toThumbGame)); })
            .catch((e) => { if (!cancelled) setError(e); });
        return () => { cancelled = true; };
    }, [idsParam, firstGame]);

    if (error) return <div style={{ color: '#fff', padding: 40 }}>썸네일용 게임 데이터를 불러오지 못했습니다: {String(error.message || error)}</div>;
    if (!games) return null;

    const mainId = Number(params.get('main')) || games[0].id;
    const main = games.find((g) => g.id === mainId) ?? games[0];
    return <ThumbnailStage games={games} main={main} label={params.get('label')} />;
}
