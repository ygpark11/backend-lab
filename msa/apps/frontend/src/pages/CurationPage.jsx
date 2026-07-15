import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlarmClock, Banknote, Brain, ChevronRight, Circle, Clock, Crosshair,
    Flame, Gamepad2, Heart, Map as MapIcon, Sparkles, Square, Triangle, Trophy,
    TrendingDown, Users, X as XIcon, Zap,
} from 'lucide-react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import client from '../api/client';

// ─────────────────────────────────────────────
// 테마 설정
// panel: 'xl' = 2칸 (featured), 'md' = 1칸 (기본)
// ─────────────────────────────────────────────
const THEMES = [
    // 지갑 수호대
    { id: 4,  panel: 'xl', Icon: TrendingDown, category: '지갑 수호대',
      copy: '역대 최저가 갓겜', subtitle: '지금이 진짜 살 때 — 역대 최저가 + 평점 75+',
      color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
      params: { isAllTimeLow: true, minMetaScore: 75, sort: 'discountRate,desc' } },
    { id: 1,  panel: 'md', Icon: Banknote, category: '지갑 수호대',
      copy: '국밥 한 그릇값 갓겜', subtitle: '1만원 이하, 평점 75+ 명작',
      color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
      params: { maxPrice: 10000, minMetaScore: 75, sort: 'discountRate,desc' } },
    { id: 2,  panel: 'md', Icon: Banknote, category: '지갑 수호대',
      copy: '2만원으로 30시간 뽑기', subtitle: '2만원 이하 + 플레이타임 30~100시간',
      color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
      params: { maxPrice: 20000, minPlayTime: 30, maxPlayTime: 100, sort: 'discountRate,desc' } },
    { id: 3,  panel: 'md', Icon: Banknote, category: '지갑 수호대',
      copy: '반값 이하 AAA 대작', subtitle: '50% 이상 할인 + 평점 80+ 명작',
      color: { text: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
      params: { minDiscountRate: 50, minMetaScore: 80, sort: 'discountRate,desc' } },

    // 지금 아니면 끝
    { id: 5,  panel: 'xl', Icon: AlarmClock, category: '지금 아니면 끝',
      copy: 'D-1 마감! 지금 안 사면 후회', subtitle: '오늘·내일 마감 + 50% 이상 할인',
      isClosingSoon: true,
      color: { text: '#ef4444', glow: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
      params: { isClosingSoon: true, minDiscountRate: 50, minMetaScore: 75, sort: 'saleEndDate,asc' } },

    // 타임 매니지먼트
    { id: 6,  panel: 'md', Icon: Clock, category: '타임 매니지먼트',
      copy: '주말 정주행 팩 (10~30시간)', subtitle: '주말에 딱 깰 수 있는 볼륨 + 30% 이상 할인',
      color: { text: '#14b8a6', glow: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
      params: { minPlayTime: 10, maxPlayTime: 30, minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 7,  panel: 'md', Icon: Clock, category: '타임 매니지먼트',
      copy: '엔딩까지 뽑아먹는 볼륨 갑 게임', subtitle: '3만원 이하 + 평점 75+ + 시간순삭 보장',
      color: { text: '#14b8a6', glow: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
      params: { vibeTags: ['#시간순삭', '#엔드콘텐츠빵빵'], maxPrice: 30000, minMetaScore: 75, sort: 'discountRate,desc' } },
    { id: 8,  panel: 'md', Icon: Clock, category: '타임 매니지먼트',
      copy: '한 번 깨고 또 깨고: 다회차 중독', subtitle: '다회차 필수 + 유저 평점 8.0+ + 30% 이상 할인',
      color: { text: '#14b8a6', glow: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
      params: { vibeTags: ['#다회차필수'], minUserScore: 8.0, minDiscountRate: 30, sort: 'discountRate,desc' } },

    // 권위 × 인증
    { id: 9,  panel: 'md', Icon: Trophy, category: '권위 × 인증',
      copy: '전문가·유저 만장일치 명작', subtitle: '메타스코어 85+ + 유저 평점 8.5+',
      color: { text: '#a855f7', glow: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
      params: { minMetaScore: 85, minUserScore: 8.5, sort: 'discountRate,desc' } },
    { id: 10, panel: 'md', Icon: Trophy, category: '권위 × 인증',
      copy: '메타스코어 90점 클럽', subtitle: '할인 중인 메타스코어 90+ 명작',
      color: { text: '#a855f7', glow: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
      params: { minMetaScore: 90, minDiscountRate: 1, sort: 'discountRate,desc' } },

    // PS 생태계
    { id: 11, panel: 'md', Icon: Gamepad2, category: 'PS 생태계',
      copy: 'PS Plus 지금 당장 넣어야 할 카탈로그 대작', subtitle: 'PS Plus 카탈로그 + 평점 80+',
      color: { text: '#0070d1', glow: 'rgba(0,112,209,0.12)', border: 'rgba(0,112,209,0.3)' },
      params: { inCatalog: true, minMetaScore: 80, sort: 'discountRate,desc' } },
    { id: 12, panel: 'md', Icon: Gamepad2, category: 'PS 생태계',
      copy: 'PS5 Pro 감각 총공략: 보고 듣는 즐거움', subtitle: 'PS5 Pro 향상 + 눈호강 or 명품 OST',
      color: { text: '#0070d1', glow: 'rgba(0,112,209,0.12)', border: 'rgba(0,112,209,0.3)' },
      params: { isPs5ProEnhanced: true, vibeTags: ['#눈호강그래픽', '#명품OST'], minDiscountRate: 1, sort: 'discountRate,desc' } },

    // AI 감성 취향
    { id: 13, panel: 'xl', Icon: Flame, category: 'AI 감성 취향',
      copy: '패드 던질 준비됐어? 매운맛 챌린지', subtitle: '소울라이크 & 패드부숨 명작 + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#소울라이크', '#패드부숨주의'], minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 14, panel: 'md', Icon: Brain, category: 'AI 감성 취향',
      copy: '오싹한데 왜 사고 싶지? 공포 명작', subtitle: '공포 장르 명작 + 50% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#기저귀필수', '#심리적압박', '#갑툭튀주의'], minDiscountRate: 50, sort: 'discountRate,desc' } },
    { id: 15, panel: 'md', Icon: Brain, category: 'AI 감성 취향',
      copy: '스토리에 미쳐라: 전문가 인증 서사 명작', subtitle: '세계관 맛집 & 감동 서사 + 평점 80+',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#세계관맛집', '#한편의영화', '#충격적반전'], minMetaScore: 80, sort: 'discountRate,desc' } },
    { id: 16, panel: 'md', Icon: Brain, category: 'AI 감성 취향',
      copy: '어둡고 묵직한 세계로: 다크 장르 특가', subtitle: '다크판타지·사이버펑크·포스트아포칼립스 + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#다크판타지', '#사이버펑크', '#포스트아포칼립스'], minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 17, panel: 'md', Icon: Sparkles, category: 'AI 감성 취향',
      copy: '일본 감성 물씬! 애니 스타일 명작 특가', subtitle: '애니메이션 풍 + 유저 평점 8.0+ + 3만원 이하',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#애니메이션풍'], minUserScore: 8.0, maxPrice: 30000, sort: 'discountRate,desc' } },

    // 같이 하면 더 재밌는
    { id: 18, panel: 'xl', Icon: Users, category: '같이 하면 더 재밌는',
      copy: '같이 해서 더 재밌는 코옵 특가', subtitle: '코옵·파티 게임 + 50% 이상 할인',
      color: { text: '#22c55e', glow: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
      params: { vibeTags: ['#접대용최고', '#연인과함께', '#우정파괴'], minDiscountRate: 50, sort: 'discountRate,desc' } },

    // AI 감성 취향 추가
    { id: 19, panel: 'xl', Icon: MapIcon, category: 'AI 감성 취향',
      copy: '광활한 세계를 발로 누벼라', subtitle: '오픈월드 + 40시간 이상 + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#오픈월드'], minPlayTime: 40, minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 20, panel: 'md', Icon: Zap, category: 'AI 감성 취향',
      copy: '손이 기억하는 타격감 갓겜', subtitle: '타격감 + 피지컬 요구 + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#타격감원탑', '#피지컬요구'], minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 21, panel: 'md', Icon: Brain, category: 'AI 감성 취향',
      copy: '두뇌 풀가동: 전략·턴제 명작', subtitle: '전략적 선택 & 턴제 전투 + 평점 75+ + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#전략적선택', '#턴제전투'], minMetaScore: 75, minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 22, panel: 'md', Icon: Heart, category: 'AI 감성 취향',
      copy: '지친 하루 끝, 힐링 게임 특가', subtitle: '힐링 & 가볍게 즐기는 게임 + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#힐링테라피', '#뇌빼고가능'], minDiscountRate: 30, sort: 'discountRate,desc' } },
    { id: 23, panel: 'md', Icon: Crosshair, category: 'AI 감성 취향',
      copy: '방아쇠 당기면 해소되는 슈터 명작', subtitle: '총격전 맛집 + 평점 75+ + 30% 이상 할인',
      color: { text: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
      params: { vibeTags: ['#총격전맛집'], minMetaScore: 75, minDiscountRate: 30, sort: 'discountRate,desc' } },
];

// 카테고리별로 그룹화 (THEMES 순서 보존)
const CATEGORIES = (() => {
    const map = new Map();
    THEMES.forEach(t => {
        if (!map.has(t.category)) map.set(t.category, []);
        map.get(t.category).push(t);
    });
    return Array.from(map.entries());
})();

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
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
// 스크롤 reveal hook
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
// ThemePanel — 벤토 위젯 스타일 편집 카드
// 테마 색상 + 아이콘 워터마크가 주인공, 게임 커버는 하단 썸네일 스트립
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

    const colSpan = theme.panel === 'xl' ? 'col-span-2' : 'col-span-1';
    // xl: 모바일에서도 md보다 뚜렷하게 크게 — featured 위계 유지
    const minHeight = theme.panel === 'xl'
        ? 'min-h-[230px] sm:min-h-[260px]'
        : 'min-h-[175px] sm:min-h-[210px]';

    // 로드 전: 실제 높이 확보한 스켈레톤
    if (!loaded) {
        return (
            <div
                ref={ref}
                className={`${colSpan} ${minHeight} rounded-2xl bg-surface animate-pulse border border-divider`}
            />
        );
    }

    return (
        <div
            ref={ref}
            onClick={onViewAll}
            className={`
                relative overflow-hidden rounded-2xl cursor-pointer group
                ${theme.panel === 'xl' ? 'bg-base' : 'bg-surface'}
                active:scale-95 sm:hover:-translate-y-0.5
                transition-[opacity,transform,box-shadow] duration-300
                ${colSpan} ${minHeight}
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
            `}
            style={{ border: `1px solid ${theme.color.border}` }}
        >
            {/* xl: 시네마틱 게임 커버 배경 */}
            {theme.panel === 'xl' && games.length > 0 && (
                <>
                    <PSGameImage
                        src={games[0].imageUrl}
                        alt=""
                        width={640}
                        className="absolute inset-0 w-full h-full object-cover opacity-25 dark:opacity-40 blur-sm scale-110 group-hover:scale-[1.15] transition-transform duration-700 pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-base/95 via-base/60 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-base/50 via-transparent to-transparent pointer-events-none" />
                </>
            )}

            {/* ── 테마 컬러 배경 그라디언트 (base) ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top left, ${theme.color.glow} 0%, transparent 70%)` }}
            />
            {/* hover 시 강도 증가 — opacity 전환으로 GPU 합성 */}
            <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse at top left, ${theme.color.glow} 0%, transparent 70%)` }}
            />

            {/* ── 배경 아이콘 워터마크 ── */}
            <Icon
                className="absolute bottom-3 right-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300 pointer-events-none"
                style={{ color: theme.color.text, width: '80px', height: '80px' }}
            />

            {/* ── hover border glow ── */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1.5px ${theme.color.text}, 0 0 20px ${theme.color.glow}` }}
            />

            {/* ── 콘텐츠 ── */}
            <div className="relative z-10 p-4 sm:p-5 h-full flex flex-col gap-3">
                {/* 상단: 카테고리 + 게임 수 + LIVE + 이동 화살표 */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: theme.color.text }} />
                        <span className="text-[10px] font-bold tracking-widest uppercase truncate" style={{ color: theme.color.text }}>
                            {theme.category}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* 총 게임 수 */}
                        {total > 0 && (
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: theme.color.glow, color: theme.color.text, border: `1px solid ${theme.color.border}` }}
                            >
                                {total > 99 ? '99+' : total}개
                            </span>
                        )}
                        {theme.isClosingSoon && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                                </span>
                                LIVE
                            </span>
                        )}
                        {/* 탭/클릭 가능 표시 — 모바일에서 호버 없이도 내비게이션 단서 제공 */}
                        <ChevronRight
                            className="w-4 h-4 sm:group-hover:translate-x-0.5 transition-transform duration-200"
                            style={{ color: theme.color.text }}
                        />
                    </div>
                </div>

                {/* 카피 + 서브타이틀 */}
                <div className="flex-1">
                    <h3 className={`font-black text-primary leading-tight mb-1.5 break-keep
                        ${theme.panel === 'xl' ? 'text-xl sm:text-2xl md:text-[1.65rem]' : 'text-base sm:text-lg md:text-xl'}`}>
                        {theme.copy}
                    </h3>
                    <p className="text-secondary text-xs sm:text-sm leading-snug break-keep line-clamp-2">
                        {theme.subtitle}
                    </p>
                </div>

                {/* 게임 커버 썸네일 스트립 */}
                {games.length > 0 && (
                    <div className="flex items-end gap-2">
                        {games.slice(0, 3).map(game => (
                            <div
                                key={game.id}
                                className="relative w-[40px] h-[52px] sm:w-[48px] sm:h-[64px] rounded-lg overflow-hidden shrink-0 shadow-sm"
                                style={{ outline: `1px solid ${theme.color.border}` }}
                            >
                                <PSGameImage
                                    src={game.imageUrl}
                                    alt={game.name}
                                    width={100}
                                    className="w-full h-full object-cover transition-transform duration-500 sm:group-hover:scale-105"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// CategorySection — 카테고리별 챕터 섹션
// emptyCount 추적: 모든 테마가 게임 0개이면 섹션 전체 숨김
// ─────────────────────────────────────────────
function CategorySection({ categoryName, themes, onViewAll }) {
    const [ref, visible] = useScrollReveal(0.04);
    const [emptyCount, setEmptyCount] = useState(0);
    const handleEmpty = useCallback(() => setEmptyCount(c => c + 1), []);

    const categoryColor = themes[0]?.color;
    const CategoryIcon = themes[0]?.Icon;

    // 모든 테마가 게임 없음으로 확정되면 섹션 자체를 렌더링하지 않음
    if (emptyCount >= themes.length) return null;

    return (
        <section
            ref={ref}
            className={`transition-[opacity,transform] duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
            {/* 챕터 구분 헤더 */}
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 shrink-0">
                    {CategoryIcon && <CategoryIcon className="w-4 h-4 shrink-0" style={{ color: categoryColor?.text }} />}
                    <h2 className="text-primary font-black text-base sm:text-lg tracking-tight">{categoryName}</h2>
                </div>
                <div className="flex-1 h-px" style={{ background: categoryColor?.border ?? 'transparent' }} />
            </div>

            {/* 패널 그리드 */}
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
// CurationPage
// ─────────────────────────────────────────────
const CurationPage = () => {
    const navigate = useTransitionNavigate();

    const handleViewAll = (params, themeCopy) => {
        const sp = buildSearchParams(params);
        sp.set('curation', 'true');
        if (themeCopy) sp.set('curationTheme', themeCopy);
        navigate('/games?' + sp.toString());
    };

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-base text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
            <SEO
                title="큐레이션"
                description="데이터로 검증된 PS 게임 테마 큐레이션 — 지금 사야 할 게임을 찾아드립니다."
                url="https://ps-signal.com/curation"
            />

            {/* PS 심볼 워터마크 */}
            <div className="absolute top-20 right-10 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                <Triangle className="w-40 h-40 stroke-[2px]" />
                <Circle className="w-40 h-40 stroke-[2px]" />
                <XIcon className="w-40 h-40 stroke-[2px]" />
                <Square className="w-40 h-40 stroke-[2px]" />
            </div>

            {/* Aurora 배경 */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[10%] left-[5%] w-[35%] h-[35%] rounded-full blur-[120px] bg-blue-500/5 dark:bg-blue-500/8 md:animate-[pulse_10s_ease-in-out_infinite] will-change-transform transform-gpu" />
                <div className="absolute bottom-[15%] right-[5%] w-[30%] h-[30%] rounded-full blur-[100px] bg-purple-500/5 dark:bg-purple-500/8 md:animate-[pulse_8s_ease-in-out_infinite] will-change-transform transform-gpu" />
            </div>

            <div className="max-w-6xl mx-auto">
                {/* 페이지 헤더 */}
                <div className="mb-10 sm:mb-12">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold tracking-widest uppercase text-secondary">PS-TRACKER PICKS</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-primary mb-2 leading-tight break-keep">
                        테마로 찾는 지금의{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">PICK</span>
                    </h1>
                    <p className="text-secondary text-sm sm:text-base">데이터가 검증한 지금 이 순간의 명작들</p>
                </div>

                {/* 카테고리 챕터 목록 */}
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
        </div>
    );
};

export default CurationPage;