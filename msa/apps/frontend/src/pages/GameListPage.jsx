import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getGenreBadgeStyle} from "../utils/uiUtils.js";
import client from '../api/client';
import toast from 'react-hot-toast';
import SkeletonCard from '../components/SkeletonCard';
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {useLocation, useSearchParams} from 'react-router-dom';
import {useTransitionNavigate} from '../hooks/useTransitionNavigate';
import {
    Activity,
    Banknote,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronRight,
    Circle,
    CircleDollarSign,
    Clock,
    Download,
    Filter,
    Flame,
    Gamepad2,
    Heart,
    Layers,
    Lock,
    Mail,
    Bookmark,
    MoreHorizontal,
    MonitorPlay,
    Percent,
    Pickaxe,
    Plus,
    Search,
    Server,
    Sparkles,
    Square,
    Star,
    Timer,
    TrendingDown,
    TrendingUp,
    Triangle,
    Trophy,
    Waves,
    X,
    Zap
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import TrendingGamesWidget from '../components/TrendingGamesWidget';
import {useAuth} from '../contexts/AuthContext';
import DonationModal from '../components/DonationModal';
import {getRecentGames, clearRecentGames} from '../utils/recentGames';
import {getMyPresets, createPreset, updatePreset, deletePreset} from '../api/presets';

const PLAYTIME_PRESETS = [
    { id: 'short', label: '주말 컷', range: '0~10h', min: 0, max: 10, icon: Zap, color: 'text-yellow-400', bg: 'hover:bg-yellow-400/10' },
    { id: 'medium', label: '정주행', range: '10~30h', min: 10, max: 30, icon: Gamepad2, color: 'text-ps-blue', bg: 'hover:bg-ps-blue/10' },
    { id: 'long', label: '각 잡고', range: '30~100h', min: 30, max: 100, icon: Layers, color: 'text-purple-400', bg: 'hover:bg-purple-400/10' },
    { id: 'epic', label: '타임머신', range: '100h+', min: 100, max: 999, icon: Trophy, color: 'text-orange-400', bg: 'hover:bg-orange-400/10' }
];

const sortOptions = [
    { value: 'lastUpdated,desc', label: '최근 업데이트순', icon: Clock, color: 'text-blue-400' },
    { value: 'releaseDate,desc', label: '최신 발매순', icon: CalendarDays, color: 'text-purple-400' },
    { value: 'saleEndDate,asc', label: '마감 임박순', icon: Timer, color: 'text-orange-400' },
    { value: 'price,asc', label: '낮은 가격순', icon: Banknote, color: 'text-green-400' },
    { value: 'discountRate,desc', label: '높은 할인율순', icon: TrendingUp, color: 'text-red-400' },
    { value: 'metaScore,desc', label: '높은 평점순', icon: Star, color: 'text-purple-400' },
    { value: 'playTime,asc', label: '가벼운 플탐순', icon: Timer, color: 'text-teal-400' },
    { value: 'playTime,desc', label: '든든한 플탐순', icon: Clock, color: 'text-indigo-400' }
];

const discountOptions = [
    { value: '', label: '전체 비율' },
    { value: '1', label: '할인 전체' },
    { value: '30', label: '30% 이상' },
    { value: '50', label: '50% 이상' },
    { value: '70', label: '70% 이상 (대박할인)' }
];

const metaScoreOptions = [
    { value: '', label: '전체 점수' },
    { value: '75', label: '75점 이상 (Good)' },
    { value: '80', label: '80점 이상 (Great)' },
    { value: '85', label: '85점 이상 (Must Play)' },
    { value: '90', label: '90점 이상 (Masterpiece)' }
];

const platformOptions = [
    { value: '', label: '전체 플랫폼' },
    { value: 'PS5', label: 'PS5 전용' },
    { value: 'PS4', label: 'PS4 호환' }
];

const GameListPage = () => {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { openLoginModal, isAuthenticated } = useAuth();

    const filterBoxRef = useRef(null);
    const swipeStartYRef = useRef(0);
    const lastScrollYRef = useRef(0);
    const observer = useRef();
    const recentGamesScrollRef = useRef(null);
    const dragStateRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0, hasDragged: false });

    const [isDonationOpen, setIsDonationOpen] = useState(false);
    const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
    const [recentGames, setRecentGames] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isDesktopSearchActive, setIsDesktopSearchActive] = useState(false);
    const [isFloatingVisible, setIsFloatingVisible] = useState(true);
    const [expandedPill, setExpandedPill] = useState(null);
    const [presets, setPresets] = useState([]);
    const [activePresetId, setActivePresetId] = useState(null);
    const [isPresetNameModalOpen, setIsPresetNameModalOpen] = useState(false);
    const [presetNameInput, setPresetNameInput] = useState('');
    const [presetEditingId, setPresetEditingId] = useState(null);
    const [presetMenuOpenId, setPresetMenuOpenId] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [priceRange, setPriceRange] = useState({
        min: searchParams.get('minPrice') || '',
        max: searchParams.get('maxPrice') || '',
    });

    const [selectedPlayTimeId, setSelectedPlayTimeId] = useState(() => {
        const min = searchParams.get('minPlayTime');
        const max = searchParams.get('maxPlayTime');
        return PLAYTIME_PRESETS.find(p => String(p.min) === min && String(p.max) === max)?.id || null;
    });

    const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '');
    const [psPlusDiscount, setPsPlusDiscount] = useState(null);
    const [isPsPlusBannerDismissed, setIsPsPlusBannerDismissed] = useState(() => {
        const dismissedDate = localStorage.getItem('psPlusBannerDismissedDate');
        const today = new Date().toDateString();
        return dismissedDate === today;
    });

    const handleDismissBanner = (e) => {
        e.stopPropagation();
        setIsPsPlusBannerDismissed(true);
        const today = new Date().toDateString();
        localStorage.setItem('psPlusBannerDismissedDate', today);
    };

    const [filter, setFilter] = useState(() => ({
        keyword: searchParams.get('keyword') || '',
        genre: searchParams.get('genre') || '',
        minDiscountRate: searchParams.get('minDiscountRate') || '',
        minMetaScore: searchParams.get('minMetaScore') || '',
        platform: searchParams.get('platform') || '',
        isPlusExclusive: searchParams.get('isPlusExclusive') === 'true',
        inCatalog: searchParams.get('inCatalog') === 'true',
        sort: searchParams.get('sort') || 'lastUpdated,desc',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        minPlayTime: searchParams.get('minPlayTime') || '',
        maxPlayTime: searchParams.get('maxPlayTime') || '',
        isAllTimeLow: searchParams.get('isAllTimeLow') === 'true',
        isPs5ProEnhanced: searchParams.get('isPs5ProEnhanced') === 'true',
        isBestSeller: searchParams.get('isBestSeller') === 'true',
        isMostDownloaded: searchParams.get('isMostDownloaded') === 'true',
        isClosingSoon: searchParams.get('isClosingSoon') === 'true',
        isNewDiscount: searchParams.get('isNewDiscount') === 'true',
        // 큐레이션 전용 히든 필터 (UI 없음, URL → API 전달 전용)
        vibeTags: searchParams.getAll('vibeTags'),
        minUserScore: searchParams.get('minUserScore') || '',
        // 큐레이션 진입 표시 (UI 전용, API 미전달)
        curation: searchParams.get('curation') === 'true',
        curationTheme: searchParams.get('curationTheme') || '',
    }));

    const isPriceFilterActive = filter.minPrice !== '' || filter.maxPrice !== '';
    const isPlayTimeFilterActive = filter.minPlayTime !== '' || filter.maxPlayTime !== '';

    const isFilterActive = !!(
        filter.keyword || filter.genre || filter.minDiscountRate || filter.minMetaScore ||
        filter.platform || filter.isPlusExclusive || filter.inCatalog ||
        isPriceFilterActive || isPlayTimeFilterActive ||
        filter.isAllTimeLow || filter.isPs5ProEnhanced || filter.isBestSeller ||
        filter.isMostDownloaded || filter.isClosingSoon || filter.isNewDiscount ||
        (filter.vibeTags && filter.vibeTags.length > 0) || filter.curation
    );

    const fetchGames = async (pageNumber, overrideFilter = null) => {
        const currentFilter = overrideFilter || filter;
        setLoading(true);
        try {
            const params = {
                page: pageNumber, size: 20, sort: currentFilter.sort, keyword: currentFilter.keyword, genre: currentFilter.genre,
                ...(currentFilter.minDiscountRate && { minDiscountRate: currentFilter.minDiscountRate }),
                ...(currentFilter.minMetaScore && { minMetaScore: currentFilter.minMetaScore }),
                ...(currentFilter.platform && { platform: currentFilter.platform }),
                ...(currentFilter.isPlusExclusive && { isPlusExclusive: true }),
                ...(currentFilter.inCatalog && { inCatalog: true }),
                ...(currentFilter.minPrice && { minPrice: currentFilter.minPrice }),
                ...(currentFilter.maxPrice && { maxPrice: currentFilter.maxPrice }),
                ...(currentFilter.minPlayTime && { minPlayTime: currentFilter.minPlayTime }),
                ...(currentFilter.maxPlayTime && { maxPlayTime: currentFilter.maxPlayTime }),
                ...(currentFilter.isAllTimeLow && { isAllTimeLow: true }),
                ...(currentFilter.isPs5ProEnhanced && { isPs5ProEnhanced: true }),
                ...(currentFilter.isBestSeller && { isBestSeller: true }),
                ...(currentFilter.isMostDownloaded && { isMostDownloaded: true }),
                ...(currentFilter.isClosingSoon && { isClosingSoon: true }),
                ...(currentFilter.isNewDiscount && { isNewDiscount: true }),
                ...(currentFilter.minUserScore && { minUserScore: currentFilter.minUserScore }),
            };
            // vibeTags는 배열 반복 파라미터라 URLSearchParams.append로 직렬화
            const sp = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && sp.append(k, String(v)));
            (currentFilter.vibeTags || []).forEach(t => sp.append('vibeTags', t));
            const response = await client.get('/api/v1/games/search?' + sp.toString());

            if (pageNumber === 0) {
                setGames(response.data.content);
                setIsInitialLoad(false);
            } else {
                setGames(prev => {
                    const existingIds = new Set(prev.map(g => g.id));
                    const newGames = response.data.content.filter(g => !existingIds.has(g.id));
                    return [...prev, ...newGames];
                });
            }
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            toast.error("데이터 로딩 실패");
        } finally {
            setLoading(false);
        }
    };

    // 프리셋 - 현재 필터에서 저장할 조건 추출 (keyword 제외)
    const extractPresetFilters = useCallback(() => ({
        sort: filter.sort,
        minDiscountRate: filter.minDiscountRate,
        minMetaScore: filter.minMetaScore,
        platform: filter.platform,
        isPlusExclusive: filter.isPlusExclusive,
        inCatalog: filter.inCatalog,
        minPrice: filter.minPrice,
        maxPrice: filter.maxPrice,
        minPlayTime: filter.minPlayTime,
        maxPlayTime: filter.maxPlayTime,
        isAllTimeLow: filter.isAllTimeLow,
        isPs5ProEnhanced: filter.isPs5ProEnhanced,
    }), [filter]);

    // 프리셋 자동 이름 생성
    const buildAutoPresetName = useCallback(() => {
        const parts = [];
        if (filter.minDiscountRate) parts.push(`${filter.minDiscountRate}%+`);
        if (filter.minMetaScore) parts.push(`Meta ${filter.minMetaScore}+`);
        if (filter.maxPlayTime && filter.maxPlayTime !== '999') parts.push(`~${filter.maxPlayTime}h`);
        else if (filter.minPlayTime) parts.push(`${filter.minPlayTime}h+`);
        if (filter.platform) parts.push(filter.platform);
        if (filter.isAllTimeLow) parts.push('역대최저');
        if (filter.isPlusExclusive) parts.push('PLUS');
        return parts.join(' · ').slice(0, 15) || '나만의 탐색';
    }, [filter]);

    // 프리셋 적용
    const applyPreset = useCallback((preset) => {
        const f = preset.filters;
        setFilter(prev => ({
            ...prev,
            sort: f.sort ?? 'lastUpdated,desc',
            minDiscountRate: f.minDiscountRate ?? '',
            minMetaScore: f.minMetaScore ?? '',
            platform: f.platform ?? '',
            isPlusExclusive: f.isPlusExclusive ?? false,
            inCatalog: f.inCatalog ?? false,
            minPrice: f.minPrice ?? '',
            maxPrice: f.maxPrice ?? '',
            minPlayTime: f.minPlayTime ?? '',
            maxPlayTime: f.maxPlayTime ?? '',
            isAllTimeLow: f.isAllTimeLow ?? false,
            isPs5ProEnhanced: f.isPs5ProEnhanced ?? false,
        }));
        setPriceRange({ min: f.minPrice ?? '', max: f.maxPrice ?? '' });
        setSelectedPlayTimeId(PLAYTIME_PRESETS.find(p =>
            String(p.min) === f.minPlayTime && String(p.max) === f.maxPlayTime
        )?.id || null);
        setActivePresetId(preset.id);
        setExpandedPill(null);
        setPage(0);
    }, []);

    // 프리셋 저장 버튼 클릭
    const handleSavePreset = () => {
        if (!isAuthenticated) { openLoginModal(); return; }
        setPresetNameInput(buildAutoPresetName());
        setPresetEditingId(null);
        setIsPresetNameModalOpen(true);
    };

    // 프리셋 이름 수정 버튼 클릭
    const handleEditPresetName = (preset) => {
        setPresetNameInput(preset.name);
        setPresetEditingId(preset.id);
        setIsPresetNameModalOpen(true);
    };

    // 프리셋 이름 모달 확인
    const handleConfirmPresetName = async () => {
        const name = presetNameInput.trim();
        if (!name) return;
        try {
            if (presetEditingId) {
                const updated = await updatePreset(presetEditingId, { name });
                setPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
                toast.success('이름이 수정됐어요');
            } else {
                const newPreset = await createPreset(name, extractPresetFilters());
                setPresets(prev => [...prev, newPreset]);
                setActivePresetId(newPreset.id);
                toast.success('탐색 조건이 저장됐어요');
            }
            setIsPresetNameModalOpen(false);
            setPresetEditingId(null);
        } catch (e) {
            toast.error(e.response?.data?.message || '처리에 실패했어요');
        }
    };

    // 프리셋 조건 덮어쓰기
    const handleOverwritePreset = (preset) => {
        setPresetMenuOpenId(null);
        const filters = extractPresetFilters();
        toast((t) => (
            <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-primary">'{preset.name}'을 현재 조건으로 덮어쓸까요?</p>
                <div className="flex gap-2">
                    <button onClick={() => {
                        toast.dismiss(t.id);
                        updatePreset(preset.id, { filters })
                            .then(updated => {
                                setPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
                                setActivePresetId(updated.id);
                                toast.success('프리셋이 업데이트됐어요');
                            })
                            .catch(() => toast.error('수정에 실패했어요'));
                    }} className="flex-1 px-3 py-1.5 bg-ps-blue/20 border border-ps-blue/40 text-ps-blue text-xs font-bold rounded-lg active:scale-95">덮어쓰기</button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 px-3 py-1.5 bg-surface border border-divider text-secondary text-xs font-bold rounded-lg active:scale-95">취소</button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    // 프리셋 삭제
    const handleDeletePreset = (preset) => {
        setPresetMenuOpenId(null);
        toast((t) => (
            <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-primary">'{preset.name}' 프리셋을 삭제할까요?</p>
                <div className="flex gap-2">
                    <button onClick={() => {
                        toast.dismiss(t.id);
                        deletePreset(preset.id)
                            .then(() => {
                                setPresets(prev => prev.filter(p => p.id !== preset.id));
                                if (activePresetId === preset.id) setActivePresetId(null);
                                toast.success('프리셋이 삭제됐어요');
                            })
                            .catch(() => toast.error('삭제에 실패했어요'));
                    }} className="flex-1 px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold rounded-lg active:scale-95">삭제</button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 px-3 py-1.5 bg-surface border border-divider text-secondary text-xs font-bold rounded-lg active:scale-95">취소</button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const handlePriceReset = () => {
        setPriceRange({ min: '', max: '' });
        setFilter(prev => ({ ...prev, minPrice: '', maxPrice: '' }));
        setExpandedPill(null);
        setPage(0);
    };

    const handlePriceApply = () => {
        const minVal = priceRange.min !== '' ? Number(priceRange.min) : '';
        const maxVal = priceRange.max !== '' ? Number(priceRange.max) : '';

        if (minVal !== '' && maxVal !== '' && minVal > maxVal) {
            toast.error('최소 가격이 최대 가격보다 클 수 없습니다! 😅');
            setPriceRange({ min: '', max: '' });
            return;
        }

        setFilter(prev => ({
            ...prev,
            minPrice: minVal !== '' ? String(minVal) : '',
            maxPrice: maxVal !== '' ? String(maxVal) : ''
        }));
        setExpandedPill(null);
        setPage(0);
    };

    const executeSearch = () => {
        const minVal = priceRange.min !== '' ? Number(priceRange.min) : '';
        const maxVal = priceRange.max !== '' ? Number(priceRange.max) : '';

        if (minVal !== '' && maxVal !== '' && minVal > maxVal) {
            toast.error('최소 가격이 최대 가격보다 클 수 없습니다! 😅');
            setPriceRange({ min: '', max: '' });
            return;
        }

        setFilter(prev => ({
            ...prev,
            keyword: searchInput,
            minPrice: minVal !== '' ? String(minVal) : '',
            maxPrice: maxVal !== '' ? String(maxVal) : ''
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setPage(0);
        setIsQuickSearchOpen(false);
    };

    const handlePlayTimeSelect = (preset, isQuickSearch = false) => {
        if (!preset || selectedPlayTimeId === preset?.id) {
            setSelectedPlayTimeId(null);
            setFilter(prev => ({ ...prev, minPlayTime: '', maxPlayTime: '' }));
        } else {
            // 새로운 칩 선택
            setSelectedPlayTimeId(preset.id);
            setFilter(prev => ({ ...prev, minPlayTime: String(preset.min), maxPlayTime: String(preset.max) }));
        }
        setPage(0);

        if (isQuickSearch) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setIsQuickSearchOpen(false);
        } else {
            setExpandedPill(null);
        }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.target.blur(); executeSearch(); } };

    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilter(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (name !== 'keyword') {
            setPage(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCustomSelect = (name, value) => {
        setFilter(prev => ({ ...prev, [name]: value }));
        setExpandedPill(null);
        setPage(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleQuickSelect = (name, value) => {
        setFilter(prev => ({ ...prev, [name]: value }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setPage(0);
        setIsQuickSearchOpen(false);
    };

    const handleLike = async (e, gameId) => {
        e.stopPropagation();
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${gameId}`);
            const isAdded = response.data.includes("추가");
            setGames(prevGames => prevGames.map(game => game.id === gameId ? { ...game, liked: isAdded } : game));
            toast.success(response.data, { id: toastId, icon: isAdded ? '❤️' : '💔' });
        } catch (error) {
            if (error.response?.status === 401) {
                toast.dismiss(toastId);
                openLoginModal();
            } else {
                toast.error("요청 실패", { id: toastId });
            }
        }
    };

    const clearGenreFilter = () => {
        setFilter(prev => ({ ...prev, genre: '' }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setPage(0);
    };

    const lastGameElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages - 1) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, page, totalPages]);

    const handleRecentGamesDragStart = useCallback((e) => {
        if (e.pointerType === 'touch') return; // 모바일 터치는 브라우저 네이티브 스크롤에 맡김
        const el = recentGamesScrollRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId); // 요소 밖으로 나가도 포인터 이벤트 고정
        dragStateRef.current = { isDragging: true, startX: e.clientX, scrollLeft: el.scrollLeft, hasDragged: false };
        el.style.cursor = 'grabbing';
    }, []);

    const handleRecentGamesDragMove = useCallback((e) => {
        const state = dragStateRef.current;
        if (!state.isDragging) return;
        const el = recentGamesScrollRef.current;
        if (!el) return;
        const delta = e.clientX - state.startX;
        if (Math.abs(delta) > 5) state.hasDragged = true;
        el.scrollLeft = state.scrollLeft - delta * 1.5;
    }, []);

    const handleRecentGamesDragEnd = useCallback(() => {
        dragStateRef.current.isDragging = false;
        if (recentGamesScrollRef.current) recentGamesScrollRef.current.style.cursor = 'grab';
    }, []);

    const handleContactClick = useCallback((e) => {
        e.preventDefault();
        const email = 'pstracker.help@gmail.com';

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(email).then(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            }).catch(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            });
        } else {
            toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
        }

        setTimeout(() => {
            window.location.href = `mailto:${email}`;
        }, 500);
    }, []);

    // 큐레이션 등 외부에서 진입 시 항상 최상단에서 시작
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);

    // 알림 클릭으로 진입 시 (?game=123) 해당 게임 모달 자동 오픈
    useEffect(() => {
        const gameId = searchParams.get('game');
        if (!gameId) return;
        navigate(`/games/${gameId}`, { state: { background: location } });
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollYRef.current && currentScrollY > 150) {
                setIsFloatingVisible(false);
            } else {
                setIsFloatingVisible(true);
            }

            lastScrollYRef.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleWishlistUpdate = (e) => {
            const { gameId, liked } = e.detail;

            setGames(prevGames =>
                prevGames.map(game =>
                    game.id === gameId ? { ...game, liked: liked } : game
                )
            );
        };

        window.addEventListener('ps-wishlist-updated', handleWishlistUpdate);
        return () => window.removeEventListener('ps-wishlist-updated', handleWishlistUpdate);
    }, []);

    useEffect(() => {
        if (!location.search) {
            setFilter(prev => {
                const isAlreadyDefault =
                    prev.keyword === '' && prev.genre === '' &&
                    prev.minDiscountRate === '' && prev.minMetaScore === '' &&
                    prev.platform === '' && !prev.isPlusExclusive &&
                    !prev.inCatalog && prev.sort === 'lastUpdated,desc' &&
                    prev.minPrice === '' && prev.maxPrice === '' &&
                    prev.minPlayTime === '' && prev.maxPlayTime === '' &&
                    !prev.isAllTimeLow &&
                    !prev.isPs5ProEnhanced &&
                    !prev.isBestSeller &&
                    !prev.isMostDownloaded &&
                    !prev.isClosingSoon &&
                    !prev.isNewDiscount &&
                    (prev.vibeTags || []).length === 0 &&
                    prev.minUserScore === '' &&
                    !prev.curation &&
                    prev.curationTheme === '';

                if (isAlreadyDefault) return prev;

                setPage(0);
                setSearchInput('');
                setPriceRange({ min: '', max: '' });
                setSelectedPlayTimeId(null);

                return {
                    keyword: '', genre: '', minDiscountRate: '', minMetaScore: '',
                    platform: '', isPlusExclusive: false, inCatalog: false,
                    sort: 'lastUpdated,desc', minPrice: '', maxPrice: '',
                    minPlayTime: '', maxPlayTime: '',
                    isAllTimeLow: false,
                    isPs5ProEnhanced: false,
                    isBestSeller: false,
                    isMostDownloaded: false,
                    isClosingSoon: false,
                    isNewDiscount: false,
                    vibeTags: [],
                    minUserScore: '',
                    curation: false,
                    curationTheme: '',
                };
            });
        } else {
            const urlKeyword = searchParams.get('keyword') || '';
            const urlGenre = searchParams.get('genre') || '';
            const urlMinDiscountRate = searchParams.get('minDiscountRate') || '';
            const urlMinMetaScore = searchParams.get('minMetaScore') || '';
            const urlPlatform = searchParams.get('platform') || '';
            const urlIsPlusExclusive = searchParams.get('isPlusExclusive') === 'true';
            const urlInCatalog = searchParams.get('inCatalog') === 'true';
            const urlSort = searchParams.get('sort') || 'lastUpdated,desc';
            const urlMinPrice = searchParams.get('minPrice') || '';
            const urlMaxPrice = searchParams.get('maxPrice') || '';
            const urlMinPlayTime = searchParams.get('minPlayTime') || '';
            const urlMaxPlayTime = searchParams.get('maxPlayTime') || '';
            const urlIsAllTimeLow = searchParams.get('isAllTimeLow') === 'true';
            const urlIsPs5ProEnhanced = searchParams.get('isPs5ProEnhanced') === 'true';
            const urlIsBestSeller = searchParams.get('isBestSeller') === 'true';
            const urlIsMostDownloaded = searchParams.get('isMostDownloaded') === 'true';
            const urlIsClosingSoon = searchParams.get('isClosingSoon') === 'true';
            const urlIsNewDiscount = searchParams.get('isNewDiscount') === 'true';
            const urlVibeTags = searchParams.getAll('vibeTags');
            const urlMinUserScore = searchParams.get('minUserScore') || '';
            const urlCuration = searchParams.get('curation') === 'true';
            const urlCurationTheme = searchParams.get('curationTheme') || '';

            setFilter(prev => {
                const prevVibeTagsStr = (prev.vibeTags || []).join(',');
                const urlVibeTagsStr = urlVibeTags.join(',');

                if (
                    prev.keyword === urlKeyword &&
                    prev.genre === urlGenre &&
                    prev.minDiscountRate === urlMinDiscountRate &&
                    prev.minMetaScore === urlMinMetaScore &&
                    prev.platform === urlPlatform &&
                    prev.isPlusExclusive === urlIsPlusExclusive &&
                    prev.inCatalog === urlInCatalog &&
                    prev.sort === urlSort &&
                    prev.minPrice === urlMinPrice &&
                    prev.maxPrice === urlMaxPrice &&
                    prev.minPlayTime === urlMinPlayTime &&
                    prev.maxPlayTime === urlMaxPlayTime &&
                    prev.isAllTimeLow === urlIsAllTimeLow &&
                    prev.isPs5ProEnhanced === urlIsPs5ProEnhanced &&
                    prev.isBestSeller === urlIsBestSeller &&
                    prev.isMostDownloaded === urlIsMostDownloaded &&
                    prev.isClosingSoon === urlIsClosingSoon &&
                    prev.isNewDiscount === urlIsNewDiscount &&
                    prevVibeTagsStr === urlVibeTagsStr &&
                    prev.minUserScore === urlMinUserScore &&
                    prev.curation === urlCuration &&
                    prev.curationTheme === urlCurationTheme
                ) {
                    return prev;
                }

                setPage(0);
                setSearchInput(urlKeyword);
                setPriceRange({ min: urlMinPrice, max: urlMaxPrice });
                setSelectedPlayTimeId(PLAYTIME_PRESETS.find(p => String(p.min) === urlMinPlayTime && String(p.max) === urlMaxPlayTime)?.id || null);

                return {
                    keyword: urlKeyword, genre: urlGenre, minDiscountRate: urlMinDiscountRate,
                    minMetaScore: urlMinMetaScore, platform: urlPlatform, isPlusExclusive: urlIsPlusExclusive,
                    inCatalog: urlInCatalog, sort: urlSort, minPrice: urlMinPrice,
                    maxPrice: urlMaxPrice,
                    minPlayTime: urlMinPlayTime, maxPlayTime: urlMaxPlayTime,
                    isAllTimeLow: urlIsAllTimeLow,
                    isPs5ProEnhanced: urlIsPs5ProEnhanced,
                    isBestSeller: urlIsBestSeller,
                    isMostDownloaded: urlIsMostDownloaded,
                    isClosingSoon: urlIsClosingSoon,
                    isNewDiscount: urlIsNewDiscount,
                    vibeTags: urlVibeTags,
                    minUserScore: urlMinUserScore,
                    curation: urlCuration,
                    curationTheme: urlCurationTheme,
                };
            });
        }
    }, [location.search]);

    useEffect(() => {
        const params = {};
        if (filter.keyword) params.keyword = filter.keyword;
        if (filter.genre) params.genre = filter.genre;
        if (filter.minDiscountRate) params.minDiscountRate = filter.minDiscountRate;
        if (filter.minMetaScore) params.minMetaScore = filter.minMetaScore;
        if (filter.platform) params.platform = filter.platform;
        if (filter.isPlusExclusive) params.isPlusExclusive = 'true';
        if (filter.inCatalog) params.inCatalog = 'true';
        if (filter.sort !== 'lastUpdated,desc') params.sort = filter.sort;
        if (filter.minPrice) params.minPrice = filter.minPrice;
        if (filter.maxPrice) params.maxPrice = filter.maxPrice;
        if (filter.minPlayTime) params.minPlayTime = filter.minPlayTime;
        if (filter.maxPlayTime) params.maxPlayTime = filter.maxPlayTime;
        if (filter.isAllTimeLow) params.isAllTimeLow = 'true';
        if (filter.isPs5ProEnhanced) params.isPs5ProEnhanced = 'true';
        if (filter.isBestSeller) params.isBestSeller = 'true';
        if (filter.isMostDownloaded) params.isMostDownloaded = 'true';
        if (filter.isClosingSoon) params.isClosingSoon = 'true';
        if (filter.isNewDiscount) params.isNewDiscount = 'true';
        if (filter.minUserScore) params.minUserScore = filter.minUserScore;
        if (filter.curation) params.curation = 'true';
        if (filter.curationTheme) params.curationTheme = filter.curationTheme;

        // vibeTags는 반복 파라미터라 URLSearchParams로 직접 빌드
        const newSp = new URLSearchParams(params);
        (filter.vibeTags || []).forEach(t => newSp.append('vibeTags', t));

        const currentParamsStr = searchParams.toString();
        const newParamsStr = newSp.toString();

        if (currentParamsStr !== newParamsStr) {
            setSearchParams(newSp, { replace: true });
        }
    }, [filter]);

    useEffect(() => {
        const checkPsPlusDeal = async () => {
            try {
                const res = await client.get('/api/v1/subscriptions/ps-plus/pricing');

                if (res.data?.isPromotionActive) {
                    setPsPlusDiscount({
                        discountRate: res.data.promotionDiscountRate || 0
                    });
                }
            } catch (error) {
                // 에러 나도 조용히 무시 (메인 화면 로딩에 영향 없음)
            }
        };

        checkPsPlusDeal();
    }, []);

    // 필터 pill 외부 클릭 시 닫기
    useEffect(() => {
        if (!expandedPill) return;
        const handleClickOutside = (e) => {
            if (filterBoxRef.current && !filterBoxRef.current.contains(e.target)) {
                setExpandedPill(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [expandedPill]);

    // 프리셋 목록 로드 (로그인 시)
    useEffect(() => {
        if (!isAuthenticated) return;
        getMyPresets().then(setPresets).catch(() => {});
    }, [isAuthenticated]);

    // 필터가 프리셋과 달라지면 해제, 프리셋 삭제 시에도 해제
    useEffect(() => {
        if (!activePresetId) return;
        const active = presets.find(p => p.id === activePresetId);
        if (!active) { setActivePresetId(null); return; }
        const f = active.filters;
        const diverged =
            filter.sort !== (f.sort ?? 'lastUpdated,desc') ||
            filter.minDiscountRate !== (f.minDiscountRate ?? '') ||
            filter.minMetaScore !== (f.minMetaScore ?? '') ||
            filter.platform !== (f.platform ?? '') ||
            filter.isPlusExclusive !== (f.isPlusExclusive ?? false) ||
            filter.inCatalog !== (f.inCatalog ?? false) ||
            filter.minPrice !== (f.minPrice ?? '') ||
            filter.maxPrice !== (f.maxPrice ?? '') ||
            filter.minPlayTime !== (f.minPlayTime ?? '') ||
            filter.maxPlayTime !== (f.maxPlayTime ?? '') ||
            filter.isAllTimeLow !== (f.isAllTimeLow ?? false) ||
            filter.isPs5ProEnhanced !== (f.isPs5ProEnhanced ?? false);
        if (diverged) setActivePresetId(null);
    }, [filter, presets, activePresetId]);

    // 프리셋 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        if (!presetMenuOpenId) return;
        const handleMouseDown = () => setPresetMenuOpenId(null);
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [presetMenuOpenId]);

    // 바텀시트 열릴 때 최근 본 게임 로드
    useEffect(() => {
        if (isQuickSearchOpen) {
            setRecentGames(getRecentGames());
        } else {
            setSuggestions([]);
        }
    }, [isQuickSearchOpen]);

    // 자동완성 (2자 이상, 300ms debounce)
    useEffect(() => {
        if (searchInput.length < 2) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await client.get('/api/v1/games/suggest', { params: { q: searchInput, limit: 5 } });
                setSuggestions(res.data);
            } catch {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        fetchGames(page);
    }, [
        page, filter.sort, filter.genre, filter.minDiscountRate,
        filter.minMetaScore, filter.platform, filter.isPlusExclusive,
        filter.inCatalog, filter.minPrice, filter.maxPrice,
        filter.minPlayTime, filter.maxPlayTime,
        filter.isAllTimeLow, filter.keyword, filter.isPs5ProEnhanced,
        filter.isBestSeller, filter.isMostDownloaded, filter.isClosingSoon,
        filter.isNewDiscount,
        // vibeTags는 배열이라 join()으로 변화 감지
        (filter.vibeTags || []).join(','),
        filter.minUserScore,
    ]);

    const getActiveSpecialFilters = () => {
        // 큐레이션 진입 시 다른 배너를 모두 무시하고 curationMode 단독 표시
        if (filter.curation) return ['curationMode'];

        const active = [];
        if (filter.isAllTimeLow) active.push('isAllTimeLow');
        if (filter.minMetaScore === '85' && filter.minDiscountRate === '50') active.push('mustPlay');

        const isPlayTimeActive = filter.minPlayTime !== '' || filter.maxPlayTime !== '';
        if (isPlayTimeActive) active.push('playTime');

        // '전체 할인' 배너는 다른 특수 필터가 아예 없을 때만 표시되도록 방어
        if (filter.minDiscountRate === '1' && filter.minMetaScore === '' &&
            !filter.isBestSeller && !filter.isMostDownloaded && !filter.isClosingSoon &&
            !filter.isNewDiscount && !filter.isPs5ProEnhanced && !filter.inCatalog && !filter.isPlusExclusive &&
            !isPlayTimeActive) {
            active.push('allDiscounts');
        }

        if (filter.isBestSeller) active.push('isBestSeller');
        if (filter.isMostDownloaded) active.push('isMostDownloaded');
        if (filter.isClosingSoon) active.push('isClosingSoon');
        if (filter.isNewDiscount) active.push('isNewDiscount');
        if (filter.isPs5ProEnhanced) active.push('isPs5ProEnhanced');
        if (filter.inCatalog) active.push('inCatalog');
        if (filter.isPlusExclusive) active.push('isPlusExclusive');
        // 큐레이션 테마 파도타기 (vibeTags 또는 minUserScore 조건으로 진입 시)
        if ((filter.vibeTags || []).length > 0 || filter.minUserScore) active.push('curationMode');

        return active;
    };

    // 2. 복합 필터 '전체 해제' 함수
    const handleClearSpecialFilters = () => {
        setFilter(prev => ({
            ...prev,
            isAllTimeLow: false, isBestSeller: false, isMostDownloaded: false,
            isClosingSoon: false, isNewDiscount: false, isPs5ProEnhanced: false,
            inCatalog: false, isPlusExclusive: false,
            vibeTags: [], minUserScore: '',
            curation: false, curationTheme: '',
            // 갓겜 세팅이나 전체 할인 세팅이었을 경우에만 초기화
            minMetaScore: prev.minMetaScore === '85' && prev.minDiscountRate === '50' ? '' : prev.minMetaScore,
            minDiscountRate: prev.minMetaScore === '85' && prev.minDiscountRate === '50' ? '' : (prev.minDiscountRate === '1' ? '' : prev.minDiscountRate)
        }));
        setPage(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleResetAllFilters = () => {
        setFilter({
            keyword: '', genre: '', minDiscountRate: '', minMetaScore: '',
            platform: '', isPlusExclusive: false, inCatalog: false,
            sort: 'lastUpdated,desc', minPrice: '', maxPrice: '',
            minPlayTime: '', maxPlayTime: '',
            isAllTimeLow: false, isPs5ProEnhanced: false,
            isBestSeller: false, isMostDownloaded: false,
            isClosingSoon: false, isNewDiscount: false,
            vibeTags: [], minUserScore: '',
            curation: false, curationTheme: '',
        });
        setSearchInput('');
        setPriceRange({ min: '', max: '' });
        setSelectedPlayTimeId(null);
        setPage(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const activeBanners = getActiveSpecialFilters();

    // 3. 다이내믹 인사이트 액션 배너 렌더링 함수 (기존 삼항 연산자 대체)
    const renderActionBanner = () => {
        // [방어코드] 복합 조건 (2개 이상의 액션 배너 조건이 겹쳤을 때)
        if (activeBanners.length > 1) {
            return (
                <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-gray-500/30 p-4 sm:p-5 flex items-center justify-between hover:border-gray-500/60 hover:shadow-[0_0_20px_rgba(156,163,175,0.15)] group transition-all">
                    <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-gray-500/10 to-transparent"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center border border-gray-500/30">
                            <Layers className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <div className="text-gray-400 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Filter className="w-3 h-3"/> MULTI FILTER</div>
                            <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                현재 <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-white">{activeBanners.length}개의 조건이 조합된</span> 맞춤 필터 적용 중!
                            </div>
                        </div>
                    </div>
                    <button onClick={handleClearSpecialFilters} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                        <X className="w-4 h-4" /> <span className="hidden sm:inline">전체 해제</span>
                    </button>
                </div>
            );
        }

        // 단일 조건일 경우 해당 배너 출력
        const currentBanner = activeBanners[0];

        switch (currentBanner) {
            case 'playTime': {
                const activePreset = PLAYTIME_PRESETS.find(p => String(p.min) === filter.minPlayTime && String(p.max) === filter.maxPlayTime);
                const Icon = activePreset ? activePreset.icon : Clock;
                const title = activePreset ? activePreset.label : '맞춤 플레이타임';

                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-teal-500/30 p-4 sm:p-5 flex items-center justify-between hover:border-teal-500/50 hover:shadow-[0_0_25px_rgba(20,184,166,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-teal-500/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-teal-500/10 dark:bg-teal-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/30">
                                <Icon className="w-6 h-6 text-teal-600 dark:text-teal-400 drop-shadow-sm" />
                            </div>
                            <div>
                                <div className="text-teal-600 dark:text-teal-400 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Timer className="w-3 h-3"/> PLAYTIME FILTER</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400">{title}</span>' 볼륨의 게임 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => {
                            setFilter(prev => ({...prev, minPlayTime: '', maxPlayTime: ''}));
                            setSelectedPlayTimeId(null);
                            setPage(0);
                        }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            }

            case 'isPs5ProEnhanced':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-gray-300 dark:border-gray-500/30 p-4 sm:p-5 flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-400/50 hover:shadow-[0_0_25px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-gray-200/60 dark:from-gray-500/20 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-gray-200/60 dark:bg-gray-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-500/20 flex items-center justify-center border border-gray-300 dark:border-gray-400/40 shadow-sm">
                                <Sparkles className="w-6 h-6 text-gray-600 dark:text-gray-100 drop-shadow-sm" />
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-300 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3"/> PRO ENHANCED</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    기기 성능 풀가동! <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-gray-900 dark:from-gray-200 dark:to-white">PS5 Pro 향상 꿀딜</span> 모아보기
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isPs5ProEnhanced: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'inCatalog':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-yellow-400/60 dark:border-yellow-500/30 p-4 sm:p-5 flex items-center justify-between hover:border-yellow-500 dark:hover:border-yellow-500/60 hover:shadow-[0_0_25px_rgba(250,204,21,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-yellow-100/80 dark:from-yellow-500/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-yellow-100/80 dark:bg-yellow-500/10 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-black flex items-center justify-center border border-yellow-500 shadow-sm">
                                <Gamepad2 className="w-6 h-6 text-yellow-500 dark:text-yellow-400 drop-shadow-sm" />
                            </div>
                            <div>
                                <div className="text-yellow-600 dark:text-yellow-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Gamepad2 className="w-3 h-3"/> PS PLUS EXTRA</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    지갑 지킴이! <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-500 dark:from-yellow-400 dark:to-yellow-200">구독자 스페셜(무료) 혜택</span> 모아보기
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, inCatalog: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'isPlusExclusive':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-yellow-50/50 dark:bg-yellow-500/5 border border-yellow-300/50 dark:border-yellow-500/30 p-4 sm:p-5 flex items-center justify-between hover:border-yellow-400/80 dark:hover:border-yellow-500/60 hover:bg-yellow-100/50 dark:hover:bg-yellow-500/10 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-yellow-200/60 dark:from-yellow-500/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-yellow-200/60 dark:bg-yellow-500/10 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-yellow-400 dark:bg-yellow-500 flex items-center justify-center shadow-md">
                                <Plus className="w-6 h-6 text-black drop-shadow-sm" strokeWidth={3} />
                            </div>
                            <div>
                                <div className="text-yellow-700 dark:text-yellow-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Star className="w-3 h-3"/> EXCLUSIVE DEAL</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    본전 뽑는 시간! <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-500 dark:to-amber-500">PLUS 전용 추가 할인</span> 모아보기
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isPlusExclusive: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'isAllTimeLow':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-red-border)] p-4 sm:p-5 flex items-center justify-between hover:border-[color:var(--bento-red-border-hover)] hover:[box-shadow:var(--bento-red-shadow)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[var(--bento-red-from)] to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-[var(--bento-red-from)] blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-[var(--bento-red-from)] flex items-center justify-center border border-[color:var(--bento-red-border)] animate-pulse">
                                <Flame className="w-6 h-6 text-red-600 dark:text-red-500" />
                            </div>
                            <div>
                                <div className="text-red-600 dark:text-red-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Waves className="w-3 h-3"/> WIDGET SURFING</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-500">역대 최저가</span>' 게임만 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isAllTimeLow: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'mustPlay':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-purple-border)] p-4 sm:p-5 flex items-center justify-between hover:border-[color:var(--bento-purple-border-hover)] hover:[box-shadow:var(--bento-purple-shadow)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[var(--bento-purple-from)] to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-[var(--bento-purple-from)] blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-[var(--bento-purple-from)] flex items-center justify-center border border-[color:var(--bento-purple-border)] animate-pulse">
                                <Star className="w-6 h-6 text-purple-600 dark:text-purple-500" />
                            </div>
                            <div>
                                <div className="text-purple-600 dark:text-purple-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Waves className="w-3 h-3"/> WIDGET SURFING</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500">인증된 명작 갓겜</span>' 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, minMetaScore: '', minDiscountRate: ''})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'allDiscounts':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-green-border)] p-4 sm:p-5 flex items-center justify-between hover:border-[color:var(--bento-green-border-hover)] hover:[box-shadow:var(--bento-green-shadow)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[var(--bento-green-from)] to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-[var(--bento-green-from)] blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-[var(--bento-green-from)] flex items-center justify-center border border-[color:var(--bento-green-border)] animate-pulse">
                                <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-500" />
                            </div>
                            <div>
                                <div className="text-green-600 dark:text-green-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Waves className="w-3 h-3"/> WIDGET SURFING</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500">진행 중인 모든 할인</span>' 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, minDiscountRate: ''})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'isBestSeller':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-amber-border)] p-4 sm:p-5 flex items-center justify-between hover:border-[color:var(--bento-amber-border-hover)] hover:[box-shadow:var(--bento-amber-shadow)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[var(--bento-amber-from)] to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-[var(--bento-amber-from)] blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-[var(--bento-amber-from)] flex items-center justify-center border border-[color:var(--bento-amber-border)]">
                                <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div>
                                <div className="text-amber-600 dark:text-amber-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Activity className="w-3 h-3"/> RANKING BOARD</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    현재 스토어 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-600 dark:from-amber-500 dark:to-yellow-500">베스트셀러</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isBestSeller: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'isMostDownloaded':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-cyan-border)] p-4 sm:p-5 flex items-center justify-between hover:border-[color:var(--bento-cyan-border-hover)] hover:[box-shadow:var(--bento-cyan-shadow)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[var(--bento-cyan-from)] to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-[var(--bento-cyan-from)] blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-[var(--bento-cyan-from)] flex items-center justify-center border border-[color:var(--bento-cyan-border)]">
                                <Download className="w-6 h-6 text-cyan-600 dark:text-cyan-500" />
                            </div>
                            <div>
                                <div className="text-cyan-600 dark:text-cyan-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Activity className="w-3 h-3"/> RANKING BOARD</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    현재 스토어 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-500">최다 다운로드</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isMostDownloaded: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'isClosingSoon':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-rose-500/30 dark:border-rose-500/20 p-4 sm:p-5 flex items-center justify-between hover:border-rose-500/60 dark:hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(225,29,72,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-rose-500/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-rose-500/10 dark:bg-rose-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30 animate-[pulse_1.5s_ease-in-out_infinite]">
                                <Timer className="w-6 h-6 text-rose-600 dark:text-rose-500" />
                            </div>
                            <div>
                                <div className="text-rose-600 dark:text-rose-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Timer className="w-3 h-3"/> CLOSING SOON</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    놓치면 후회할 <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-red-500 dark:from-rose-400 dark:to-red-400">할인 마감 임박</span> 모아보기!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isClosingSoon: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'isNewDiscount':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-blue-500/30 dark:border-blue-500/20 p-4 sm:p-5 flex items-center justify-between hover:border-blue-500/60 dark:hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-blue-500/10 dark:bg-blue-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400 drop-shadow-sm" />
                            </div>
                            <div>
                                <div className="text-blue-600 dark:text-blue-400 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Zap className="w-3 h-3"/> NEW DEALS</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                    오늘 시작된 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">따끈한 신규 할인</span> 모아보기!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isNewDiscount: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );

            case 'curationMode': {
                // 큐레이션 테마 파도타기 (curation=true 진입, 또는 vibeTags / minUserScore 조건)
                const vibeLabels = (filter.vibeTags || [])
                    .map(t => t.replace(/^#/, ''))
                    .slice(0, 3)
                    .join(' · ');
                const displayLabel = filter.curationTheme || vibeLabels;
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-indigo-border,rgba(99,102,241,0.3))] p-4 sm:p-5 flex items-center justify-between hover:border-[color:var(--bento-indigo-border-hover,rgba(99,102,241,0.6))] hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-indigo-500/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-48 h-full bg-indigo-500/10 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                                <Sparkles className="w-6 h-6 text-indigo-500 drop-shadow-sm" />
                            </div>
                            <div>
                                <div className="text-indigo-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1"><Waves className="w-3 h-3"/> CURATION SURFING</div>
                                <div className="text-primary font-black text-sm sm:text-base lg:text-lg break-keep">
                                    {displayLabel
                                        ? <>'<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">{displayLabel}</span>' 테마 게임 모아보기</>
                                        : <>큐레이션 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">감성 취향</span> 게임 모아보기</>
                                    }
                                </div>
                            </div>
                        </div>
                        <button onClick={handleResetAllFilters} className="relative z-10 flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary hover:text-primary shadow-sm">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            }

            default:
                // 특수 필터가 하나도 없을 때 (기본 배너)
                return (
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-[var(--bento-card-bg)] border border-divider flex flex-col md:flex-row shadow-sm transition-all hover:shadow-md">
                        <div
                            onClick={() => {
                                setFilter(prev => ({...prev, isAllTimeLow: true}));
                                setPage(0);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex-1 p-4 sm:p-5 cursor-pointer relative overflow-hidden flex items-center justify-between border-b md:border-b-0 md:border-r border-divider group hover:bg-[var(--bento-red-from)] transition-colors"
                        >
                            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[var(--bento-red-from)] to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute top-0 left-0 w-48 h-full bg-[var(--bento-red-from)] blur-3xl transform -skew-x-12 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="hidden sm:flex w-12 h-12 rounded-full bg-[var(--bento-red-from)] items-center justify-center border border-[color:var(--bento-red-border)] group-hover:scale-110 transition-transform">
                                    <Flame className="w-6 h-6 text-red-600 dark:text-red-500 animate-pulse" />
                                </div>
                                <div>
                                    <div className="text-red-600 dark:text-red-500 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider">TODAY'S HOT DEAL</div>
                                    <div className="text-primary font-black text-sm sm:text-base lg:text-lg">
                                        지금 <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-500">수많은 게임</span>이 역대 최저가 갱신 중!
                                    </div>
                                </div>
                            </div>
                            <div className="text-red-600 dark:text-red-500 font-bold text-xs sm:text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform pr-2 relative z-10">
                                <span className="hidden sm:inline">모아보기</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="flex w-full md:w-auto shrink-0 bg-base">
                            <div
                                onClick={() => navigate('/discover')}
                                className="flex-1 md:w-36 md:border-l border-r border-divider bg-[var(--bento-blue-from)] hover:bg-[color:var(--bento-blue-border-hover)] cursor-pointer flex flex-col items-center justify-center p-3 transition-colors group/discover"
                            >
                                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1 group-hover/discover:scale-110 transition-transform" />
                                <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold text-[11px] sm:text-xs">
                                    <span>신작 수집소</span>
                                    <ChevronRight className="w-3 h-3 opacity-50 group-hover/discover:translate-x-1 group-hover/discover:opacity-100 transition-all" />
                                </div>
                            </div>

                            <div
                                onClick={() => navigate('/insights')}
                                className="flex-1 md:w-36 bg-[var(--bento-purple-from)] hover:bg-[color:var(--bento-purple-border-hover)] cursor-pointer flex flex-col items-center justify-center p-3 transition-colors group/insight"
                            >
                                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1 group-hover/insight:scale-110 transition-transform" />
                                <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold text-[11px] sm:text-xs">
                                    <span>통계 인사이트</span>
                                    <ChevronRight className="w-3 h-3 opacity-50 group-hover/insight:translate-x-1 group-hover/insight:opacity-100 transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    if (loading && page === 0 && isInitialLoad) return <div className="min-h-screen pt-20 flex justify-center bg-base transition-colors duration-500"><PSLoader /></div>;

    return (
        <div className="min-h-screen text-primary relative transition-colors duration-500">
            <SEO title="게임 목록" description="플레이스테이션 게임 실시간 최저가 확인 및 할인 정보" url="https://ps-signal.com/games" />

            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-base">
                <div className="absolute inset-0 z-20 md:mix-blend-screen md:dark:mix-blend-screen opacity-40 md:opacity-50">
                    <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-500/30 rounded-full blur-[80px] md:blur-[120px] md:animate-[pulse_8s_ease-in-out_infinite]"></div>
                    <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/30 rounded-full blur-[80px] md:blur-[120px] md:animate-[pulse_10s_ease-in-out_infinite]"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[80px] md:blur-[120px] md:animate-[pulse_12s_ease-in-out_infinite]"></div>
                </div>
            </div>

            {/* 메인 컨텐츠 영역 */}
            <div className="pt-24 md:pt-32 px-6 md:px-10 pb-24 max-w-7xl mx-auto relative z-10">

                {/* 장르 파도타기 배너 */}
                {filter.genre && (
                    <div className="mb-6 relative overflow-hidden rounded-xl border border-[color:var(--bento-blue-border)] bg-[var(--bento-card-bg)] shadow-[var(--bento-blue-shadow)] group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bento-blue-from)] to-transparent animate-pulse"></div>
                        <div className="relative p-5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Waves className="w-3 h-3" /> Genre Surfing</p>
                                    <h2 className="text-xl font-black text-primary tracking-tight">'{filter.genre}' 게임 모아보기</h2>
                                </div>
                            </div>
                            <button onClick={clearGenreFilter} className="flex items-center gap-1.5 bg-base hover:bg-surface-hover border border-divider px-4 py-2 rounded-lg transition-all text-sm font-bold text-secondary hover:text-primary"><X className="w-4 h-4" /> 필터 해제</button>
                        </div>
                    </div>
                )}

                {/* PS Plus 핫딜 프로모션 배너 */}
                {psPlusDiscount && !isPsPlusBannerDismissed && (
                    <div
                        onClick={() => navigate('/ps-plus')}
                        className="mb-8 relative overflow-hidden rounded-xl bg-yellow-400 dark:bg-yellow-500 text-black p-4 sm:p-5 flex items-center justify-between shadow-[0_0_20px_rgba(250,204,21,0.25)] animate-slideDown group cursor-pointer border border-yellow-300 dark:border-yellow-400 transition-all hover:scale-[1.01]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>

                        <div className="flex items-center gap-4 relative z-10 w-full pr-8">
                            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/10 flex items-center justify-center border border-black/20 shadow-inner group-hover:bg-black/20 transition-colors">
                                <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-black drop-shadow-sm" strokeWidth={4} />
                            </div>

                            {/* 중앙 텍스트 영역 */}
                            <div className="flex flex-col">
                                <div className="font-black text-[10px] sm:text-xs mb-0.5 tracking-widest flex items-center gap-1 opacity-80">
                                    <Sparkles className="w-3 h-3"/> SPECIAL PROMOTION
                                </div>
                                <div className="font-black text-sm sm:text-base lg:text-lg leading-tight flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span>놓치지 마세요! PS Plus 12개월</span>
                                    <span className="inline-flex items-center text-white bg-black/85 px-2 py-0.5 rounded shadow-sm">
                                        <TrendingDown className="w-3.5 h-3.5 mr-1 animate-pulse" />
                                        최대 {psPlusDiscount.discountRate}% 할인 중
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 닫기 버튼 */}
                        <button
                            onClick={handleDismissBanner}
                            className="absolute right-4 z-20 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors backdrop-blur-sm"
                            aria-label="배너 닫기"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                        </button>
                    </div>
                )}

                {/* 다이내믹 인사이트 배너 */}
                {renderActionBanner()}

                <div ref={filterBoxRef} className="relative z-40 bg-glass backdrop-blur-md md:backdrop-blur-xl rounded-xl border border-divider shadow-lg mb-8 transition-colors duration-500">
                    {/* 검색 행 */}
                    <div className="flex items-center gap-3 p-4 md:p-5 pb-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="keyword"
                                placeholder="게임 제목 검색..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsDesktopSearchActive(true)}
                                onBlur={() => setTimeout(() => setIsDesktopSearchActive(false), 150)}
                                className="w-full bg-base border border-divider rounded-lg py-3 pl-12 pr-4 text-primary placeholder-muted focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all shadow-inner"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                            {isDesktopSearchActive && !isQuickSearchOpen && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-base border border-divider rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s.id}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => { setIsDesktopSearchActive(false); setSuggestions([]); setSearchInput(''); navigate(`/games/${s.id}`, { state: { background: location } }); }}
                                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-surface-hover transition-colors text-left border-b border-divider last:border-0"
                                        >
                                            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0">
                                                <PSGameImage src={s.imageUrl} className="w-full h-full object-cover" width={80} />
                                            </div>
                                            <span className="text-sm font-bold text-primary line-clamp-1">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={executeSearch}
                            className="shrink-0 px-5 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 shadow-md active:scale-95"
                        >
                            검색
                        </button>
                    </div>

                    {/* 활성 필터 요약 바 — 모바일 전용 */}
                    <div className="flex items-center gap-2 px-4 pb-3 md:hidden overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <button
                            onClick={() => setIsQuickSearchOpen(true)}
                            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold bg-surface border-divider text-secondary hover:border-ps-blue/50 hover:text-primary transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            <span>필터</span>
                            {isFilterActive && (
                                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-ps-blue text-white text-[9px] font-black leading-none">
                                    {[
                                        filter.sort !== 'lastUpdated,desc' && !filter.isBestSeller && !filter.isMostDownloaded,
                                        !!filter.minDiscountRate, isPriceFilterActive, isPlayTimeFilterActive,
                                        !!filter.minMetaScore, !!filter.platform,
                                        filter.isPlusExclusive, filter.inCatalog, filter.isPs5ProEnhanced,
                                        filter.isAllTimeLow,
                                    ].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                        {isFilterActive && <div className="shrink-0 w-px h-4 bg-divider-strong" />}
                        {filter.sort !== 'lastUpdated,desc' && !filter.isBestSeller && !filter.isMostDownloaded && (() => {
                            const opt = sortOptions.find(o => o.value === filter.sort);
                            return (
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-blue-500/15 border-blue-500/40 text-blue-400 text-xs font-bold whitespace-nowrap">
                                    <span>{opt?.label}</span>
                                    <button onClick={() => { setFilter(p => ({...p, sort: 'lastUpdated,desc'})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {!!filter.minDiscountRate && (() => {
                            const opt = discountOptions.find(o => o.value === filter.minDiscountRate);
                            return (
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-red-500/15 border-red-500/40 text-red-400 text-xs font-bold whitespace-nowrap">
                                    <span>{opt?.label}</span>
                                    <button onClick={() => { setFilter(p => ({...p, minDiscountRate: ''})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {isPriceFilterActive && (() => {
                            const fmt = (val) => { const n = Number(val); if (n < 10000) return n.toLocaleString(); const m = n/10000; return `${m%1===0?m:m.toFixed(1)}만`; };
                            const min = filter.minPrice ? fmt(filter.minPrice) : '';
                            const max = filter.maxPrice ? fmt(filter.maxPrice) : '';
                            const label = min && max ? `${min}~${max}` : min ? `${min}~` : `~${max}`;
                            return (
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-green-500/15 border-green-500/40 text-green-400 text-xs font-bold whitespace-nowrap">
                                    <span>{label}</span>
                                    <button onClick={handlePriceReset} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {isPlayTimeFilterActive && (() => {
                            const preset = PLAYTIME_PRESETS.find(p => p.id === selectedPlayTimeId);
                            return (
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-teal-500/15 border-teal-500/40 text-teal-400 text-xs font-bold whitespace-nowrap">
                                    <span>{preset?.label || '플탐'}</span>
                                    <button onClick={() => { setSelectedPlayTimeId(null); setFilter(p => ({...p, minPlayTime: '', maxPlayTime: ''})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {!!filter.minMetaScore && (() => {
                            const opt = metaScoreOptions.find(o => o.value === filter.minMetaScore);
                            return (
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-purple-500/15 border-purple-500/40 text-purple-400 text-xs font-bold whitespace-nowrap">
                                    <span>{opt?.value}점+</span>
                                    <button onClick={() => { setFilter(p => ({...p, minMetaScore: ''})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {!!filter.platform && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-indigo-500/15 border-indigo-500/40 text-indigo-400 text-xs font-bold whitespace-nowrap">
                                <span>{filter.platform}</span>
                                <button onClick={() => { setFilter(p => ({...p, platform: ''})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        {filter.isPlusExclusive && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-yellow-500/15 border-yellow-500/40 text-yellow-400 text-xs font-bold whitespace-nowrap">
                                <span>PLUS</span>
                                <button onClick={() => { setFilter(p => ({...p, isPlusExclusive: false})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        {filter.inCatalog && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-yellow-500/15 border-yellow-500/40 text-yellow-400 text-xs font-bold whitespace-nowrap">
                                <span>스페셜</span>
                                <button onClick={() => { setFilter(p => ({...p, inCatalog: false})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        {filter.isPs5ProEnhanced && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-primary/10 border-primary/30 text-primary text-xs font-bold whitespace-nowrap">
                                <span>Pro</span>
                                <button onClick={() => { setFilter(p => ({...p, isPs5ProEnhanced: false})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        {filter.isAllTimeLow && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border bg-green-500/15 border-green-500/40 text-green-500 text-xs font-bold whitespace-nowrap">
                                <Circle className="w-3 h-3 fill-green-500" />
                                <span>역대최저</span>
                                <button onClick={() => { setFilter(p => ({...p, isAllTimeLow: false})); setPage(0); }} className="ml-0.5 p-1 -mr-1 hover:text-red-400 transition-colors active:scale-95"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                    </div>

                    {/* 탐색 조건 프리셋 행 — PC 전용 */}
                    {(presets.length > 0 || isFilterActive) && (
                    <div className="hidden md:flex items-center flex-wrap gap-2 px-4 md:px-5 pt-2 pb-1">
                        {presets.map(preset => {
                            const isActive = activePresetId === preset.id;
                            const isMenuOpen = presetMenuOpenId === preset.id;
                            return (
                                <div key={preset.id} className="relative shrink-0">
                                    <button
                                        onClick={() => isActive ? setActivePresetId(null) : applyPreset(preset)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                            ${isActive
                                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                                : 'bg-surface border-divider text-secondary hover:border-amber-400/50 hover:text-amber-400'}`}
                                    >
                                        {isActive && <Check className="w-3 h-3" strokeWidth={3} />}
                                        <span>{preset.name}</span>
                                        <span className={`w-px h-3 mx-0.5 ${isActive ? 'bg-amber-400/30' : 'bg-divider'}`} />
                                        <span
                                            onMouseDown={e => e.stopPropagation()}
                                            onClick={e => { e.stopPropagation(); setPresetMenuOpenId(isMenuOpen ? null : preset.id); }}
                                            className={`flex items-center p-0.5 rounded-full transition-colors ${isActive ? 'hover:bg-amber-400/20' : 'hover:bg-surface-hover'}`}
                                        >
                                            <MoreHorizontal className={`w-3.5 h-3.5 ${isActive ? '' : 'text-muted'}`} />
                                        </span>
                                    </button>
                                    {isMenuOpen && (
                                        <div onMouseDown={e => e.stopPropagation()} className="absolute top-full left-0 mt-1 bg-base border border-divider rounded-xl shadow-lg z-50 w-44 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                                            <button onClick={() => { handleEditPresetName(preset); setPresetMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-colors rounded-t-xl">이름 수정</button>
                                            <button onClick={() => handleOverwritePreset(preset)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-colors">현재 조건으로 덮어쓰기</button>
                                            <div className="border-t border-divider" />
                                            <button onClick={() => handleDeletePreset(preset)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-surface-hover transition-colors rounded-b-xl">삭제</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {presets.length < 5 && isFilterActive && (
                            <button
                                onClick={handleSavePreset}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all whitespace-nowrap border-dashed border-divider text-muted hover:border-amber-400/50 hover:text-amber-400 active:scale-95"
                            >
                                <Bookmark className="w-3 h-3" />
                                현재 조건 저장
                            </button>
                        )}
                        {presets.length >= 5 && isFilterActive && (
                            <span className="shrink-0 text-[10px] text-muted px-1">최대 5개 저장됨</span>
                        )}
                    </div>
                    )}

                    {/* 활성 프리셋 표시 — 모바일 전용 */}
                    {activePresetId && (() => {
                        const activePreset = presets.find(p => p.id === activePresetId);
                        if (!activePreset) return null;
                        const isMenuOpen = presetMenuOpenId === activePreset.id;
                        return (
                            <div className="flex md:hidden items-center px-4 pt-2 pb-1">
                                <div className="relative shrink-0">
                                    <button
                                        onClick={() => setActivePresetId(null)}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] active:scale-95 transition-all whitespace-nowrap"
                                    >
                                        <Check className="w-3 h-3" strokeWidth={3} />
                                        <span>{activePreset.name}</span>
                                        <span className="w-px h-3 bg-amber-400/30 mx-0.5" />
                                        <span
                                            onMouseDown={e => e.stopPropagation()}
                                            onClick={e => { e.stopPropagation(); setPresetMenuOpenId(isMenuOpen ? null : activePreset.id); }}
                                            className="flex items-center p-0.5 rounded-full hover:bg-amber-400/20 transition-colors"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </span>
                                    </button>
                                    {isMenuOpen && (
                                        <div onMouseDown={e => e.stopPropagation()} className="absolute top-full left-0 mt-1 bg-base border border-divider rounded-xl shadow-lg z-50 w-44 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                                            <button onClick={() => { handleEditPresetName(activePreset); setPresetMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-colors rounded-t-xl">이름 수정</button>
                                            <button onClick={() => handleOverwritePreset(activePreset)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-colors">현재 조건으로 덮어쓰기</button>
                                            <div className="border-t border-divider" />
                                            <button onClick={() => handleDeletePreset(activePreset)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-surface-hover transition-colors rounded-b-xl">삭제</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* 필터 Pill 행 — PC 전용 */}
                    <div className="relative hidden md:block">
                    <div className="flex items-center gap-2 px-4 md:px-5 pb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {/* 정렬 */}
                        {(() => {
                            const isLocked = filter.isBestSeller || filter.isMostDownloaded;
                            const sortOpt = sortOptions.find(o => o.value === filter.sort) || sortOptions[0];
                            const isActive = filter.sort !== 'lastUpdated,desc';
                            return (
                                <button
                                    disabled={isLocked}
                                    onClick={() => !isLocked && setExpandedPill(expandedPill === 'sort' ? null : 'sort')}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                        ${isLocked ? 'opacity-50 cursor-not-allowed bg-surface border-divider text-muted' :
                                            isActive ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                                            expandedPill === 'sort' ? 'bg-surface border-ps-blue text-ps-blue' :
                                            'bg-surface border-divider text-secondary hover:border-ps-blue/50 hover:text-primary'}`}
                                >
                                    {isLocked ? <Lock className="w-3 h-3" /> : <sortOpt.icon className={`w-3 h-3 ${isActive ? 'text-blue-400' : sortOpt.color}`} />}
                                    <span>{isLocked ? '랭킹순' : (isActive ? sortOpt.label : '정렬')}</span>
                                    {isActive && !isLocked
                                        ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, sort: 'lastUpdated,desc'})); setExpandedPill(null); setPage(0); }} />
                                        : !isLocked && <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'sort' ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                            );
                        })()}

                        <div className="shrink-0 w-px h-4 bg-divider-strong mx-0.5" />

                        {/* 할인율 */}
                        {(() => {
                            const isActive = filter.minDiscountRate !== '';
                            const activeOpt = discountOptions.find(o => o.value === filter.minDiscountRate);
                            return (
                                <button
                                    onClick={() => setExpandedPill(expandedPill === 'discount' ? null : 'discount')}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                        ${isActive ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
                                            expandedPill === 'discount' ? 'bg-surface border-red-400/40 text-red-400' :
                                            'bg-surface border-divider text-secondary hover:border-red-400/30 hover:text-primary'}`}
                                >
                                    <Percent className="w-3 h-3" />
                                    <span>{isActive ? activeOpt?.label : '할인율'}</span>
                                    {isActive
                                        ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, minDiscountRate: ''})); setExpandedPill(null); setPage(0); }} />
                                        : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'discount' ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                            );
                        })()}

                        {/* 가격 */}
                        {(() => {
                            const isActive = isPriceFilterActive;
                            return (
                                <button
                                    onClick={() => setExpandedPill(expandedPill === 'price' ? null : 'price')}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                        ${isActive ? 'bg-green-500/15 border-green-500/40 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                                            expandedPill === 'price' ? 'bg-surface border-green-400/40 text-green-400' :
                                            'bg-surface border-divider text-secondary hover:border-green-400/30 hover:text-primary'}`}
                                >
                                    <Banknote className="w-3 h-3" />
                                    <span>{isActive ? `${filter.minPrice ? `${Number(filter.minPrice).toLocaleString()}원` : '0원'}~${filter.maxPrice ? `${Number(filter.maxPrice).toLocaleString()}원` : '최대'}` : '가격'}</span>
                                    {isActive
                                        ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, minPrice: '', maxPrice: ''})); setPriceRange({min: '', max: ''}); setExpandedPill(null); setPage(0); }} />
                                        : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'price' ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                            );
                        })()}

                        {/* 플탐 */}
                        {(() => {
                            const isActive = isPlayTimeFilterActive;
                            const preset = PLAYTIME_PRESETS.find(p => p.id === selectedPlayTimeId);
                            const PtIcon = preset?.icon || Timer;
                            return (
                                <button
                                    onClick={() => setExpandedPill(expandedPill === 'playtime' ? null : 'playtime')}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                        ${isActive ? 'bg-teal-500/15 border-teal-500/40 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]' :
                                            expandedPill === 'playtime' ? 'bg-surface border-teal-400/40 text-teal-400' :
                                            'bg-surface border-divider text-secondary hover:border-teal-400/30 hover:text-primary'}`}
                                >
                                    <PtIcon className="w-3 h-3" />
                                    <span>{isActive ? preset?.label : '플탐'}</span>
                                    {isActive
                                        ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, minPlayTime: '', maxPlayTime: ''})); setSelectedPlayTimeId(null); setExpandedPill(null); setPage(0); }} />
                                        : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'playtime' ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                            );
                        })()}

                        {/* 평점 */}
                        {(() => {
                            const isActive = filter.minMetaScore !== '';
                            const activeOpt = metaScoreOptions.find(o => o.value === filter.minMetaScore);
                            return (
                                <button
                                    onClick={() => setExpandedPill(expandedPill === 'metaScore' ? null : 'metaScore')}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                        ${isActive ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' :
                                            expandedPill === 'metaScore' ? 'bg-surface border-purple-400/40 text-purple-400' :
                                            'bg-surface border-divider text-secondary hover:border-purple-400/30 hover:text-primary'}`}
                                >
                                    <Star className="w-3 h-3" />
                                    <span>{isActive ? `${activeOpt?.value}점+` : '평점'}</span>
                                    {isActive
                                        ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, minMetaScore: ''})); setExpandedPill(null); setPage(0); }} />
                                        : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'metaScore' ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                            );
                        })()}

                        {/* 플랫폼 */}
                        {(() => {
                            const isActive = filter.platform !== '';
                            const activeOpt = platformOptions.find(o => o.value === filter.platform);
                            return (
                                <button
                                    onClick={() => setExpandedPill(expandedPill === 'platform' ? null : 'platform')}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                        ${isActive ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' :
                                            expandedPill === 'platform' ? 'bg-surface border-indigo-400/40 text-indigo-400' :
                                            'bg-surface border-divider text-secondary hover:border-indigo-400/30 hover:text-primary'}`}
                                >
                                    <MonitorPlay className="w-3 h-3" />
                                    <span>{isActive ? activeOpt?.label : '플랫폼'}</span>
                                    {isActive
                                        ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, platform: ''})); setExpandedPill(null); setPage(0); }} />
                                        : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'platform' ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                            );
                        })()}

                        <div className="shrink-0 w-px h-4 bg-divider-strong mx-0.5" />

                        {/* PLUS 토글 */}
                        <button
                            onClick={() => { setFilter(prev => ({...prev, isPlusExclusive: !prev.isPlusExclusive})); setPage(0); }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                ${filter.isPlusExclusive ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'bg-surface border-divider text-secondary hover:border-yellow-400/30 hover:text-primary'}`}
                        >
                            <Plus className="w-3 h-3" strokeWidth={3} />
                            <span className={filter.isPlusExclusive ? 'font-black' : ''}>PLUS</span>
                            {filter.isPlusExclusive && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>

                        {/* 스페셜 토글 */}
                        <button
                            onClick={() => { setFilter(prev => ({...prev, inCatalog: !prev.inCatalog})); setPage(0); }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                ${filter.inCatalog ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'bg-surface border-divider text-secondary hover:border-yellow-400/30 hover:text-primary'}`}
                        >
                            <Gamepad2 className="w-3 h-3" />
                            <span>스페셜</span>
                            {filter.inCatalog && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>

                        {/* PS5 Pro 토글 */}
                        <button
                            onClick={() => { setFilter(prev => ({...prev, isPs5ProEnhanced: !prev.isPs5ProEnhanced})); setPage(0); }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                ${filter.isPs5ProEnhanced ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(255,255,255,0.08)]' : 'bg-surface border-divider text-secondary hover:border-divider-strong hover:text-primary'}`}
                        >
                            <Sparkles className="w-3 h-3" />
                            <span>Pro</span>
                            {filter.isPs5ProEnhanced && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>

                        {/* 역대최저 토글 */}
                        <button
                            onClick={() => { setFilter(prev => ({...prev, isAllTimeLow: !prev.isAllTimeLow})); setPage(0); }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                ${filter.isAllTimeLow ? 'bg-green-500/15 border-green-500/40 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-surface border-divider text-secondary hover:border-green-500/30 hover:text-primary'}`}
                        >
                            <Circle className={`w-3 h-3 ${filter.isAllTimeLow ? 'fill-green-500 text-green-500' : ''}`} />
                            <span>역대최저</span>
                            {filter.isAllTimeLow && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>
                    </div>
                    {/* 우측 페이드 — 더 있음 암시 */}
                    <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-14 bg-gradient-to-l from-glass to-transparent rounded-r-xl" />
                    </div>

                    {/* 확장 패널 */}
                    {expandedPill && (
                        <div className="border-t border-divider px-4 md:px-5 py-3 animate-fadeIn">
                            {expandedPill === 'sort' && (
                                <div className="flex flex-wrap gap-2">
                                    {sortOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(prev => ({...prev, sort: opt.value})); setExpandedPill(null); setPage(0); window.scrollTo({top:0,behavior:'smooth'}); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.sort === opt.value ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
                                        >
                                            <opt.icon className={`w-3 h-3 ${filter.sort === opt.value ? 'text-blue-400' : opt.color}`} />
                                            {opt.label}
                                            {filter.sort === opt.value && <Check className="w-3 h-3" strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {expandedPill === 'discount' && (
                                <div className="flex flex-wrap gap-2">
                                    {discountOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(prev => ({...prev, minDiscountRate: opt.value})); setExpandedPill(null); setPage(0); window.scrollTo({top:0,behavior:'smooth'}); }}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.minDiscountRate === opt.value ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {expandedPill === 'price' && (
                                <div className="flex items-center gap-2 max-w-sm">
                                    <div className="relative flex-1">
                                        <input type="number" min="0" placeholder="최소" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} className="w-full bg-base border border-divider rounded-lg pl-3 pr-8 py-2 text-primary text-xs focus:border-ps-blue outline-none transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">원</span>
                                    </div>
                                    <span className="text-secondary font-bold text-xs shrink-0">~</span>
                                    <div className="relative flex-1">
                                        <input type="number" min="0" placeholder="최대" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} className="w-full bg-base border border-divider rounded-lg pl-3 pr-8 py-2 text-primary text-xs focus:border-ps-blue outline-none transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">원</span>
                                    </div>
                                    <button onClick={handlePriceApply} className="shrink-0 px-4 py-2 bg-ps-blue text-white rounded-full text-xs font-bold hover:bg-blue-600 active:scale-95 shadow-[0_0_10px_rgba(59,130,246,0.3)]">적용</button>
                                    {isPriceFilterActive && <button onClick={handlePriceReset} className="shrink-0 px-4 py-2 bg-surface border border-divider text-secondary rounded-full text-xs font-bold hover:text-primary active:scale-95">초기화</button>}
                                </div>
                            )}
                            {expandedPill === 'playtime' && (
                                <div className="flex flex-wrap gap-2">
                                    {PLAYTIME_PRESETS.map(preset => {
                                        const Icon = preset.icon;
                                        const isSelected = selectedPlayTimeId === preset.id;
                                        return (
                                            <button key={preset.id}
                                                onClick={() => { handlePlayTimeSelect(preset, false); setExpandedPill(null); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                    ${isSelected ? 'bg-teal-500/15 border-teal-500/40 text-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.2)]' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
                                            >
                                                <Icon className={`w-3 h-3 ${isSelected ? 'text-teal-400' : preset.color}`} />
                                                {preset.label}
                                                <span className="opacity-50">{preset.range}</span>
                                                {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                            </button>
                                        );
                                    })}
                                    {isPlayTimeFilterActive && (
                                        <button onClick={() => { handlePlayTimeSelect(null, false); setExpandedPill(null); }}
                                            className="px-3 py-1.5 rounded-full border text-xs font-bold bg-surface border-divider text-secondary hover:text-primary transition-all active:scale-95">
                                            전체 시간
                                        </button>
                                    )}
                                </div>
                            )}
                            {expandedPill === 'metaScore' && (
                                <div className="flex flex-wrap gap-2">
                                    {metaScoreOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(prev => ({...prev, minMetaScore: opt.value})); setExpandedPill(null); setPage(0); window.scrollTo({top:0,behavior:'smooth'}); }}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.minMetaScore === opt.value ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {expandedPill === 'platform' && (
                                <div className="flex flex-wrap gap-2">
                                    {platformOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(prev => ({...prev, platform: opt.value})); setExpandedPill(null); setPage(0); window.scrollTo({top:0,behavior:'smooth'}); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.platform === opt.value ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)]' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
                                        >
                                            <MonitorPlay className="w-3 h-3" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!isFilterActive && <TrendingGamesWidget />}

                {!loading && <p className="text-muted text-sm mb-4 text-right">총 <span className="text-primary font-bold">{totalElements.toLocaleString()}</span>개의 게임이 검색되었습니다.</p>}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {loading && page === 0 && !isInitialLoad ? (
                        Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />)
                    ) : (
                        games.length > 0 ? games.map((game, index) => {
                            const isLastElement = games.length === index + 1;

                            const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                            const isClosing = !isLastCall && daysLeft <= 3;

                            const rankToDisplay = filter.isBestSeller ? game.bestSellerRank
                                : filter.isMostDownloaded ? game.mostDownloadedRank
                                    : null;
                            const currentPrice = game.currentPrice || game.price;
                            return (
                                <div
                                    key={game.id}
                                    ref={isLastElement ? lastGameElementRef : null}
                                    onClick={() => navigate(`/games/${game.id}`, { state: { background: location } })}
                                    className={`group bg-glass backdrop-blur-md rounded-xl overflow-hidden hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-300 ease-out shadow-lg cursor-pointer border relative flex flex-col h-full ${game.priceVerdict === 'BUY_NOW' ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-divider hover:border-[color:var(--bento-blue-border-hover)] hover:[box-shadow:var(--bento-blue-shadow)]'}`}
                                >
                                    <div
                                        className="aspect-[3/4] overflow-hidden relative shrink-0 bg-base"
                                    >
                                        <PSGameImage
                                            src={game.imageUrl}
                                            alt={game.name}
                                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                                            priority={index < 4}
                                            width={640}
                                        />

                                        {rankToDisplay && (
                                            <div className={`absolute top-0 left-0 z-30 px-2 py-0.5 rounded-br-xl flex items-center shadow-lg backdrop-blur-md border-b border-r overflow-hidden
                                                ${rankToDisplay === 1 ? 'bg-glass border-yellow-500/40' :
                                                rankToDisplay === 2 ? 'bg-glass border-gray-400/40' :
                                                    rankToDisplay === 3 ? 'bg-glass border-amber-600/40' :
                                                        'bg-glass border-divider'}`}>
                                                {rankToDisplay > 3 && <div className="absolute top-0 left-0 w-0.5 h-full bg-ps-blue shadow-[0_0_5px_rgba(0,67,156,0.8)]"></div>}
                                                {rankToDisplay <= 3 && <Trophy className={`w-3 h-3 mr-1 ${rankToDisplay === 1 ? 'text-yellow-400' : rankToDisplay === 2 ? 'text-gray-400' : 'text-amber-500'}`} />}
                                                <span className={`text-[11px] font-black tracking-tight drop-shadow-md ${rankToDisplay === 1 ? 'text-yellow-400' : rankToDisplay === 2 ? 'text-gray-400' : rankToDisplay === 3 ? 'text-amber-500' : 'text-primary ml-0.5'}`}>
                                                    {rankToDisplay}위
                                                </span>
                                            </div>
                                        )}

                                        {isNew && <span className={`absolute left-2 bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 transition-all ${rankToDisplay ? 'top-8' : 'top-2'}`}>NEW</span>}
                                        {isLastCall && <span className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 막차!</span>}
                                        {isClosing && <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}

                                        <button onClick={(e) => handleLike(e, game.id)} className={`absolute bottom-12 right-2 p-2 rounded-full transition-all transform hover:scale-110 z-20 shadow-lg backdrop-blur-sm ${game.liked ? 'bg-red-500/20 text-red-500' : 'bg-glass text-secondary hover:bg-[var(--bento-red-from)] hover:text-red-500'}`}>
                                            <Heart className={`w-5 h-5 ${game.liked ? 'fill-current' : ''}`} />
                                        </button>

                                        {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}

                                        {game.inCatalog && (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(250,204,21,0.6)] z-10 flex items-center gap-1 animate-pulse-slow">
                                                <Gamepad2 className="w-3 h-3 fill-black" /> EXTRA
                                            </span>
                                        )}
                                        {!game.inCatalog && game.isPlusExclusive && (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow-md">PLUS</span>
                                        )}
                                    </div>

                                    <div className="p-4 flex flex-col flex-1 bg-transparent relative z-20">
                                        <div className="flex flex-wrap gap-1 mb-2 min-h-[22px] items-center">
                                            {game.isPs5ProEnhanced && <span className="text-[10px] px-1.5 py-0.5 rounded border font-black bg-gradient-to-r from-gray-300 to-white text-black border-white shadow-[0_0_8px_rgba(255,255,255,0.4)] tracking-wider">PRO</span>}
                                            {game.genres && game.genres.length > 0 ? (
                                                <>
                                                    {game.genres.slice(0, 2).map((g, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-colors ${getGenreBadgeStyle(g)}`}>{g}</span>)}
                                                    {game.genres.length > 2 && <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-surface text-muted border-divider">+{game.genres.length - 2}</span>}
                                                </>
                                            ) : (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-surface text-secondary border-divider">미분류</span>
                                            )}
                                        </div>

                                        {game.pioneerName && (
                                            <div className="self-start inline-flex items-center gap-1.5 mb-3 -ml-4 bg-surface border-y border-r border-divider border-l-[4px] border-l-ps-blue py-1 pl-3 pr-4 rounded-r-lg shadow-md">
                                                <Pickaxe className="w-3.5 h-3.5 text-ps-blue drop-shadow-sm" />
                                                <span className="text-[10.5px] sm:text-xs font-black text-ps-blue truncate max-w-[130px] sm:max-w-[160px]">{game.pioneerName}</span>
                                            </div>
                                        )}

                                        <h3 className="text-sm font-bold text-primary leading-[1.3] line-clamp-2 h-[2.6em] overflow-hidden mb-3 group-hover:text-ps-blue transition-colors relative z-20">
                                            {game.name.trim()}
                                        </h3>

                                        <div className="mt-auto relative z-20">
                                            {game.priceVerdict === 'BUY_NOW' && <p className="text-[9px] font-black text-green-500 tracking-wider flex items-center gap-0.5 mb-0.5"><Flame className="w-2.5 h-2.5" />역대최저</p>}
                                            {game.priceVerdict === 'GOOD_OFFER' && <p className="text-[9px] font-black text-amber-500 tracking-wider flex items-center gap-0.5 mb-0.5"><TrendingDown className="w-2.5 h-2.5" />괜찮은 가격</p>}
                                            {game.priceVerdict === 'WAIT' && <p className="text-[9px] font-black text-red-400/80 tracking-wider flex items-center gap-0.5 mb-0.5"><Clock className="w-2.5 h-2.5" />지금비싼편</p>}
                                            {game.discountRate > 0 && <p className="whitespace-nowrap text-xs text-muted line-through mb-1">{game.originalPrice?.toLocaleString()}원</p>}
                                            <div className="flex justify-between items-end gap-1 sm:gap-2 w-full">
                                                <p className="whitespace-nowrap text-base sm:text-lg font-black text-primary tracking-tight">
                                                    {game.currentPrice?.toLocaleString() || game.price?.toLocaleString()}
                                                    <span className="text-xs sm:text-sm font-medium ml-0.5">원</span>
                                                </p>

                                                {game.displayScore && (
                                                    <div className="shrink-0 flex items-center shadow-sm rounded border border-divider overflow-hidden bg-surface">

                                                        <div className={`px-1.5 py-0.5 text-[10px] font-black flex items-center justify-center
                                                        ${game.scoreSource === 'MC'
                                                            ? 'bg-black text-white dark:bg-white dark:text-black'
                                                            : 'bg-[var(--bento-purple-from)] text-purple-700 dark:text-purple-300'}`}>
                                                            {game.scoreSource === 'MC' ? 'M' : 'I'}
                                                        </div>

                                                        <span className={`px-1.5 py-0.5 text-[11px] font-black tracking-tight
                                                        ${game.scoreSource === 'MC'
                                                            ? (game.displayScore >= 75 ? 'text-green-600 dark:text-green-400 bg-green-500/10'
                                                                : game.displayScore >= 50 ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10'
                                                                    : 'text-red-600 dark:text-red-400 bg-red-500/10')
                                                            : 'text-primary'}`}>
                                                        {game.displayScore}
                                                    </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            !loading && (
                                <div className="col-span-full text-center py-20 flex flex-col items-center gap-5">
                                    <Gamepad2 className="w-12 h-12 text-muted" />
                                    <p className="text-secondary font-bold">검색 결과가 없습니다.</p>
                                    <button
                                        onClick={handleResetAllFilters}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-divider rounded-xl text-sm font-bold text-secondary hover:text-primary hover:bg-surface-hover hover:border-divider-strong transition-all shadow-sm active:scale-95"
                                    >
                                        <X className="w-4 h-4 shrink-0" />
                                        <span className="hidden sm:inline">필터 전체 초기화</span>
                                        <span className="sm:hidden">초기화</span>
                                    </button>
                                </div>
                            )
                        )
                    )}
                </div>

                {!loading && games.length > 0 && page >= totalPages - 1 && (
                    <div className="py-16 text-center flex flex-col items-center gap-3 opacity-50 border-t border-divider mt-10">
                        <Gamepad2 className="w-8 h-8 text-secondary" />
                        <p className="text-secondary font-bold text-sm">모든 게임을 다 보셨습니다 🎮</p>
                    </div>
                )}
                {loading && page > 0 && (
                    <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ps-blue"></div></div>
                )}

                {/* 스마트 플로팅 바 */}
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out ${isFloatingVisible ? 'translate-y-0' : 'translate-y-24'}`}>
                    <div className="flex items-center gap-2 bg-glass backdrop-blur-md md:backdrop-blur-xl border border-divider p-2 pl-4 rounded-full shadow-glow">
                        <button onClick={() => setIsQuickSearchOpen(true)} className="group flex items-center justify-center w-10 h-10 rounded-full bg-glass backdrop-blur-sm border border-divider hover:border-ps-blue/50 hover:shadow-[0_0_10px_rgba(0,67,156,0.2)] transition-all active:scale-95" title="빠른 검색"><Search className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" /></button>

                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center justify-center w-10 h-10 rounded-full bg-glass backdrop-blur-sm border border-divider hover:border-green-500/50 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all active:scale-95" title="맨 위로"><Triangle className="w-5 h-5 text-green-500 fill-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] group-hover:-translate-y-1 transition-transform" /></button>

                        <div className="w-[1px] h-6 bg-divider mx-1"></div>
                        <button onClick={handleContactClick} className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all border border-[color:var(--bento-blue-border)] bg-[var(--bento-blue-from)] hover:border-[color:var(--bento-blue-border-hover)] relative overflow-hidden" title="문의 및 제휴">
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-ps-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] group-hover:scale-110 transition-transform" />
                        </button>
                        <div className="w-[1px] h-6 bg-divider mx-1"></div>
                        <button onClick={() => setIsDonationOpen(true)} className="group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all border border-[color:var(--bento-yellow-border)] bg-[var(--bento-yellow-from)] hover:border-[color:var(--bento-yellow-border-hover)] relative overflow-hidden" title="감자 서버 밥 주기">
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] group-hover:scale-110 group-hover:-rotate-12 transition-transform" />
                            <span className="text-xs sm:text-sm font-black text-yellow-600 dark:text-yellow-500 whitespace-nowrap drop-shadow-md">감자 서버 밥 주기</span>
                        </button>
                    </div>
                </div>

                <div className={`fixed inset-x-0 bottom-0 z-[60] transition-transform duration-300 ease-in-out ${isQuickSearchOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={() => setIsQuickSearchOpen(false)}>
                    <div className="bg-base border-t border-divider rounded-t-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.5)] max-w-3xl mx-auto max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

                        {/* 드래그 핸들 (스와이프 닫기) */}
                        <div
                            className="shrink-0 flex justify-center pt-3 pb-2 cursor-grab touch-none"
                            onTouchStart={(e) => { swipeStartYRef.current = e.touches[0].clientY; }}
                            onTouchEnd={(e) => { if (e.changedTouches[0].clientY - swipeStartYRef.current > 60) setIsQuickSearchOpen(false); }}
                        >
                            <div className="w-10 h-1 rounded-full bg-divider-strong opacity-50" />
                        </div>

                        {/* 스크롤 가능 콘텐츠 */}
                        <div className="flex-1 overflow-y-auto px-6 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* 헤더 */}
                            <div className="flex justify-between items-center mb-5 sticky top-0 bg-base py-4 z-10 border-b border-divider">
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-ps-blue" />
                                    <h3 className="text-lg font-black text-primary">퀵 서치</h3>
                                    <span className="text-[9px] font-black text-ps-blue bg-ps-blue/10 border border-ps-blue/30 px-2 py-0.5 rounded-full tracking-widest">QUICK SCAN</span>
                                </div>
                                <button onClick={() => setIsQuickSearchOpen(false)} className="p-2 bg-surface hover:bg-[var(--bento-red-from)] rounded-full transition-colors active:scale-95"><X className="w-4 h-4 text-secondary"/></button>
                            </div>

                            <div className="flex flex-col gap-8 pb-6">
                                {/* 나의 탐색 프리셋 */}
                                {(isAuthenticated && (presets.length > 0 || isFilterActive)) || (!isAuthenticated && isFilterActive) ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 tracking-widest uppercase"><Bookmark className="w-3 h-3" /> MY PRESETS</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {presets.map(preset => {
                                                const isActive = activePresetId === preset.id;
                                                const isMenuOpen = presetMenuOpenId === preset.id;
                                                return (
                                                    <div key={preset.id} className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => { isActive ? setActivePresetId(null) : applyPreset(preset); if (!isActive) setIsQuickSearchOpen(false); }}
                                                                className={`flex items-center gap-2 flex-1 px-4 py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95
                                                                    ${isActive
                                                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                                                        : 'bg-surface border-divider text-secondary'}`}
                                                            >
                                                                {isActive && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
                                                                <span className="flex-1 text-left">{preset.name}</span>
                                                            </button>
                                                            <button
                                                                onMouseDown={e => e.stopPropagation()}
                                                                onClick={() => setPresetMenuOpenId(isMenuOpen ? null : preset.id)}
                                                                className={`p-3 rounded-2xl border active:scale-95 transition-colors shrink-0
                                                                    ${isActive
                                                                        ? 'bg-surface border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                                                                        : 'bg-surface border-divider text-muted hover:text-secondary hover:border-divider-strong'}`}
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        {isMenuOpen && (
                                                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                                <button onMouseDown={e => e.stopPropagation()} onClick={() => { handleEditPresetName(preset); setPresetMenuOpenId(null); }} className="flex-1 py-2.5 text-xs font-bold text-secondary bg-surface border border-divider rounded-xl hover:bg-surface-hover active:scale-95 transition-colors">이름 수정</button>
                                                                <button onMouseDown={e => e.stopPropagation()} onClick={() => handleOverwritePreset(preset)} className="flex-1 py-2.5 text-xs font-bold text-secondary bg-surface border border-divider rounded-xl hover:bg-surface-hover active:scale-95 transition-colors">덮어쓰기</button>
                                                                <button onMouseDown={e => e.stopPropagation()} onClick={() => handleDeletePreset(preset)} className="flex-1 py-2.5 text-xs font-bold text-red-400 bg-surface border border-red-400/30 rounded-xl hover:bg-surface-hover active:scale-95 transition-colors">삭제</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {presets.length < 5 && isFilterActive && (
                                                <button
                                                    onClick={handleSavePreset}
                                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl border border-dashed border-divider text-sm font-bold text-muted active:scale-95 transition-colors"
                                                >
                                                    <Bookmark className="w-4 h-4" />
                                                    현재 조건 저장
                                                </button>
                                            )}
                                            {presets.length >= 5 && isFilterActive && (
                                                <p className="text-[10px] text-muted text-center py-1">최대 5개까지 저장할 수 있어요</p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                {/* 최근 열어본 게임 */}
                                {recentGames.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 tracking-widest uppercase"><Clock className="w-3 h-3" /> RECENT</span>
                                            <button
                                                onClick={() => { clearRecentGames(); setRecentGames([]); }}
                                                className="text-[10px] font-bold text-muted hover:text-red-400 transition-colors"
                                            >
                                                초기화
                                            </button>
                                        </div>
                                        <div
                                            ref={recentGamesScrollRef}
                                            className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                            onPointerDown={handleRecentGamesDragStart}
                                            onPointerMove={handleRecentGamesDragMove}
                                            onPointerUp={handleRecentGamesDragEnd}
                                            onPointerCancel={handleRecentGamesDragEnd}
                                            onDragStart={(e) => e.preventDefault()}
                                        >
                                            {recentGames.map((g) => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => { if (dragStateRef.current.hasDragged) return; setIsQuickSearchOpen(false); navigate(`/games/${g.id}`, { state: { background: location } }); }}
                                                    className="shrink-0 snap-center w-24 flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface border border-divider hover:border-ps-blue/50 hover:bg-surface-hover transition-all active:scale-95"
                                                >
                                                    <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden">
                                                        <PSGameImage src={g.thumbnail} className="w-full h-full object-cover" width={640} />
                                                    </div>
                                                    <p className="text-xs font-bold text-primary line-clamp-1 w-full text-center">{g.title}</p>
                                                    <div className="flex items-center gap-1">
                                                        {g.priceVerdict === 'BUY_NOW' && <Circle className="w-3 h-3 text-green-500 fill-green-500" />}
                                                        {g.priceVerdict === 'GOOD_OFFER' && <Triangle className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                                                        {g.priceVerdict === 'WAIT' && <X className="w-3 h-3 text-red-500" />}
                                                        {(g.priceVerdict === 'TRACKING' || !g.priceVerdict) && <Square className="w-3 h-3 text-ps-blue" />}
                                                        {g.currentPrice > 0 && (
                                                            <span className="text-[10px] font-bold text-muted">₩{g.currentPrice.toLocaleString()}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 키워드 입력 + 자동완성 */}
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-ps-blue tracking-widest uppercase mb-2"><Search className="w-3 h-3" /> KEYWORD</span>
                                    <div className="relative">
                                        <input type="text" name="keyword" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleKeyDown} className="w-full bg-surface border border-divider rounded-xl py-4 pl-12 pr-4 text-primary placeholder-muted focus:border-ps-blue outline-none transition-all shadow-inner" />
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                                    </div>
                                    {suggestions.length > 0 && (
                                        <div className="mt-2 flex flex-col gap-1">
                                            {suggestions.map((s) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setIsQuickSearchOpen(false); setSuggestions([]); setSearchInput(''); navigate(`/games/${s.id}`, { state: { background: location } }); }}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover border border-divider hover:border-ps-blue/40 transition-all text-left active:scale-[0.98]"
                                                >
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                                        <PSGameImage src={s.imageUrl} className="w-full h-full object-cover" width={80} />
                                                    </div>
                                                    <span className="text-sm font-bold text-primary line-clamp-1">{s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 할인율 */}
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-red-400 tracking-widest uppercase mb-3"><Percent className="w-3 h-3" /> DISCOUNT</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {discountOptions.map((opt) => (
                                            <button key={opt.value} onClick={() => handleQuickSelect('minDiscountRate', opt.value)}
                                                className={`w-full px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                    ${filter.minDiscountRate === opt.value
                                                        ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                                                        : 'bg-surface border-divider text-secondary hover:border-red-400/30 hover:text-primary'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 전문가 평점 */}
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 tracking-widest uppercase mb-3"><Star className="w-3 h-3" /> META SCORE</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {metaScoreOptions.map((opt) => (
                                            <button key={opt.value} onClick={() => handleQuickSelect('minMetaScore', opt.value)}
                                                className={`w-full px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                    ${filter.minMetaScore === opt.value
                                                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                                                        : 'bg-surface border-divider text-secondary hover:border-purple-400/30 hover:text-primary'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 가격대 */}
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-green-400 tracking-widest uppercase mb-2"><CircleDollarSign className="w-3 h-3" /> PRICE RANGE</span>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <input type="number" min="0" placeholder="예: 10000" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} className="w-full bg-surface border border-divider rounded-xl py-4 pl-4 pr-10 text-primary focus:border-ps-blue outline-none transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-inner" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold">원</span>
                                        </div>
                                        <span className="text-secondary font-bold">~</span>
                                        <div className="relative flex-1">
                                            <input type="number" min="0" placeholder="예: 50000" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} className="w-full bg-surface border border-divider rounded-xl py-4 pl-4 pr-10 text-primary focus:border-ps-blue outline-none transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-inner" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold">원</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 플레이 볼륨 */}
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-teal-400 tracking-widest uppercase mb-3"><Timer className="w-3 h-3" /> PLAY VOLUME</span>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {PLAYTIME_PRESETS.map((preset) => {
                                            const Icon = preset.icon;
                                            const isSelected = selectedPlayTimeId === preset.id;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => handlePlayTimeSelect(preset, true)}
                                                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 ${
                                                        isSelected
                                                            ? 'bg-teal-500/15 border-teal-500/40 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                                                            : 'bg-surface border-divider text-primary hover:bg-surface-hover hover:border-teal-400/30'
                                                    }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-teal-400/20' : 'bg-base border border-divider'}`}>
                                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-400' : preset.color}`} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-xs font-black">{preset.label}</div>
                                                        <div className={`text-[10px] font-bold ${isSelected ? 'text-teal-300' : 'text-secondary'}`}>{preset.range}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => handlePlayTimeSelect(null, true)}
                                        className="w-full mt-3 py-3 bg-surface hover:bg-surface-hover text-xs font-bold text-secondary hover:text-primary rounded-xl transition-colors border border-divider active:scale-95"
                                    >
                                        전체 볼륨
                                    </button>
                                </div>

                                {/* 정렬 */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 tracking-widest uppercase"><TrendingUp className="w-3 h-3" /> SORT MODE</span>
                                        {(filter.isBestSeller || filter.isMostDownloaded) && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> 랭킹 모드 고정됨</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {sortOptions.map((opt) => {
                                            const isLocked = filter.isBestSeller || filter.isMostDownloaded;
                                            const isActive = filter.sort === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    disabled={isLocked}
                                                    onClick={() => handleQuickSelect('sort', opt.value)}
                                                    className={`w-full flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                        ${isLocked ? 'opacity-40 cursor-not-allowed bg-surface border-divider text-muted' :
                                                          isActive ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]' :
                                                          'bg-surface border-divider text-secondary hover:border-blue-400/30 hover:text-primary'}`}
                                                >
                                                    <opt.icon className={`w-3.5 h-3.5 shrink-0 ${isLocked ? 'text-muted' : isActive ? 'text-blue-400' : opt.color}`} />
                                                    <span>{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 추가 옵션 */}
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-3"><Filter className="w-3 h-3" /> EXTRAS</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleQuickSelect('isAllTimeLow', !filter.isAllTimeLow)}
                                            className={`w-full flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                ${filter.isAllTimeLow
                                                    ? 'bg-green-500/15 border-green-500/40 text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                                                    : 'bg-surface border-divider text-secondary hover:border-green-500/30 hover:text-primary'}`}>
                                            <Circle className="w-3.5 h-3.5 shrink-0 fill-green-500 text-green-500" /> 역대최저
                                        </button>
                                        {platformOptions.slice(1).map((opt) => (
                                            <button key={opt.value} onClick={() => handleQuickSelect('platform', filter.platform === opt.value ? '' : opt.value)}
                                                className={`w-full flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                    ${filter.platform === opt.value
                                                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                                                        : 'bg-surface border-divider text-secondary hover:border-indigo-400/30 hover:text-primary'}`}>
                                                <MonitorPlay className="w-3.5 h-3.5 shrink-0" /> {opt.label}
                                            </button>
                                        ))}
                                        <button onClick={() => handleQuickSelect('isPlusExclusive', !filter.isPlusExclusive)}
                                            className={`w-full flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                ${filter.isPlusExclusive
                                                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]'
                                                    : 'bg-surface border-divider text-secondary hover:border-yellow-400/30 hover:text-primary'}`}>
                                            <Star className="w-3.5 h-3.5 shrink-0" /> <span className="font-black">PLUS</span> 할인만
                                        </button>
                                        <button onClick={() => handleQuickSelect('inCatalog', !filter.inCatalog)}
                                            className={`w-full flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                ${filter.inCatalog
                                                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]'
                                                    : 'bg-surface border-divider text-secondary hover:border-yellow-400/30 hover:text-primary'}`}>
                                            <Layers className="w-3.5 h-3.5 shrink-0" /> 스페셜 카탈로그
                                        </button>
                                        <button onClick={() => handleQuickSelect('isPs5ProEnhanced', !filter.isPs5ProEnhanced)}
                                            className={`w-full flex items-center gap-1.5 px-4 py-2.5 rounded-full border font-bold text-xs transition-all active:scale-95
                                                ${filter.isPs5ProEnhanced
                                                    ? 'bg-primary border-primary text-[color:var(--color-bg-base)] shadow-glow'
                                                    : 'bg-surface border-divider text-secondary hover:border-primary/30 hover:text-primary'}`}>
                                            <Sparkles className="w-3.5 h-3.5 shrink-0" /> PS5 Pro 향상
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 적용 버튼 (하단 고정) */}
                        <div className="shrink-0 px-6 md:px-8 py-4 bg-base border-t border-divider">
                            <button onClick={executeSearch} className="w-full bg-ps-blue hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-colors shadow-glow-blue flex items-center justify-center gap-2 active:scale-[0.98]">
                                <Search className="w-5 h-5" /> 검색어 적용하기
                            </button>
                        </div>
                    </div>
                </div>
                {isQuickSearchOpen && <div className="fixed inset-0 z-[55] bg-backdrop backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsQuickSearchOpen(false)}></div>}

                <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />

                {/* 프리셋 이름 입력 모달 */}
                {isPresetNameModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setIsPresetNameModalOpen(false)}>
                        <div className="absolute inset-0 bg-backdrop backdrop-blur-md" />
                        <div className="relative bg-base border border-divider rounded-2xl p-6 w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <h3 className="text-base font-black text-primary mb-1">
                                {presetEditingId ? '프리셋 이름 수정' : '탐색 조건 저장'}
                            </h3>
                            <p className="text-xs text-muted mb-4">최대 15자까지 입력할 수 있어요.</p>
                            <input
                                autoFocus
                                type="text"
                                value={presetNameInput}
                                onChange={e => setPresetNameInput(e.target.value.slice(0, 15))}
                                onKeyDown={e => e.key === 'Enter' && handleConfirmPresetName()}
                                className="w-full px-4 py-3 rounded-xl bg-surface border border-divider text-primary text-sm font-bold focus:outline-none focus:border-amber-400/60 transition-colors mb-4"
                                placeholder="예: 인디 탐색, 고퀄 RPG"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setIsPresetNameModalOpen(false); setPresetEditingId(null); }} className="px-4 py-2 rounded-xl text-sm font-bold text-secondary hover:text-primary border border-divider hover:bg-surface-hover transition-colors active:scale-95">취소</button>
                                <button onClick={handleConfirmPresetName} disabled={!presetNameInput.trim()} className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">저장</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameListPage;