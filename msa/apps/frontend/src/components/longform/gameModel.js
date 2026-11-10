// 게임 API 응답 → 롱폼 영상에 쓰는 표시용 모델.
// 화면에 보이는 수치와 파이프라인 manifest(facts)가 반드시 같은 값을 쓰도록 이곳에서만 계산한다.
import { differenceInCalendarDays, parseISO } from 'date-fns';

// PS 심볼은 "가격신호등 판정"이라는 의미로만, 판정 색으로 하나씩 쓴다.
// 네 심볼을 컨트롤러 원색으로 묶어 로고·장식처럼 쓰지 않는다 (PlayStation 표장과 혼동 방지).
export const BRAND_NAME = 'PS Tracker';
export const SALE_RED = '#FF4D5E';
// 브랜드 마크(신호등 램프) 색 — 판정 색과 같은 체계
export const SIGNAL_LAMPS = ['#f87171', '#facc15', '#22c55e'];

// 판정 전 UI 강조색. 판정 공개 순간 verdict 색으로 전환된다
export const NEUTRAL_ACCENT = '#5B8CFF';

export const VERDICTS = {
    BUY_NOW:    { label: '지금 사세요', short: 'BUY NOW',   symbol: 'circle',   color: '#22c55e' },
    GOOD_OFFER: { label: '괜찮은 가격', short: 'GOOD DEAL', symbol: 'triangle', color: '#facc15' },
    WAIT:       { label: '기다리세요', short: 'WAIT',      symbol: 'cross',    color: '#f87171' },
    TRACKING:   { label: '추적 중',    short: 'TRACKING',  symbol: 'square',   color: '#60a5fa' },
};

const DEFENSE_TIERS = {
    S: { name: 'Platinum', desc: '거의 할인하지 않음', metal: ['#f4f4fb', '#a9a9c2', '#e6e6f2', '#7d7d96'] },
    A: { name: 'Gold',     desc: '할인에 보수적',     metal: ['#fff1b8', '#d4af37', '#ffe27a', '#8c6d12'] },
    B: { name: 'Silver',   desc: '가끔 할인',         metal: ['#f2f3f7', '#a8a9b4', '#d9dbe3', '#6b6c78'] },
    C: { name: 'Bronze',   desc: '주기적으로 할인',   metal: ['#ffd2a6', '#cd7f32', '#f0a868', '#7a4313'] },
    D: { name: 'Iron',     desc: '자주 할인됨',       metal: ['#e6b4ad', '#c0392b', '#e0675a', '#5e1a13'] },
    N: { name: 'New',      desc: '신규 출시',         metal: ['#b8fff4', '#2dd4bf', '#7debdc', '#0f6b60'] },
    '?': { name: 'Unrated', desc: '판단 데이터 부족', metal: ['#e5e7eb', '#9ca3af', '#d1d5db', '#4b5563'] },
};
const UNRATED_TIERS = ['등급 외', '분석 불가', '관측 중'];

export const fmt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('ko-KR'));
export const fmtDate = (s) => (s ? s.replace(/-/g, '.') : '');

/** "옥토패스 트래블러 0 (OCTOPATH TRAVELER 0) PS4 & PS5 (중국어(간체자), 한국어)" → "옥토패스 트래블러 0" */
export function cleanTitle(title) {
    if (!title) return '';
    let t = title;
    let prev;
    do {
        prev = t;
        t = t.replace(/\([^()]*\)/g, '');
    } while (t !== prev);
    t = t.replace(/\[?\s*PS[45][™®]?(\s*[&/]\s*PS[45][™®]?)?\s*\]?/gi, '');
    t = t.replace(/[™®]/g, '').replace(/\s+/g, ' ').trim().replace(/(?:-|:)\s*$/, '').trim();
    return t || title.trim();
}

/** 에디션 이름에서 본편 제목을 떼어 "Digital Deluxe Edition" / "기본판"만 남긴다 */
function editionLabel(name, baseTitle) {
    const clean = cleanTitle(name);
    const rest = clean.startsWith(baseTitle) ? clean.slice(baseTitle.length).trim() : clean;
    // 대괄호 문자 클래스 표기는 Tailwind가 임의 속성 클래스로 오인해 잘못된 CSS를 만들므로 그룹으로 쓴다
    return rest.replace(/^(?:-|:|·)\s*/, '') || '기본판';
}

function verdictReason(game) {
    const { priceVerdict: v, currentPrice: cur, lowestPrice: low, isAllTimeLowNew } = game;
    const gap = low > 0 ? cur - low : 0;
    if (v === 'BUY_NOW') {
        return isAllTimeLowNew ? '역대 최저가를 새로 썼습니다. 지금이 가장 싼 순간' : '역대 최저가와 같은 가격. 사도 되는 타이밍';
    }
    if (v === 'GOOD_OFFER') {
        return gap > 0 ? `역대 최저보다 ${fmt(gap)}원 비싸지만 충분히 좋은 가격` : '합리적인 가격. 급하면 사도 괜찮아요';
    }
    if (v === 'WAIT') {
        return gap > 0 ? `역대 최저 ${fmt(low)}원까지 ${fmt(gap)}원 더 내려간 적이 있어요` : '지금은 구매 타이밍이 아닙니다';
    }
    return '가격 데이터를 모으는 중. 알림을 걸어두세요';
}

/** 가격 이력 → 계단형 구간 [{ from, to, price, discounted }] (날짜는 ms) */
function buildSteps(history, endMs) {
    const sorted = (history ?? []).filter((h) => h?.date && h.price > 0).sort((a, b) => a.date.localeCompare(b.date));
    // 같은 가격이 연달아 기록된 경우(수집 재확인 등)는 하나의 구간으로 합친다
    const pts = sorted.filter((h, i) => i === 0 || h.price !== sorted[i - 1].price);
    return pts.map((h, i) => ({
        from: parseISO(h.date).getTime(),
        to: i < pts.length - 1 ? parseISO(pts[i + 1].date).getTime() : endMs,
        price: h.price,
        discounted: h.discountRate > 0,
        date: h.date,
    }));
}

/** 게임 데이터 → 표시 모델 (now는 렌더 기준 시각) */
export function buildModel(game, { now = new Date(), final = false, index = null, count = null } = {}) {
    const title = cleanTitle(game.title);
    const verdict = VERDICTS[game.priceVerdict] ?? VERDICTS.TRACKING;
    const nowMs = now.getTime();

    // ── 가격 ──
    const low = game.lowestPrice > 0 ? game.lowestPrice : null;
    const atl = game.isAllTimeLowNew ? 'new' : low && game.currentPrice <= low ? 'equal' : low ? 'above' : null;
    const daysLeft = game.saleEndDate && game.discountRate > 0
        ? differenceInCalendarDays(parseISO(game.saleEndDate), now)
        : null;
    const price = {
        current: game.currentPrice,
        original: game.originalPrice > game.currentPrice ? game.originalPrice : null,
        rate: game.discountRate > 0 ? game.discountRate : 0,
        savings: game.originalPrice > game.currentPrice ? game.originalPrice - game.currentPrice : 0,
        lowest: low,
        atl,
        gapToLowest: low && game.currentPrice > low ? game.currentPrice - low : 0,
        saleEndDate: game.saleEndDate || null,
        daysLeft: daysLeft !== null && daysLeft >= 0 ? daysLeft : null,
        steps: buildSteps(game.priceHistory, nowMs),
    };

    // ── 할인 방어력 ──
    const d = game.defenseInfo;
    const tierText = d?.tier ?? null;
    const tierKey = !tierText || UNRATED_TIERS.includes(tierText)
        ? '?'
        : tierText.includes('신작') ? 'N' : (DEFENSE_TIERS[tierText[0]] ? tierText[0] : '?');
    const defense = d && (d.discountCount > 0 || d.nextSaleEstimate) ? {
        tierText: tierText || '등급 외',
        tierKey,
        tier: DEFENSE_TIERS[tierKey],
        trackedMonths: d.trackedMonths > 0 ? d.trackedMonths : null,
        discountCount: d.discountCount > 0 ? d.discountCount : 0,
        maxRate: d.maxRate > 0 ? d.maxRate : null,
        monthsPerSale: d.monthsPerSale > 0 ? d.monthsPerSale : null,
        nextSale: d.nextSaleEstimate || null,
        nextSalePast: d.nextSaleEstimate ? parseISO(d.nextSaleEstimate).getTime() < nowMs : false,
        coldStart: Boolean(d.coldStartWarning),
        trackingStart: d.trackingStartDate || price.steps[0]?.date || null,
        saleDates: price.steps.filter((s) => s.discounted).map((s) => s.date),
    } : null;

    // ── 품질 (IGDB는 제거 예정이라 Metacritic + HLTB만 사용) ──
    const quality = (game.mcMetaScore > 0 || game.hltbMainStory > 0) ? {
        meta: game.mcMetaScore > 0 ? game.mcMetaScore : null,
        metaCount: game.mcMetaCount > 0 ? game.mcMetaCount : null,
        user: game.mcUserScore > 0 ? game.mcUserScore : null,
        userCount: game.mcUserCount > 0 ? game.mcUserCount : null,
        main: game.hltbMainStory > 0 ? Math.round(game.hltbMainStory) : null,
        extra: game.hltbMainExtra > 0 ? Math.round(game.hltbMainExtra) : null,
        complete: game.hltbCompletionist > 0 ? Math.round(game.hltbCompletionist) : null,
        perHour: game.hltbMainStory > 0 && game.currentPrice > 0 ? Math.round(game.currentPrice / game.hltbMainStory) : null,
        tags: (game.vibeTags ?? []).slice(0, 5).map((tag) => ({
            name: tag.name,
            color: /^#[0-9a-f]{6}$/i.test(tag.color ?? '') ? tag.color : '#9ca3af',
        })),
    } : null;

    // ── 에디션: editionContents가 있는 진짜 에디션만 (Upgrade/추가 콘텐츠 제외) ──
    const editions = (game.familyGames ?? [])
        .filter((e) => Array.isArray(e.editionContents) && e.editionContents.length > 0 && !/upgrade|업그레이드/i.test(e.name))
        .map((e) => ({
            id: e.id,
            label: editionLabel(e.name, title),
            current: e.currentPrice,
            original: e.originalPrice,
            rate: e.discountRate > 0 ? e.discountRate : 0,
            isCurrent: e.id === game.id,
            contents: e.editionContents.filter((c) => !cleanTitle(c).startsWith(title)).slice(0, 4),
        }))
        .sort((a, b) => a.original - b.original);
    let editionInsight = null;
    const me = editions.find((e) => e.isCurrent);
    if (me && editions.length > 1) {
        const higher = editions.filter((e) => e.original > me.original);
        const cheaperHigher = higher.find((e) => e.current <= me.current);
        const nearHigher = higher.find((e) => e.current - me.current > 0 && e.current - me.current <= 15000);
        if (cheaperHigher) {
            editionInsight = { tone: 'good', text: `상위 ${cheaperHigher.label}이 오히려 ${fmt(me.current - cheaperHigher.current)}원 더 저렴합니다` };
        } else if (nearHigher) {
            editionInsight = { tone: 'info', text: `${fmt(nearHigher.current - me.current)}원만 더 내면 ${nearHigher.label}` };
        } else if (higher.length) {
            const top = higher[higher.length - 1];
            editionInsight = { tone: 'neutral', text: `${top.label}과 차이 ${fmt(top.current - me.current)}원${top.rate ? '' : ' (할인 없음)'}` };
        }
    }
    const edition = editions.length > 1 ? { editions, insight: editionInsight } : null;

    const meta = {
        title,
        publisher: game.publisher || null,
        genre: game.genres?.[0] || null,
        platforms: game.platforms ?? [],
        releaseYear: game.releaseDate ? game.releaseDate.slice(0, 4) : null,
        imageUrl: game.imageUrl,
        inCatalog: Boolean(game.inCatalog),
        index,
        count,
    };

    const sceneIds = ['intro', 'price'];
    if (defense) sceneIds.push('defense');
    if (quality) sceneIds.push('quality');
    if (edition) sceneIds.push('edition');
    sceneIds.push('verdict');
    if (final) sceneIds.push('outro');

    return {
        gameId: game.id,
        nowMs,
        meta,
        verdict: { key: game.priceVerdict in VERDICTS ? game.priceVerdict : 'TRACKING', ...verdict, reason: verdictReason(game) },
        price,
        defense,
        quality,
        edition,
        sceneIds,
    };
}

/** 파이프라인이 내레이션 대본을 쓸 때 쓰는 씬별 사실값 (화면 표시값과 동일) */
export function sceneFacts(model, id) {
    const { meta, price, defense, quality, edition, verdict } = model;
    switch (id) {
        case 'intro':
            return { title: meta.title, publisher: meta.publisher, genre: meta.genre };
        case 'price':
            return {
                currentPrice: price.current, originalPrice: price.original, discountRate: price.rate,
                savings: price.savings, lowestPrice: price.lowest, allTimeLow: price.atl,
                gapToLowest: price.gapToLowest, saleEndDate: price.saleEndDate, daysLeft: price.daysLeft,
            };
        case 'defense':
            return {
                tier: defense.tierText, trackedMonths: defense.trackedMonths, discountCount: defense.discountCount,
                maxRate: defense.maxRate, monthsPerSale: defense.monthsPerSale && Math.round(defense.monthsPerSale * 10) / 10,
                nextSaleEstimate: defense.nextSale, coldStart: defense.coldStart,
            };
        case 'quality':
            return {
                metaScore: quality.meta, criticCount: quality.metaCount, userScore: quality.user,
                playtimeMain: quality.main, pricePerHour: quality.perHour, tags: quality.tags.map((t) => t.name),
            };
        case 'edition':
            return {
                editions: edition.editions.map((e) => ({ label: e.label, currentPrice: e.current, discountRate: e.rate, isCurrent: e.isCurrent })),
                insight: edition.insight?.text ?? null,
            };
        case 'verdict':
            return { verdict: verdict.key, label: verdict.label, reason: verdict.reason };
        default:
            return {};
    }
}

/**
 * 효과음 큐 — 파이프라인이 사운드 디자인을 자동 배치할 수 있도록 연출 시점을 내보낸다.
 * type: whoosh | riser | impact | impactBig | tick | chime | spin | flip | shine | sting
 */
export function buildCues(model, scenes) {
    const cues = [];
    const at = (scene, offset, type, extra = {}) => cues.push({ t: Math.round((scene.start + offset) * 1000) / 1000, type, scene: scene.id, ...extra });
    scenes.forEach((s, i) => {
        if (i > 0) at(s, -0.4, 'whoosh');
        if (s.id === 'intro') { at(s, 0, 'riser'); at(s, 1.15, 'impact'); }
        if (s.id === 'price') {
            if (model.price.original) at(s, 1.0, 'tick', { duration: 1.4 });
            if (model.price.rate) at(s, 2.4, 'impact');
            if (model.price.atl === 'new' || model.price.atl === 'equal') at(s, 4.7, 'chime');
        }
        if (s.id === 'defense') { at(s, 0.3, 'flip'); at(s, 1.5, 'shine'); }
        if (s.id === 'quality') at(s, 0.4, 'riser');
        if (s.id === 'edition') at(s, 0.5, 'tick', { duration: 1.2 });
        if (s.id === 'verdict') { at(s, 0.4, 'spin', { duration: 2.2 }); at(s, 2.6, 'impactBig'); }
        if (s.id === 'outro') at(s, 0.6, 'sting');
    });
    return cues;
}
