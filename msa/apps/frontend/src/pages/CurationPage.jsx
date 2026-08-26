import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlarmClock,
    ArrowUp,
    Banknote,
    Brain,
    Check,
    ChevronRight,
    Circle,
    Clock,
    Crosshair,
    Flame,
    Gamepad2,
    Heart,
    Layers,
    Map as MapIcon,
    Radio,
    Sparkles,
    Square,
    Triangle,
    Trophy,
    TrendingDown,
    Users,
    X as XIcon,
    Zap,
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import client from '../api/client';

// ─────────────────────────────────────────────
// 23개 큐레이션 테마 설정
// panel: 'xl' = 2칸 (Hero/Featured), 'md' = 1칸 (Standard)
// ─────────────────────────────────────────────
const THEMES = [
    // 1. 지갑 수호대 (Amber)
    {
        id: 4,
        panel: 'xl',
        Icon: TrendingDown,
        category: '지갑 수호대',
        copy: '역대 최저가 갓겜',
        subtitle: '지금이 진짜 살 때 — 역대 최저가 갱신 + 평점 75+ 명작',
        badge: 'TOP VALUE',
        color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' },
        params: { isAllTimeLow: true, minMetaScore: 75, sort: 'discountRate,desc' }
    },
    {
        id: 1,
        panel: 'md',
        Icon: Banknote,
        category: '지갑 수호대',
        copy: '국밥 한 그릇값 갓겜',
        subtitle: '1만원 이하로 즐기는 평점 75+ 가성비 명작',
        color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
        params: { maxPrice: 10000, minMetaScore: 75, sort: 'discountRate,desc' }
    },
    {
        id: 2,
        panel: 'md',
        Icon: Banknote,
        category: '지갑 수호대',
        copy: '2만원으로 30시간 뽑기',
        subtitle: '2만원 이하 + 플레이타임 30~100시간 보장',
        color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
        params: { maxPrice: 20000, minPlayTime: 30, maxPlayTime: 100, sort: 'discountRate,desc' }
    },
    {
        id: 3,
        panel: 'md',
        Icon: Banknote,
        category: '지갑 수호대',
        copy: '반값 이하 AAA 대작',
        subtitle: '50% 이상 파격 할인 + 평점 80+ 블록버스터',
        color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
        params: { minDiscountRate: 50, minMetaScore: 80, sort: 'discountRate,desc' }
    },

    // 2. 지금 아니면 끝 (Red - Closing Soon)
    {
        id: 5,
        panel: 'xl',
        Icon: AlarmClock,
        category: '지금 아니면 끝',
        copy: 'D-1 마감! 지금 안 사면 후회',
        subtitle: '오늘·내일 마감 임박 + 50% 이상 파격 할인 타이틀',
        badge: 'CLOSING SOON',
        isClosingSoon: true,
        color: { text: '#ef4444', glow: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.45)', bg: 'rgba(239,68,68,0.1)' },
        params: { isClosingSoon: true, minDiscountRate: 50, minMetaScore: 75, sort: 'saleEndDate,asc' }
    },

    // 3. 타임 매니지먼트 (Teal)
    {
        id: 6,
        panel: 'xl',
        Icon: Clock,
        category: '타임 매니지먼트',
        copy: '주말 정주행 팩 (10~30시간)',
        subtitle: '주말에 딱 끝낼 수 있는 깔끔한 볼륨 + 30% 이상 할인',
        badge: 'WEEKEND BINGE',
        color: { text: '#14b8a6', glow: 'rgba(20,184,166,0.18)', border: 'rgba(20,184,166,0.4)', bg: 'rgba(20,184,166,0.1)' },
        params: { minPlayTime: 10, maxPlayTime: 30, minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 7,
        panel: 'md',
        Icon: Clock,
        category: '타임 매니지먼트',
        copy: '엔딩까지 뽑아먹는 볼륨 갑 게임',
        subtitle: '3만원 이하 + 평점 75+ + 시간순삭 보장',
        color: { text: '#14b8a6', glow: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
        params: { vibeTags: ['#시간순삭', '#엔드콘텐츠빵빵'], maxPrice: 30000, minMetaScore: 75, sort: 'discountRate,desc' }
    },
    {
        id: 8,
        panel: 'md',
        Icon: Clock,
        category: '타임 매니지먼트',
        copy: '한 번 깨고 또 깨고: 다회차 중독',
        subtitle: '다회차 필수 + 유저 평점 8.0+ + 30% 이상 할인',
        color: { text: '#14b8a6', glow: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
        params: { vibeTags: ['#다회차필수'], minUserScore: 8.0, minDiscountRate: 30, sort: 'discountRate,desc' }
    },

    // 4. 권위 × 인증 (Purple)
    {
        id: 9,
        panel: 'xl',
        Icon: Trophy,
        category: '권위 × 인증',
        copy: '전문가·유저 만장일치 명작',
        subtitle: '메타스코어 85+ & 실플레이 유저 평점 8.5+ 동시 충족',
        badge: 'CRITICS & USERS',
        color: { text: '#a855f7', glow: 'rgba(168,85,247,0.18)', border: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.1)' },
        params: { minMetaScore: 85, minUserScore: 8.5, sort: 'discountRate,desc' }
    },
    {
        id: 10,
        panel: 'md',
        Icon: Trophy,
        category: '권위 × 인증',
        copy: '메타스코어 90점 클럽',
        subtitle: '역사가 증명하는 메타스코어 90+ 마스터피스 할인작',
        color: { text: '#a855f7', glow: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
        params: { minMetaScore: 90, minDiscountRate: 1, sort: 'discountRate,desc' }
    },

    // 5. PS 생태계 (PlayStation Blue)
    {
        id: 11,
        panel: 'xl',
        Icon: Gamepad2,
        category: 'PS 생태계',
        copy: 'PS Plus 지금 당장 넣어야 할 카탈로그 대작',
        subtitle: 'PS Plus 스페셜/디럭스 무료 카탈로그 + 평점 80+',
        badge: 'PS PLUS MUST-PLAY',
        color: { text: '#0070d1', glow: 'rgba(0,112,209,0.2)', border: 'rgba(0,112,209,0.45)', bg: 'rgba(0,112,209,0.1)' },
        params: { inCatalog: true, minMetaScore: 80, sort: 'discountRate,desc' }
    },
    {
        id: 12,
        panel: 'md',
        Icon: Sparkles,
        category: 'PS 생태계',
        copy: 'PS5 Pro 감각 총공략: 보고 듣는 즐거움',
        subtitle: 'PS5 Pro 향상 + 눈호강 그래픽 or 명품 OST',
        color: { text: '#0070d1', glow: 'rgba(0,112,209,0.15)', border: 'rgba(0,112,209,0.35)' },
        params: { isPs5ProEnhanced: true, vibeTags: ['#눈호강그래픽', '#명품OST'], minDiscountRate: 1, sort: 'discountRate,desc' }
    },

    // 6. AI 감성 취향 (Indigo)
    {
        id: 13,
        panel: 'xl',
        Icon: Flame,
        category: 'AI 감성 취향',
        copy: '패드 던질 준비됐어? 매운맛 챌린지',
        subtitle: '소울라이크 & 패드부숨 주의 명작 + 30% 이상 할인',
        badge: 'HARDCORE',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.4)', bg: 'rgba(99,102,241,0.1)' },
        params: { vibeTags: ['#소울라이크', '#패드부숨주의'], minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 14,
        panel: 'md',
        Icon: Brain,
        category: 'AI 감성 취향',
        copy: '오싹한데 왜 사고 싶지? 공포 명작',
        subtitle: '심리적 압박 & 기저귀 필수 공포 + 50% 이상 할인',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#기저귀필수', '#심리적압박', '#갑툭튀주의'], minDiscountRate: 50, sort: 'discountRate,desc' }
    },
    {
        id: 15,
        panel: 'md',
        Icon: Brain,
        category: 'AI 감성 취향',
        copy: '스토리에 미쳐라: 전문가 인증 서사 명작',
        subtitle: '세계관 맛집 & 영화 같은 스토리 + 평점 80+',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#세계관맛집', '#한편의영화', '#충격적반전'], minMetaScore: 80, sort: 'discountRate,desc' }
    },
    {
        id: 16,
        panel: 'md',
        Icon: Brain,
        category: 'AI 감성 취향',
        copy: '어둡고 묵직한 세계로: 다크 장르 특가',
        subtitle: '다크판타지·사이버펑크·포스트아포칼립스 + 30% 이상 할인',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#다크판타지', '#사이버펑크', '#포스트아포칼립스'], minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 17,
        panel: 'md',
        Icon: Sparkles,
        category: 'AI 감성 취향',
        copy: '일본 감성 물씬! 애니 스타일 명작 특가',
        subtitle: '애니메이션 풍 + 유저 평점 8.0+ + 3만원 이하',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#애니메이션풍'], minUserScore: 8.0, maxPrice: 30000, sort: 'discountRate,desc' }
    },
    {
        id: 19,
        panel: 'xl',
        Icon: MapIcon,
        category: 'AI 감성 취향',
        copy: '광활한 세계를 발로 누벼라',
        subtitle: '오픈월드 + 40시간 이상 방대한 모험 + 30% 이상 할인',
        badge: 'OPEN WORLD',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.4)', bg: 'rgba(99,102,241,0.1)' },
        params: { vibeTags: ['#오픈월드'], minPlayTime: 40, minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 20,
        panel: 'md',
        Icon: Zap,
        category: 'AI 감성 취향',
        copy: '손이 기억하는 타격감 갓겜',
        subtitle: '손맛 원탑 + 피지컬 요구 액션 + 30% 이상 할인',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#타격감원탑', '#피지컬요구'], minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 21,
        panel: 'md',
        Icon: Brain,
        category: 'AI 감성 취향',
        copy: '두뇌 풀가동: 전략·턴제 명작',
        subtitle: '전략적 선택 & 턴제 전투 + 평점 75+ + 30% 이상 할인',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#전략적선택', '#턴제전투'], minMetaScore: 75, minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 22,
        panel: 'md',
        Icon: Heart,
        category: 'AI 감성 취향',
        copy: '지친 하루 끝, 힐링 게임 특가',
        subtitle: '힐링 테라피 & 편안하게 즐기는 게임 + 30% 이상 할인',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#힐링테라피', '#뇌빼고가능'], minDiscountRate: 30, sort: 'discountRate,desc' }
    },
    {
        id: 23,
        panel: 'md',
        Icon: Crosshair,
        category: 'AI 감성 취향',
        copy: '방아쇠 당기면 해소되는 슈터 명작',
        subtitle: '총격전 맛집 + 평점 75+ + 30% 이상 할인',
        color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
        params: { vibeTags: ['#총격전맛집'], minMetaScore: 75, minDiscountRate: 30, sort: 'discountRate,desc' }
    },

    // 7. 같이 하면 더 재밌는 (Green - Co-op / Party)
    {
        id: 18,
        panel: 'xl',
        Icon: Users,
        category: '같이 하면 더 재밌는',
        copy: '같이 해서 더 재밌는 코옵 특가',
        subtitle: '접대용 최고 & 연인·친구와 함께 + 50% 이상 할인',
        badge: 'CO-OP & PARTY',
        color: { text: '#22c55e', glow: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
        params: { vibeTags: ['#접대용최고', '#연인과함께', '#우정파괴'], minDiscountRate: 50, sort: 'discountRate,desc' }
    },
];

// 카테고리별 그룹화 (THEMES 순서 보존)
const CATEGORIES = (() => {
    const map = new Map();
    THEMES.forEach(t => {
        if (!map.has(t.category)) map.set(t.category, []);
        map.get(t.category).push(t);
    });
    return Array.from(map.entries());
})();

// 카테고리 메타데이터 (아이콘 & 시그니처 컬러)
const CATEGORY_META = {
    '전체': { Icon: Sparkles, color: '#0070d1' },
    '지갑 수호대': { Icon: Banknote, color: '#f59e0b' },
    '지금 아니면 끝': { Icon: AlarmClock, color: '#ef4444' },
    '타임 매니지먼트': { Icon: Clock, color: '#14b8a6' },
    '권위 × 인증': { Icon: Trophy, color: '#a855f7' },
    'PS 생태계': { Icon: Gamepad2, color: '#0070d1' },
    'AI 감성 취향': { Icon: Brain, color: '#6366f1' },
    '같이 하면 더 재밌는': { Icon: Users, color: '#22c55e' },
};

function buildSearchParams(params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
            value.forEach(v => sp.append(key, v));
        } else {
            sp.append(key, value);
        }
    });
    return sp;
}

async function fetchThemeGames(params) {
    const sp = buildSearchParams({ ...params, size: 3, page: 0, curation: true });
    const res = await client.get('/api/v1/games/search?' + sp.toString());
    return {
        games: res.data.content || [],
        total: res.data.totalElements ?? 0,
    };
}

// ─────────────────────────────────────────────
// 스크롤 지연 로딩 훅
// ─────────────────────────────────────────────
function useScrollReveal(threshold = 0) {
    const [visible, setVisible] = useState(false);
    const observerRef = useRef(null);

    const ref = useCallback((el) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(el);
        observerRef.current = observer;
    }, [threshold]);

    return [ref, visible];
}

// ─────────────────────────────────────────────
// 🌟 Curator's Spotlight Banner (카테고리 연동 에디토리얼 쇼케이스)
// ─────────────────────────────────────────────
const spotlightCache = {};

function CuratorSpotlight({ theme, onViewAll }) {
    const cached = spotlightCache[theme?.id];
    const [fetchedData, setFetchedData] = useState({ games: [], total: 0, themeId: null });

    const currentData = cached || (fetchedData.themeId === theme?.id ? fetchedData : null);

    useEffect(() => {
        if (!theme || spotlightCache[theme.id]) return;

        let isMounted = true;
        fetchThemeGames({ ...theme.params, size: 3 })
            .then(({ games: themeGames, total: count }) => {
                const res = { games: themeGames, total: count, themeId: theme.id };
                spotlightCache[theme.id] = res;
                if (isMounted) {
                    setFetchedData(res);
                }
            })
            .catch(() => {
                const res = { games: [], total: 0, themeId: theme.id };
                spotlightCache[theme.id] = res;
                if (isMounted) {
                    setFetchedData(res);
                }
            });
        return () => { isMounted = false; };
    }, [theme]);

    if (!currentData) {
        return (
            <div className="w-full h-64 rounded-3xl bg-surface/80 animate-pulse border border-divider mb-8 sm:mb-10" />
        );
    }

    const { games, total } = currentData;

    if (games.length === 0) return null;

    const leadGame = games[0];
    const themeColor = theme.color || { text: '#f59e0b', glow: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' };

    return (
        <div
            onClick={() => onViewAll(theme.params, theme.copy)}
            className="relative overflow-hidden rounded-3xl cursor-pointer group bg-surface/95 dark:bg-surface/90 backdrop-blur-xl transition-all duration-500 transform-gpu shadow-xl mb-8 sm:mb-10 p-5 sm:p-8 lg:p-10 border hover:shadow-2xl"
            style={{ borderColor: themeColor.border }}
        >
            {/* 시네마틱 배경 */}
            <PSGameImage
                src={leadGame.imageUrl}
                alt=""
                width={800}
                className="absolute inset-0 w-full h-full object-cover opacity-15 dark:opacity-25 blur-sm scale-105 group-hover:scale-110 transition-transform duration-700 pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-base/95 via-base/80 to-base/40 pointer-events-none" />
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-500"
                style={{ background: `radial-gradient(circle at 80% 30%, ${themeColor.glow} 0%, transparent 60%)` }}
            />

            {/* 메인 레이아웃 */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
                {/* 좌측: 타이포그래피 & 카피 */}
                <div className="max-w-xl">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 sm:mb-4 backdrop-blur-md border shadow-sm"
                        style={{ background: themeColor.bg, borderColor: themeColor.border }}
                    >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" style={{ color: themeColor.text }} />
                        <span className="text-[11px] font-black tracking-wider uppercase" style={{ color: themeColor.text }}>
                            {theme.category} PICK
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: themeColor.text }} />
                        <span className="text-[10px] font-extrabold" style={{ color: themeColor.text }}>
                            {total > 0 ? `${total}개 타이틀` : '추천 컬렉션'}
                        </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary mb-2 sm:mb-3 leading-tight tracking-tight break-keep">
                        {theme.copy}
                    </h2>

                    <p className="text-secondary dark:text-zinc-300 text-xs sm:text-sm sm:text-base leading-relaxed break-keep mb-5 sm:mb-6">
                        {theme.subtitle}
                    </p>

                    <div
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all shadow-lg group-hover:translate-x-1 duration-300"
                        style={{ background: themeColor.text }}
                    >
                        <span>컬렉션 전체 확인하기</span>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* 우측: 3D 캐스케이딩 커버 아트 쇼케이스 */}
                <div className="flex items-center justify-center lg:justify-end gap-3 sm:gap-4 shrink-0 pt-2 lg:pt-0">
                    {games.map((g, idx) => (
                        <div
                            key={g.id}
                            className={`relative rounded-2xl overflow-hidden shadow-2xl border border-divider-strong transition-all duration-500 group-hover:scale-105 ${
                                idx === 0
                                    ? 'w-[95px] h-[130px] sm:w-[130px] sm:h-[175px] z-20 scale-105 shadow-lg'
                                    : idx === 1
                                    ? 'w-[80px] h-[110px] sm:w-[110px] sm:h-[150px] z-10 opacity-85 -ml-4 sm:-ml-6 rotate-3'
                                    : 'hidden sm:block w-[90px] h-[125px] z-0 opacity-70 -ml-6 -rotate-6'
                            }`}
                        >
                            <PSGameImage
                                src={g.imageUrl}
                                alt={g.name}
                                width={200}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// ThemePanel — 벤토 위젯 스타일 편집 카드
// ─────────────────────────────────────────────
function ThemePanel({ theme, onViewAll, onEmpty }) {
    const [games, setGames] = useState([]);
    const [total, setTotal] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [ref, visible] = useScrollReveal(0);
    const { Icon } = theme;

    useEffect(() => {
        if (!visible || loaded) return;
        fetchThemeGames(theme.params)
            .then(({ games: data, total: count }) => {
                setGames(data);
                setTotal(count);
                setLoaded(true);
                if (data.length === 0) onEmpty?.();
            })
            .catch(() => { setLoaded(true); onEmpty?.(); });
    }, [theme, visible, loaded]);

    if (loaded && games.length === 0) return null;

    const isHero = theme.panel === 'xl';
    const colSpan = isHero ? 'col-span-2' : 'col-span-1';
    const minHeight = isHero
        ? 'min-h-[240px] sm:min-h-[270px]'
        : 'min-h-[185px] sm:min-h-[220px]';

    if (!loaded) {
        return (
            <div
                ref={ref}
                className={`${colSpan} ${minHeight} rounded-2xl bg-surface/80 animate-pulse border border-divider`}
            />
        );
    }

    return (
        <div
            ref={ref}
            onClick={onViewAll}
            className={`
                relative overflow-hidden rounded-2xl cursor-pointer group
                bg-surface/95 dark:bg-surface/90 backdrop-blur-xl border
                active:scale-[0.98] sm:hover:-translate-y-1
                transition-all duration-300 transform-gpu shadow-md
                ${colSpan} ${minHeight}
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
            style={{ borderColor: theme.color.border }}
        >
            {/* Hero (xl): 1위 게임 시네마틱 아트워크 배경 */}
            {isHero && games.length > 0 && (
                <>
                    <PSGameImage
                        src={games[0].imageUrl}
                        alt=""
                        width={640}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-35 blur-[2px] scale-105 group-hover:scale-110 transition-transform duration-700 pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-base/95 via-base/70 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-base/60 via-transparent to-transparent pointer-events-none" />
                </>
            )}

            {/* 테마 배경 네온 그라디언트 */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse at top left, ${theme.color.glow} 0%, transparent 70%)` }}
            />
            {/* Hover 시 글로우 강조 */}
            <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse at top left, ${theme.color.glow} 0%, transparent 60%)` }}
            />

            {/* 대형 배경 워터마크 아이콘 */}
            <Icon
                className="absolute -bottom-2 -right-2 opacity-[0.05] group-hover:opacity-[0.12] -rotate-12 group-hover:rotate-0 transition-all duration-500 pointer-events-none select-none"
                style={{ color: theme.color.text, width: isHero ? '120px' : '90px', height: isHero ? '120px' : '90px' }}
            />

            {/* Hover 테두리 발광 */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1.5px ${theme.color.text}, 0 0 24px ${theme.color.glow}` }}
            />

            {/* 콘텐츠 영역 */}
            <div className="relative z-10 p-4 sm:p-5 h-full flex flex-col justify-between gap-3">
                {/* 1. 상단: 카테고리 뱃지 + LIVE/추천 태그 + 게임 수 */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                            style={{ background: theme.color.glow, borderColor: theme.color.border }}
                        >
                            <Icon className="w-3.5 h-3.5" style={{ color: theme.color.text }} />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase truncate" style={{ color: theme.color.text }}>
                            {theme.category}
                        </span>
                        {theme.badge && (
                            <span
                                className="hidden sm:inline-block text-[9px] font-black px-1.5 py-0.5 rounded border"
                                style={{ color: theme.color.text, borderColor: theme.color.border, background: theme.color.glow }}
                            >
                                {theme.badge}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {theme.isClosingSoon && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                                </span>
                                LIVE
                            </span>
                        )}
                        {total > 0 && (
                            <span
                                className="text-[10px] font-black px-2 py-0.5 rounded-full border shadow-sm"
                                style={{ background: theme.color.glow, color: theme.color.text, borderColor: theme.color.border }}
                            >
                                {total > 99 ? '99+' : total}개
                            </span>
                        )}
                        <ChevronRight
                            className="w-4 h-4 sm:group-hover:translate-x-0.5 transition-transform duration-200"
                            style={{ color: theme.color.text }}
                        />
                    </div>
                </div>

                {/* 2. 중단: 타이틀 + 서브타이틀 */}
                <div className="flex-1 my-auto">
                    <h3 className={`font-black text-primary leading-tight mb-1.5 break-keep
                        ${isHero ? 'text-lg sm:text-2xl md:text-[1.6rem]' : 'text-base sm:text-lg'}`}>
                        {theme.copy}
                    </h3>
                    <p className="text-secondary dark:text-zinc-300 text-xs sm:text-sm leading-snug break-keep line-clamp-2">
                        {theme.subtitle}
                    </p>
                </div>

                {/* 3. 하단: 게임 커버 썸네일 스트립 */}
                {games.length > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-divider/50">
                        <div className="flex items-center gap-2">
                            {games.slice(0, 3).map((game) => (
                                <div
                                    key={game.id}
                                    className="relative w-[38px] h-[50px] sm:w-[46px] sm:h-[60px] rounded-lg overflow-hidden shrink-0 shadow-sm border border-divider hover:border-divider-strong group/thumb transition-transform"
                                >
                                    <PSGameImage
                                        src={game.imageUrl}
                                        alt={game.name}
                                        width={100}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                                    />
                                </div>
                            ))}
                        </div>

                        <span className="text-[11px] font-bold text-secondary dark:text-zinc-400 flex items-center gap-0.5 group-hover:text-primary transition-colors">
                            전체보기 <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// CategorySection — 카테고리별 챕터 섹션
// ─────────────────────────────────────────────
function CategorySection({ categoryName, themes, onViewAll }) {
    const [ref, visible] = useScrollReveal(0.04);
    const [emptyCount, setEmptyCount] = useState(0);
    const handleEmpty = useCallback(() => setEmptyCount(c => c + 1), []);

    const categoryColor = themes[0]?.color;
    const CategoryIcon = themes[0]?.Icon;

    if (emptyCount >= themes.length) return null;

    return (
        <section
            id={`category-${categoryName}`}
            ref={ref}
            className={`transition-all duration-700 scroll-mt-28 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
            {/* 챕터 헤더 */}
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 shrink-0">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm"
                        style={{ background: categoryColor?.glow, borderColor: categoryColor?.border }}
                    >
                        {CategoryIcon && <CategoryIcon className="w-4 h-4 shrink-0" style={{ color: categoryColor?.text }} />}
                    </div>
                    <h2 className="text-primary font-black text-base sm:text-lg tracking-tight">{categoryName}</h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-divider via-divider/40 to-transparent" />
            </div>

            {/* 벤토 패널 그리드 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {themes.map(theme => (
                    <ThemePanel
                        key={theme.id}
                        theme={theme}
                        onViewAll={() => onViewAll(theme.params, theme.copy)}
                        onEmpty={handleEmpty}
                    />
                ))}
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// CurationPage 메인 컴포넌트
// ─────────────────────────────────────────────
const CurationPage = () => {
    const navigate = useTransitionNavigate();
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const isManualScrollRef = useRef(false);
    const tabsContainerRef = useRef(null);

    const handleViewAll = (params, themeCopy) => {
        const sp = buildSearchParams(params);
        sp.set('curation', 'true');
        if (themeCopy) sp.set('curationTheme', themeCopy);
        navigate('/games?' + sp.toString());
    };

    const handleCategoryClick = (categoryName) => {
        isManualScrollRef.current = true;
        setSelectedCategory(categoryName);

        if (categoryName === '전체') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const targetEl = document.getElementById(`category-${categoryName}`);
            if (targetEl) {
                const headerOffset = 130;
                const elementPosition = targetEl.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }

        setTimeout(() => {
            isManualScrollRef.current = false;
        }, 600);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 🔭 Scroll-Spy: 스크롤 위치에 따른 실시간 탭 활성화 & 맨 위로 가기 버튼 노출 (스로틀링 적용)
    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    setShowBackToTop(scrollY > 400);

                    if (!isManualScrollRef.current) {
                        if (scrollY < 300) {
                            setSelectedCategory('전체');
                        } else {
                            let currentCat = '전체';
                            for (const [categoryName] of CATEGORIES) {
                                const el = document.getElementById(`category-${categoryName}`);
                                if (el) {
                                    const top = el.getBoundingClientRect().top;
                                    if (top <= 200) {
                                        currentCat = categoryName;
                                    }
                                }
                            }
                            setSelectedCategory(currentCat);
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 🎯 활성 탭 변경 시 탭 컨테이너 내부만 가로 스크롤 (윈도우 가로 스크롤 오동작 완전 방지)
    useEffect(() => {
        const container = tabsContainerRef.current;
        const activeTabEl = document.getElementById(`tab-btn-${selectedCategory}`);
        if (container && activeTabEl) {
            const targetLeft = activeTabEl.offsetLeft - (container.clientWidth / 2) + (activeTabEl.clientWidth / 2);
            container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
        }
    }, [selectedCategory]);

    // 모든 카테고리를 유지하여 탭 점프 시 높이 붕괴(Layout Shift)를 방지

    // 🎯 선택된 카테고리에 맞춰 스포트라이트 배너의 대표 테마를 동적으로 결정
    const spotlightTheme = selectedCategory === '전체'
        ? THEMES[0]
        : (THEMES.find(t => t.category === selectedCategory && t.panel === 'xl') ||
           THEMES.find(t => t.category === selectedCategory) ||
           THEMES[0]);

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-base text-primary pt-24 pb-24 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
            <SEO
                title="큐레이션"
                description="데이터로 검증된 PS 게임 테마 큐레이션 — 지금 사야 할 게임을 찾아드립니다."
                url="https://ps-signal.com/curation"
            />

            {/* PlayStation 심볼 워터마크 */}
            <div className="absolute top-20 right-8 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary select-none">
                <Triangle className="w-40 h-40 stroke-[2px]" />
                <Circle className="w-40 h-40 stroke-[2px]" />
                <XIcon className="w-40 h-40 stroke-[2px]" />
                <Square className="w-40 h-40 stroke-[2px]" />
            </div>

            {/* Atmospheric Aurora 배경 (GPU 가속) */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[10%] left-[5%] w-[35%] h-[35%] rounded-full blur-[120px] bg-blue-500/5 dark:bg-blue-500/8 md:animate-[pulse_10s_ease-in-out_infinite] will-change-transform transform-gpu" />
                <div className="absolute bottom-[15%] right-[5%] w-[30%] h-[30%] rounded-full blur-[100px] bg-purple-500/5 dark:bg-purple-500/8 md:animate-[pulse_8s_ease-in-out_infinite] will-change-transform transform-gpu" />
            </div>

            <div className="max-w-6xl mx-auto">
                {/* 1. 페이지 헤더 (Luminous Curation Radar) */}
                <div className="mb-6 sm:mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/90 border border-divider-strong mb-3 backdrop-blur-md shadow-sm">
                        <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                        <span className="text-[11px] font-black tracking-widest uppercase text-secondary dark:text-zinc-300">
                            PS-TRACKER CURATION RADAR
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary mb-3 leading-tight tracking-tight break-keep">
                        테마로 찾는 지금의{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500">
                            PICK
                        </span>
                    </h1>

                    <p className="text-secondary dark:text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed break-keep mb-5">
                        데이터가 검증한 23개의 맞춤형 컬렉션 — 역대 최저가, 플레이타임, AI 감성 태그를 통해 나만의 인생작을 발견하세요.
                    </p>

                    {/* 핵심 요약 칩 (인포그래픽) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-secondary dark:text-zinc-400">
                        <span className="flex items-center gap-1.5 bg-surface/80 border border-divider px-2.5 py-1 rounded-lg">
                            <Radio className="w-3.5 h-3.5 text-ps-blue animate-pulse" /> 23개 맞춤 테마
                        </span>
                        <span className="flex items-center gap-1.5 bg-surface/80 border border-divider px-2.5 py-1 rounded-lg">
                            <Zap className="w-3.5 h-3.5 text-amber-400" /> 실시간 할인율 반영
                        </span>
                        <span className="flex items-center gap-1.5 bg-surface/80 border border-divider px-2.5 py-1 rounded-lg">
                            <Brain className="w-3.5 h-3.5 text-indigo-400" /> AI 감성 & 플레이타임
                        </span>
                    </div>
                </div>

                {/* 🌟 2. Curator's Spotlight Banner (카테고리 탭 연동 쇼케이스) */}
                <CuratorSpotlight
                    theme={spotlightTheme}
                    onViewAll={handleViewAll}
                />

                {/* 3. 스티키 카테고리 퀵 점프 탭바 */}
                <div className="sticky top-16 z-30 mb-8 py-2.5 bg-base/90 backdrop-blur-xl border-y border-divider/60 rounded-2xl px-2 sm:px-3 shadow-sm">
                    <div ref={tabsContainerRef} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                        {/* '전체' 탭 (버그 수정: bg-ps-blue text-white 적용) */}
                        <button
                            id="tab-btn-전체"
                            onClick={() => handleCategoryClick('전체')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 shadow-sm ${
                                selectedCategory === '전체'
                                    ? 'bg-ps-blue text-white shadow-ps-blue/30 scale-105 ring-1 ring-ps-blue'
                                    : 'bg-surface/80 text-secondary hover:text-primary hover:bg-surface border border-divider'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>전체</span>
                            <span className={`text-[10px] px-1 rounded ${selectedCategory === '전체' ? 'bg-black/20 text-white' : 'text-muted'}`}>
                                {THEMES.length}
                            </span>
                        </button>

                        {/* 개별 카테고리 탭 */}
                        {CATEGORIES.map(([categoryName, themes]) => {
                            const meta = CATEGORY_META[categoryName] || { Icon: Sparkles, color: '#a7c8ff' };
                            const TabIcon = meta.Icon;
                            const isSelected = selectedCategory === categoryName;

                            return (
                                <button
                                    key={categoryName}
                                    id={`tab-btn-${categoryName}`}
                                    onClick={() => handleCategoryClick(categoryName)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'text-white font-black shadow-sm scale-105'
                                            : 'bg-surface/80 text-secondary hover:text-primary hover:bg-surface border border-divider'
                                    }`}
                                    style={isSelected ? { background: meta.color } : {}}
                                >
                                    <TabIcon className="w-3.5 h-3.5" style={{ color: isSelected ? '#ffffff' : meta.color }} />
                                    <span>{categoryName}</span>
                                    <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-black/20 text-white' : 'text-muted'}`}>
                                        {themes.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 4. 카테고리 챕터 목록 */}
                <div className="flex flex-col gap-10 sm:gap-14">
                    {CATEGORIES.map(([categoryName, themes]) => (
                        <CategorySection
                            key={categoryName}
                            categoryName={categoryName}
                            themes={themes}
                            onViewAll={handleViewAll}
                        />
                    ))}
                </div>
            </div>

            {/* 🚀 플로팅 맨 위로 가기 (Back to Top) 버튼 */}
            <button
                onClick={scrollToTop}
                className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface/90 dark:bg-surface/95 backdrop-blur-xl border border-divider hover:border-ps-blue text-primary shadow-xl hover:shadow-2xl transition-all duration-300 transform-gpu active:scale-95 ${
                    showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
                aria-label="맨 위로 가기"
            >
                <div className="w-5 h-5 rounded-full bg-ps-blue/10 flex items-center justify-center text-ps-blue">
                    <ArrowUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black tracking-tight">맨 위로</span>
            </button>
        </div>
    );
};

export default CurationPage;
