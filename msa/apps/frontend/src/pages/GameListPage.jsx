import React, {useCallback, useEffect, useRef, useState} from 'react';
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
    Clock,
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

function cleanTitle(title) {
    const langKeywords = ['한국어', '영어', '일본어', '중국어', '태국어', '독일어', '프랑스어', '스페인어'];
    const indices = langKeywords.map(k => title.indexOf(k)).filter(i => i !== -1);
    if (indices.length > 0) {
        const firstLangIdx = Math.min(...indices);
        const parenIdx = title.lastIndexOf('(', firstLangIdx);
        if (parenIdx > 0) title = title.slice(0, parenIdx).trim();
    }
    return title.replace(/\s+PS[45][™]?\s*(?:[&]\s*PS[45][™]?)?$/, '').trim();
}

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
        vibeTags: searchParams.getAll('vibeTags'),
        minUserScore: searchParams.get('minUserScore') || '',
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

    const applyPreset = useCallback((preset) => {
        const f = preset.filters;
        setFilter(prev => ({
            ...prev,
            isBestSeller: false,
            isMostDownloaded: false,
            isClosingSoon: false,
            isNewDiscount: false,
            curation: false,
            curationTheme: '',
            vibeTags: [],
            minUserScore: '',
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
        const ptMatch = PLAYTIME_PRESETS.find(p => String(p.min) === (f.minPlayTime ?? '') && String(p.max) === (f.maxPlayTime ?? ''));
        setSelectedPlayTimeId(ptMatch?.id ?? null);
        setActivePresetId(preset.id);
        setPage(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleSavePreset = () => {
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }
        if (presets.length >= 5) {
            toast.error('프리셋은 최대 5개까지 저장할 수 있습니다.');
            return;
        }
        setPresetEditingId(null);
        setPresetNameInput(buildAutoPresetName());
        setIsPresetNameModalOpen(true);
    };

    const handleEditPresetName = (preset) => {
        setPresetEditingId(preset.id);
        setPresetNameInput(preset.name);
        setIsPresetNameModalOpen(true);
    };

    const handleOverwritePreset = async (preset) => {
        try {
            const updated = await updatePreset(preset.id, {
                name: preset.name,
                filters: extractPresetFilters()
            });
            setPresets(prev => prev.map(p => p.id === preset.id ? updated : p));
            setActivePresetId(preset.id);
            setPresetMenuOpenId(null);
            toast.success(`'${preset.name}' 조건이 업데이트되었습니다.`);
        } catch {
            toast.error('프리셋 수정 실패');
        }
    };

    const handleDeletePreset = async (preset) => {
        try {
            await deletePreset(preset.id);
            setPresets(prev => prev.filter(p => p.id !== preset.id));
            if (activePresetId === preset.id) setActivePresetId(null);
            setPresetMenuOpenId(null);
            toast.success(`'${preset.name}' 프리셋이 삭제되었습니다.`);
        } catch {
            toast.error('프리셋 삭제 실패');
        }
    };

    const handleModalConfirm = async () => {
        const name = presetNameInput.trim();
        if (!name) return;

        if (presetEditingId) {
            try {
                const target = presets.find(p => p.id === presetEditingId);
                const updated = await updatePreset(presetEditingId, {
                    name,
                    filters: target?.filters || extractPresetFilters()
                });
                setPresets(prev => prev.map(p => p.id === presetEditingId ? updated : p));
                toast.success('프리셋 이름이 변경되었습니다.');
            } catch {
                toast.error('이름 수정 실패');
            }
        } else {
            try {
                const created = await createPreset({
                    name,
                    filters: extractPresetFilters()
                });
                setPresets(prev => [...prev, created]);
                setActivePresetId(created.id);
                toast.success(`'${name}' 프리셋이 저장되었습니다.`);
            } catch (err) {
                if (err.response?.status === 409) {
                    toast.error('프리셋은 최대 5개까지 저장할 수 있습니다.');
                } else {
                    toast.error('프리셋 저장 실패');
                }
            }
        }
        setIsPresetNameModalOpen(false);
    };

    useEffect(() => {
        if (!isAuthenticated) {
            setPresets([]);
            setActivePresetId(null);
            return;
        }
        getMyPresets()
            .then(data => setPresets(data))
            .catch(() => {});
    }, [isAuthenticated]);

    useEffect(() => {
        const handleBootComplete = () => {
            fetchGames(0);
        };
        window.addEventListener('backend-boot-complete', handleBootComplete);
        return () => window.removeEventListener('backend-boot-complete', handleBootComplete);
    }, [filter]);

    useEffect(() => {
        const fetchDiscount = async () => {
            try {
                const res = await client.get('/api/v1/ps-plus/discounts');
                if (res.data && res.data.length > 0) {
                    const topDiscount = res.data.reduce((max, item) => item.discountRate > max.discountRate ? item : max, res.data[0]);
                    setPsPlusDiscount(topDiscount);
                }
            } catch (err) {}
        };
        fetchDiscount();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmed = searchInput.trim();
            if (trimmed.length >= 2) {
                client.get(`/api/v1/games/search/suggestions?keyword=${encodeURIComponent(trimmed)}`)
                    .then(res => setSuggestions(res.data))
                    .catch(() => setSuggestions([]));
            } else {
                setSuggestions([]);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (isQuickSearchOpen) {
            setRecentGames(getRecentGames());
        }
    }, [isQuickSearchOpen]);

    const handleRecentGamesDragStart = (e) => {
        const el = recentGamesScrollRef.current;
        if (!el) return;
        dragStateRef.current = {
            isDragging: true,
            startX: e.pageX - el.offsetLeft,
            scrollLeft: el.scrollLeft,
            hasDragged: false,
        };
    };

    const handleRecentGamesDragMove = (e) => {
        if (!dragStateRef.current.isDragging) return;
        const el = recentGamesScrollRef.current;
        if (!el) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - dragStateRef.current.startX) * 1.5;
        if (Math.abs(walk) > 5) {
            dragStateRef.current.hasDragged = true;
        }
        el.scrollLeft = dragStateRef.current.scrollLeft - walk;
    };

    const handleRecentGamesDragEnd = () => {
        dragStateRef.current.isDragging = false;
    };

    useEffect(() => {
        const syncFilterFromUrl = () => {
            setFilter({
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
                vibeTags: searchParams.getAll('vibeTags'),
                minUserScore: searchParams.get('minUserScore') || '',
                curation: searchParams.get('curation') === 'true',
                curationTheme: searchParams.get('curationTheme') || '',
            });
            setSearchInput(searchParams.get('keyword') || '');
            setPriceRange({
                min: searchParams.get('minPrice') || '',
                max: searchParams.get('maxPrice') || '',
            });
            const minPt = searchParams.get('minPlayTime');
            const maxPt = searchParams.get('maxPlayTime');
            const matchedPt = PLAYTIME_PRESETS.find(p => String(p.min) === minPt && String(p.max) === maxPt);
            setSelectedPlayTimeId(matchedPt?.id || null);
        };

        syncFilterFromUrl();
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (filter.keyword) params.set('keyword', filter.keyword);
        if (filter.genre) params.set('genre', filter.genre);
        if (filter.minDiscountRate) params.set('minDiscountRate', filter.minDiscountRate);
        if (filter.minMetaScore) params.set('minMetaScore', filter.minMetaScore);
        if (filter.platform) params.set('platform', filter.platform);
        if (filter.isPlusExclusive) params.set('isPlusExclusive', 'true');
        if (filter.inCatalog) params.set('inCatalog', 'true');
        if (filter.isAllTimeLow) params.set('isAllTimeLow', 'true');
        if (filter.isPs5ProEnhanced) params.set('isPs5ProEnhanced', 'true');
        if (filter.isBestSeller) params.set('isBestSeller', 'true');
        if (filter.isMostDownloaded) params.set('isMostDownloaded', 'true');
        if (filter.isClosingSoon) params.set('isClosingSoon', 'true');
        if (filter.isNewDiscount) params.set('isNewDiscount', 'true');
        if (filter.minPrice) params.set('minPrice', filter.minPrice);
        if (filter.maxPrice) params.set('maxPrice', filter.maxPrice);
        if (filter.minPlayTime) params.set('minPlayTime', filter.minPlayTime);
        if (filter.maxPlayTime) params.set('maxPlayTime', filter.maxPlayTime);
        if (filter.minUserScore) params.set('minUserScore', filter.minUserScore);
        if (filter.curation) params.set('curation', 'true');
        if (filter.curationTheme) params.set('curationTheme', filter.curationTheme);
        (filter.vibeTags || []).forEach(t => params.append('vibeTags', t));
        if (filter.sort !== 'lastUpdated,desc') params.set('sort', filter.sort);

        if (params.toString() !== searchParams.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [filter]);

    useEffect(() => {
        fetchGames(page);
    }, [page, filter]);

    useEffect(() => {
        const handleWishlistUpdated = (e) => {
            const { gameId, liked } = e.detail;
            setGames(prevGames =>
                prevGames.map(game =>
                    game.id === gameId ? { ...game, liked: liked } : game
                )
            );
        };
        window.addEventListener('ps-wishlist-updated', handleWishlistUpdated);
        return () => window.removeEventListener('ps-wishlist-updated', handleWishlistUpdated);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < 100) {
                setIsFloatingVisible(true);
            } else if (currentScrollY > lastScrollYRef.current + 10) {
                setIsFloatingVisible(false);
            } else if (currentScrollY < lastScrollYRef.current - 10) {
                setIsFloatingVisible(true);
            }
            lastScrollYRef.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const lastGameElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages - 1) {
                setPage(prevPage => prevPage + 1);
            }
        }, { threshold: 0.1 });
        if (node) observer.current.observe(node);
    }, [loading, page, totalPages]);

    const executeSearch = () => {
        setIsDesktopSearchActive(false);
        setFilter(prev => ({ ...prev, keyword: searchInput }));
        setPage(0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            executeSearch();
            if (isQuickSearchOpen) setIsQuickSearchOpen(false);
        }
    };

    const handleQuickSelect = (key, value) => {
        setFilter(prev => ({
            ...prev,
            [key]: prev[key] === value ? '' : value
        }));
        setPage(0);
        setIsQuickSearchOpen(false);
    };

    const handlePriceApply = () => {
        if (priceRange.min && priceRange.max && Number(priceRange.min) > Number(priceRange.max)) {
            toast.error('최소 가격이 최대 가격보다 클 수 없습니다.');
            return;
        }
        setFilter(prev => ({
            ...prev,
            minPrice: priceRange.min,
            maxPrice: priceRange.max,
        }));
        setExpandedPill(null);
        setPage(0);
    };

    const handleApplyQuickSearchAndClose = () => {
        if (priceRange.min && priceRange.max && Number(priceRange.min) > Number(priceRange.max)) {
            toast.error('최소 가격이 최대 가격보다 클 수 없습니다.');
            return;
        }
        setFilter(prev => ({
            ...prev,
            keyword: searchInput,
            minPrice: priceRange.min,
            maxPrice: priceRange.max,
        }));
        setPage(0);
        setIsQuickSearchOpen(false);
    };

    const handlePriceReset = () => {
        setPriceRange({ min: '', max: '' });
        setFilter(prev => ({ ...prev, minPrice: '', maxPrice: '' }));
        setExpandedPill(null);
        setPage(0);
    };

    const handlePlayTimeSelect = (preset, closeQuickSearch = true) => {
        if (!preset) {
            setSelectedPlayTimeId(null);
            setFilter(prev => ({ ...prev, minPlayTime: '', maxPlayTime: '' }));
        } else if (selectedPlayTimeId === preset.id) {
            setSelectedPlayTimeId(null);
            setFilter(prev => ({ ...prev, minPlayTime: '', maxPlayTime: '' }));
        } else {
            setSelectedPlayTimeId(preset.id);
            setFilter(prev => ({ ...prev, minPlayTime: String(preset.min), maxPlayTime: String(preset.max) }));
        }
        setPage(0);
        if (closeQuickSearch) setIsQuickSearchOpen(false);
    };

    const handleResetAllFilters = () => {
        setFilter({
            keyword: '',
            genre: '',
            minDiscountRate: '',
            minMetaScore: '',
            platform: '',
            isPlusExclusive: false,
            inCatalog: false,
            sort: 'lastUpdated,desc',
            minPrice: '',
            maxPrice: '',
            minPlayTime: '',
            maxPlayTime: '',
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
        });
        setSearchInput('');
        setPriceRange({ min: '', max: '' });
        setSelectedPlayTimeId(null);
        setActivePresetId(null);
        setPage(0);
        setIsQuickSearchOpen(false);
    };

    const clearGenreFilter = () => {
        setFilter(prev => ({ ...prev, genre: '' }));
        setPage(0);
    };

    const handleLike = async (e, gameId) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            openLoginModal();
            return;
        }

        const targetGame = games.find(g => g.id === gameId);
        const originalLiked = targetGame ? targetGame.liked : false;
        const newLiked = !originalLiked;

        setGames(prevGames =>
            prevGames.map(game =>
                game.id === gameId ? { ...game, liked: newLiked } : game
            )
        );

        try {
            if (originalLiked) {
                await client.delete(`/api/v1/wishlist/${gameId}`);
                toast.success('위시리스트에서 삭제되었습니다.');
            } else {
                await client.post(`/api/v1/wishlist/${gameId}`);
                toast.success('위시리스트에 추가되었습니다! (할인 알림 활성화)');
            }
            window.dispatchEvent(new CustomEvent('ps-wishlist-updated', {
                detail: { gameId, liked: newLiked }
            }));
        } catch (error) {
            setGames(prevGames =>
                prevGames.map(game =>
                    game.id === gameId ? { ...game, liked: originalLiked } : game
                )
            );
            toast.error(error.response?.data?.message || '처리 중 오류가 발생했습니다.');
        }
    };

    const handleContactClick = () => {
        const subject = encodeURIComponent('[PS Signal] 문의 및 제휴');
        const body = encodeURIComponent('문의 내용을 입력해주세요.\n\n- 내용:\n- 연락처(선택):');
        window.location.href = `mailto:pyg9811@gmail.com?subject=${subject}&body=${body}`;
    };

    const renderActionBanner = () => {
        const activeSpecialFilter =
            activePresetId ? 'preset' :
            isPlayTimeFilterActive ? 'playTime' :
            filter.isPs5ProEnhanced ? 'isPs5ProEnhanced' :
            filter.inCatalog ? 'inCatalog' :
            filter.isPlusExclusive ? 'isPlusExclusive' :
            filter.isAllTimeLow ? 'isAllTimeLow' :
            filter.isBestSeller ? 'isBestSeller' :
            filter.isMostDownloaded ? 'isMostDownloaded' :
            filter.isClosingSoon ? 'isClosingSoon' :
            filter.isNewDiscount ? 'isNewDiscount' :
            (filter.curation || (filter.vibeTags && filter.vibeTags.length > 0) || filter.minUserScore) ? 'curationMode' :
            (filter.minMetaScore === '85' && filter.minDiscountRate === '50') ? 'mustPlay' :
            (filter.minDiscountRate === '1') ? 'allDiscounts' :
            null;

        switch (activeSpecialFilter) {
            case 'preset': {
                const activePreset = presets.find(p => p.id === activePresetId);
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-amber-500/30 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(245,158,11,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-amber-500/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                                <Bookmark className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <div className="text-amber-500 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Bookmark className="w-3 h-3"/> MY PRESET
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base">
                                    '<span className="text-amber-400">{activePreset?.name}</span>' 프리셋 조건으로 보는 중
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setActivePresetId(null)} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            }
            case 'playTime': {
                const activePreset = PLAYTIME_PRESETS.find(p => String(p.min) === filter.minPlayTime && String(p.max) === filter.maxPlayTime);
                const Icon = activePreset ? activePreset.icon : Clock;
                const title = activePreset ? activePreset.label : '맞춤 플레이타임';
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-teal-500/30 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(20,184,166,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-teal-500/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/30">
                                <Icon className="w-5 h-5 text-teal-400" />
                            </div>
                            <div>
                                <div className="text-teal-400 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Timer className="w-3 h-3"/> PLAYTIME FILTER
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base">
                                    '<span className="text-teal-400">{title}</span>' 볼륨의 게임 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, minPlayTime: '', maxPlayTime: ''})); setSelectedPlayTimeId(null); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            }
            case 'isPs5ProEnhanced':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-white/20 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(255,255,255,0.08)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-white/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-muted font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3"/> PRO ENHANCED
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base">
                                    기기 성능 풀가동! <span className="text-primary-fixed">PS5 Pro 향상 꿀딜</span> 모아보기
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isPs5ProEnhanced: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            case 'inCatalog':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-yellow-500/30 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(234,179,8,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-yellow-500/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
                                <Gamepad2 className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-yellow-400 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Gamepad2 className="w-3 h-3"/> PS PLUS EXTRA
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base">
                                    지갑 지킴이! <span className="text-yellow-400">구독자 스페셜(무료) 혜택</span> 모아보기
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, inCatalog: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            case 'isPlusExclusive':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-yellow-500/30 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(234,179,8,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-yellow-500/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center shadow-md">
                                <Plus className="w-5 h-5 text-black" strokeWidth={3} />
                            </div>
                            <div>
                                <div className="text-yellow-400 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Star className="w-3 h-3"/> EXCLUSIVE DEAL
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base">
                                    본전 뽑는 시간! <span className="text-yellow-400">PLUS 전용 추가 할인</span> 모아보기
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isPlusExclusive: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            case 'isAllTimeLow':
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-green-500/30 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(34,197,94,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-green-500/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/30">
                                <Circle className="w-5 h-5 text-green-500 fill-green-500" />
                            </div>
                            <div>
                                <div className="text-green-400 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Circle className="w-3 h-3 fill-green-400"/> ALL-TIME LOW
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base">
                                    '<span className="text-green-400">역대 최저가</span>' 게임만 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isAllTimeLow: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            case 'curationMode': {
                const vibeLabels = (filter.vibeTags || []).map(t => t.replace(/^#/, '')).slice(0, 3).join(' · ');
                const displayLabel = filter.curationTheme || vibeLabels;
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-indigo-500/30 p-4 sm:p-5 flex items-center justify-between shadow-[0_4px_25px_rgba(99,102,241,0.15)] group transition-all">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-indigo-500/10 to-transparent"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-indigo-400 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Waves className="w-3 h-3"/> CURATION SURFING
                                </div>
                                <div className="text-primary font-black text-sm sm:text-base break-keep">
                                    {displayLabel
                                        ? <>'<span className="text-indigo-400">{displayLabel}</span>' 테마 게임 모아보기</>
                                        : <>큐레이션 <span className="text-indigo-400">감성 취향</span> 게임 모아보기</>
                                    }
                                </div>
                            </div>
                        </div>
                        <button onClick={handleResetAllFilters} className="relative z-10 flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>
                );
            }
            default:
                return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-glass backdrop-blur-xl border border-divider flex flex-col md:flex-row shadow-lg transition-all hover:border-ps-blue/40">
                        <div
                            onClick={() => {
                                setFilter(prev => ({...prev, isAllTimeLow: true}));
                                setPage(0);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex-1 p-4 sm:p-5 cursor-pointer relative overflow-hidden flex items-center justify-between border-b md:border-b-0 md:border-r border-divider group hover:bg-surface-hover transition-colors"
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-105 transition-transform">
                                    <Flame className="w-5 h-5 text-red-500 fill-red-500/20 animate-pulse" />
                                </div>
                                <div>
                                    <div className="text-red-400 font-black text-[10px] sm:text-xs mb-0.5 tracking-wider">TODAY'S HOT DEAL</div>
                                    <div className="text-primary font-black text-sm sm:text-base">
                                        지금 <span className="text-red-400">수많은 명작</span>이 역대 최저가 갱신 중!
                                    </div>
                                </div>
                            </div>
                            <div className="text-red-400 font-bold text-xs sm:text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform pr-2">
                                <span className="hidden sm:inline">모아보기</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="flex w-full md:w-auto shrink-0 bg-surface/50">
                            <div
                                onClick={() => navigate('/discover')}
                                className="flex-1 md:w-36 md:border-l border-r border-divider hover:bg-surface-hover cursor-pointer flex flex-col items-center justify-center p-3 transition-colors group"
                            >
                                <Sparkles className="w-4 h-4 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                                <div className="flex items-center gap-1 text-secondary group-hover:text-primary font-bold text-[11px] sm:text-xs">
                                    <span>신작 수집소</span>
                                    <ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>

                            <div
                                onClick={() => navigate('/insights')}
                                className="flex-1 md:w-36 hover:bg-surface-hover cursor-pointer flex flex-col items-center justify-center p-3 transition-colors group"
                            >
                                <Activity className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                                <div className="flex items-center gap-1 text-secondary group-hover:text-primary font-bold text-[11px] sm:text-xs">
                                    <span>통계 인사이트</span>
                                    <ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    if (loading && page === 0 && isInitialLoad) return <div className="min-h-screen pt-20 flex justify-center bg-base"><PSLoader /></div>;

    return (
        <div className="min-h-screen text-primary relative">
            <SEO title="게임 목록" description="플레이스테이션 게임 실시간 최저가 확인 및 할인 정보" url="https://ps-signal.com/games" />

            {/* 오로라 배경 앰비언트 */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-base">
                <div className="absolute inset-0 opacity-40 dark:opacity-30">
                    <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute top-[20%] -left-[10%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] left-[25%] w-[40%] h-[40%] bg-indigo-600/15 rounded-full blur-[100px]"></div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <main className="pt-24 md:pt-28 px-4 sm:px-6 md:px-10 pb-28 max-w-7xl mx-auto relative z-10">

                {/* 장르 서핑 배너 */}
                {filter.genre && (
                    <div className="mb-6 relative overflow-hidden rounded-2xl border border-ps-blue/40 bg-glass backdrop-blur-xl p-4 sm:p-5 flex items-center justify-between shadow-lg group">
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-xs text-ps-blue font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                    <Waves className="w-3.5 h-3.5" /> Genre Surfing
                                </p>
                                <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">'{filter.genre}' 게임 모아보기</h2>
                            </div>
                        </div>
                        <button onClick={clearGenreFilter} className="flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-divider px-3 py-2 rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all">
                            <X className="w-4 h-4" /> <span>필터 해제</span>
                        </button>
                    </div>
                )}

                {/* PS Plus 핫딜 프로모션 배너 */}
                {psPlusDiscount && !isPsPlusBannerDismissed && (
                    <div
                        onClick={() => navigate('/ps-plus')}
                        className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-400 text-black p-4 sm:p-5 flex items-center justify-between shadow-[0_8px_30px_rgba(245,158,11,0.25)] group cursor-pointer border border-yellow-300 hover:scale-[1.005] transition-all"
                    >
                        <div className="flex items-center gap-4 relative z-10 w-full pr-8">
                            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/10 flex items-center justify-center border border-black/20">
                                <Plus className="w-6 h-6 text-black" strokeWidth={3} />
                            </div>
                            <div className="flex flex-col">
                                <div className="font-black text-[10px] sm:text-xs mb-0.5 tracking-widest flex items-center gap-1 opacity-80 uppercase">
                                    <Sparkles className="w-3 h-3"/> Special Promotion
                                </div>
                                <div className="font-black text-sm sm:text-base leading-tight flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span>놓치지 마세요! PS Plus 12개월</span>
                                    <span className="inline-flex items-center text-white bg-black/90 px-2 py-0.5 rounded-md text-xs">
                                        <TrendingDown className="w-3 h-3 mr-1 text-yellow-400" />
                                        최대 {psPlusDiscount.discountRate}% 할인 중
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleDismissBanner}
                            className="absolute right-4 z-20 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                            aria-label="배너 닫기"
                        >
                            <X className="w-4 h-4 text-black" />
                        </button>
                    </div>
                )}

                {/* 다이내믹 액션 배너 */}
                {renderActionBanner()}

                {/* 통합 글래스 검색 & 필터 바 */}
                <div ref={filterBoxRef} className="relative z-30 bg-glass backdrop-blur-xl rounded-2xl border border-divider shadow-xl mb-8 transition-all">
                    {/* 검색 행 */}
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="keyword"
                                placeholder="게임 제목 검색 (예: 스파이더맨, 엘든링...)"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsDesktopSearchActive(true)}
                                onBlur={() => setTimeout(() => setIsDesktopSearchActive(false), 150)}
                                className="w-full bg-surface border border-divider rounded-xl py-3 pl-11 pr-4 text-sm text-primary placeholder-muted focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all"
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                            {isDesktopSearchActive && !isQuickSearchOpen && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-base border border-divider rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s.id}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => { setIsDesktopSearchActive(false); setSuggestions([]); setSearchInput(''); navigate(`/games/${s.id}`, { state: { background: location } }); }}
                                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-surface-hover transition-colors text-left border-b border-divider last:border-0"
                                        >
                                            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                                <PSGameImage src={s.imageUrl} className="w-full h-full object-cover" width={80} />
                                            </div>
                                            <span className="text-xs sm:text-sm font-bold text-primary line-clamp-1">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={executeSearch}
                            className="shrink-0 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-ps-blue text-white hover:bg-blue-600 active:scale-95 shadow-md transition-all"
                        >
                            검색
                        </button>
                    </div>

                    {/* 모바일 전용 필터 요약 칩 바 */}
                    <div className="flex items-center gap-2 px-3 pb-3 md:hidden overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <button
                            onClick={() => setIsQuickSearchOpen(true)}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold bg-surface border-divider text-secondary active:scale-95 whitespace-nowrap"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            <span>필터</span>
                            {isFilterActive && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-ps-blue text-white text-[9px] font-black">
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
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border bg-blue-500/15 border-blue-500/40 text-blue-400 text-xs font-bold whitespace-nowrap">
                                    <span>{opt?.label}</span>
                                    <button onClick={() => { setFilter(p => ({...p, sort: 'lastUpdated,desc'})); setPage(0); }} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {!!filter.minDiscountRate && (() => {
                            const opt = discountOptions.find(o => o.value === filter.minDiscountRate);
                            return (
                                <div className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border bg-ps-blue/15 border-ps-blue/40 text-ps-blue text-xs font-bold whitespace-nowrap">
                                    <span>{opt?.label}</span>
                                    <button onClick={() => { setFilter(p => ({...p, minDiscountRate: ''})); setPage(0); }} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })()}
                        {filter.isAllTimeLow && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border bg-green-500/15 border-green-500/40 text-green-400 text-xs font-bold whitespace-nowrap">
                                <Circle className="w-3 h-3 fill-green-400 text-green-400" />
                                <span>역대최저</span>
                                <button onClick={() => { setFilter(p => ({...p, isAllTimeLow: false})); setPage(0); }} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        {filter.isPlusExclusive && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border bg-yellow-500/15 border-yellow-500/40 text-yellow-400 text-xs font-bold whitespace-nowrap">
                                <span>PLUS</span>
                                <button onClick={() => { setFilter(p => ({...p, isPlusExclusive: false})); setPage(0); }} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        {filter.inCatalog && (
                            <div className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border bg-yellow-500/15 border-yellow-500/40 text-yellow-400 text-xs font-bold whitespace-nowrap">
                                <span>스페셜</span>
                                <button onClick={() => { setFilter(p => ({...p, inCatalog: false})); setPage(0); }} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                    </div>

                    {/* PC 전용 프리셋 바 */}
                    {(presets.length > 0 || isFilterActive) && (
                        <div className="hidden md:flex items-center flex-wrap gap-2 px-4 pt-1 pb-2">
                            {presets.map(preset => {
                                const isActive = activePresetId === preset.id;
                                const isMenuOpen = presetMenuOpenId === preset.id;
                                return (
                                    <div key={preset.id} className="relative shrink-0">
                                        <button
                                            onClick={() => isActive ? setActivePresetId(null) : applyPreset(preset)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95
                                                ${isActive
                                                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                                                    : 'bg-surface border-divider text-secondary hover:border-amber-400/40 hover:text-amber-400'}`}
                                        >
                                            {isActive && <Check className="w-3 h-3" strokeWidth={3} />}
                                            <span>{preset.name}</span>
                                            <span className={`w-px h-3 mx-0.5 ${isActive ? 'bg-amber-400/30' : 'bg-divider'}`} />
                                            <span
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={e => { e.stopPropagation(); setPresetMenuOpenId(isMenuOpen ? null : preset.id); }}
                                                className="flex items-center p-0.5 rounded-full hover:bg-surface-hover transition-colors"
                                            >
                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                            </span>
                                        </button>
                                        {isMenuOpen && (
                                            <div onMouseDown={e => e.stopPropagation()} className="absolute top-full left-0 mt-1 bg-base border border-divider rounded-2xl shadow-xl z-50 w-44 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                                <button onClick={() => { handleEditPresetName(preset); setPresetMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-colors">이름 수정</button>
                                                <button onClick={() => handleOverwritePreset(preset)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-hover transition-colors">현재 조건으로 덮어쓰기</button>
                                                <div className="border-t border-divider" />
                                                <button onClick={() => handleDeletePreset(preset)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-surface-hover transition-colors">삭제</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {presets.length < 5 && isFilterActive && (
                                <button
                                    onClick={handleSavePreset}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all border-dashed border-divider text-muted hover:border-amber-400/50 hover:text-amber-400 active:scale-95"
                                >
                                    <Bookmark className="w-3 h-3" />
                                    <span>현재 조건 저장</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* PC 전용 필터 Pill 행 */}
                    <div className="relative hidden md:block border-t border-divider/60">
                        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* 정렬 Pill */}
                            {(() => {
                                const isLocked = filter.isBestSeller || filter.isMostDownloaded;
                                const sortOpt = sortOptions.find(o => o.value === filter.sort) || sortOptions[0];
                                const isActive = filter.sort !== 'lastUpdated,desc';
                                return (
                                    <button
                                        disabled={isLocked}
                                        onClick={() => !isLocked && setExpandedPill(expandedPill === 'sort' ? null : 'sort')}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                            ${isLocked ? 'opacity-50 cursor-not-allowed bg-surface border-divider text-muted' :
                                                isActive ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
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

                            <div className="shrink-0 w-px h-4 bg-divider mx-0.5" />

                            {/* 할인율 Pill */}
                            {(() => {
                                const isActive = filter.minDiscountRate !== '';
                                const activeOpt = discountOptions.find(o => o.value === filter.minDiscountRate);
                                return (
                                    <button
                                        onClick={() => setExpandedPill(expandedPill === 'discount' ? null : 'discount')}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                            ${isActive ? 'bg-ps-blue/15 border-ps-blue/50 text-ps-blue shadow-[0_0_10px_rgba(0,112,209,0.2)]' :
                                                expandedPill === 'discount' ? 'bg-surface border-ps-blue/50 text-ps-blue' :
                                                'bg-surface border-divider text-secondary hover:border-ps-blue/40 hover:text-primary'}`}
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

                            {/* 가격 Pill */}
                            {(() => {
                                const isActive = isPriceFilterActive;
                                return (
                                    <button
                                        onClick={() => setExpandedPill(expandedPill === 'price' ? null : 'price')}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                            ${isActive ? 'bg-green-500/15 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                                                expandedPill === 'price' ? 'bg-surface border-green-400/50 text-green-400' :
                                                'bg-surface border-divider text-secondary hover:border-green-400/40 hover:text-primary'}`}
                                    >
                                        <Banknote className="w-3 h-3" />
                                        <span>{isActive ? `${filter.minPrice ? `${Number(filter.minPrice).toLocaleString()}원` : '0원'}~${filter.maxPrice ? `${Number(filter.maxPrice).toLocaleString()}원` : '최대'}` : '가격대'}</span>
                                        {isActive
                                            ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, minPrice: '', maxPrice: ''})); setPriceRange({min: '', max: ''}); setExpandedPill(null); setPage(0); }} />
                                            : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'price' ? 'rotate-180' : ''}`} />
                                        }
                                    </button>
                                );
                            })()}

                            {/* 플탐 Pill */}
                            {(() => {
                                const isActive = isPlayTimeFilterActive;
                                const preset = PLAYTIME_PRESETS.find(p => p.id === selectedPlayTimeId);
                                const PtIcon = preset?.icon || Timer;
                                return (
                                    <button
                                        onClick={() => setExpandedPill(expandedPill === 'playtime' ? null : 'playtime')}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                            ${isActive ? 'bg-teal-500/15 border-teal-500/50 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]' :
                                                expandedPill === 'playtime' ? 'bg-surface border-teal-400/50 text-teal-400' :
                                                'bg-surface border-divider text-secondary hover:border-teal-400/40 hover:text-primary'}`}
                                    >
                                        <PtIcon className="w-3 h-3" />
                                        <span>{isActive ? preset?.label : '플레이타임'}</span>
                                        {isActive
                                            ? <X className="w-3 h-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFilter(prev => ({...prev, minPlayTime: '', maxPlayTime: ''})); setSelectedPlayTimeId(null); setExpandedPill(null); setPage(0); }} />
                                            : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedPill === 'playtime' ? 'rotate-180' : ''}`} />
                                        }
                                    </button>
                                );
                            })()}

                            {/* 평점 Pill */}
                            {(() => {
                                const isActive = filter.minMetaScore !== '';
                                const activeOpt = metaScoreOptions.find(o => o.value === filter.minMetaScore);
                                return (
                                    <button
                                        onClick={() => setExpandedPill(expandedPill === 'metaScore' ? null : 'metaScore')}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                            ${isActive ? 'bg-purple-500/15 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' :
                                                expandedPill === 'metaScore' ? 'bg-surface border-purple-400/50 text-purple-400' :
                                                'bg-surface border-divider text-secondary hover:border-purple-400/40 hover:text-primary'}`}
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

                            {/* 플랫폼 Pill */}
                            {(() => {
                                const isActive = filter.platform !== '';
                                const activeOpt = platformOptions.find(o => o.value === filter.platform);
                                return (
                                    <button
                                        onClick={() => setExpandedPill(expandedPill === 'platform' ? null : 'platform')}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                            ${isActive ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' :
                                                expandedPill === 'platform' ? 'bg-surface border-indigo-400/50 text-indigo-400' :
                                                'bg-surface border-divider text-secondary hover:border-indigo-400/40 hover:text-primary'}`}
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

                            <div className="shrink-0 w-px h-4 bg-divider mx-0.5" />

                            {/* 원클릭 토글 버튼들 */}
                            <button
                                onClick={() => { setFilter(prev => ({...prev, isAllTimeLow: !prev.isAllTimeLow})); setPage(0); }}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                    ${filter.isAllTimeLow ? 'bg-green-500/15 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-surface border-divider text-secondary hover:border-green-400/40 hover:text-primary'}`}
                            >
                                <Circle className={`w-3 h-3 ${filter.isAllTimeLow ? 'fill-green-400 text-green-400' : 'text-green-500'}`} />
                                <span>역대최저</span>
                            </button>

                            <button
                                onClick={() => { setFilter(prev => ({...prev, isPlusExclusive: !prev.isPlusExclusive})); setPage(0); }}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                    ${filter.isPlusExclusive ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'bg-surface border-divider text-secondary hover:border-yellow-400/40 hover:text-primary'}`}
                            >
                                <Plus className="w-3 h-3" strokeWidth={3} />
                                <span>PLUS</span>
                            </button>

                            <button
                                onClick={() => { setFilter(prev => ({...prev, inCatalog: !prev.inCatalog})); setPage(0); }}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                    ${filter.inCatalog ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'bg-surface border-divider text-secondary hover:border-yellow-400/40 hover:text-primary'}`}
                            >
                                <Gamepad2 className="w-3 h-3" />
                                <span>스페셜</span>
                            </button>

                            <button
                                onClick={() => { setFilter(prev => ({...prev, isPs5ProEnhanced: !prev.isPs5ProEnhanced})); setPage(0); }}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                    ${filter.isPs5ProEnhanced ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-surface border-divider text-secondary hover:border-divider-strong hover:text-primary'}`}
                            >
                                <Sparkles className="w-3 h-3" />
                                <span>PS5 Pro</span>
                            </button>
                        </div>
                    </div>

                    {/* 확장 패널 드롭다운 */}
                    {expandedPill && (
                        <div className="border-t border-divider px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-150">
                            {expandedPill === 'sort' && (
                                <div className="flex flex-wrap gap-2">
                                    {sortOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(prev => ({...prev, sort: opt.value})); setExpandedPill(null); setPage(0); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.sort === opt.value ? 'bg-blue-500/15 border-blue-500/50 text-blue-400' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
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
                                            onClick={() => { setFilter(prev => ({...prev, minDiscountRate: opt.value})); setExpandedPill(null); setPage(0); }}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.minDiscountRate === opt.value ? 'bg-ps-blue/15 border-ps-blue/50 text-ps-blue' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {expandedPill === 'price' && (
                                <div className="flex items-center gap-2 max-w-sm">
                                    <div className="relative flex-1">
                                        <input type="number" min="0" placeholder="최소" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})} className="w-full bg-base border border-divider rounded-xl pl-3 pr-8 py-2 text-primary text-xs focus:border-ps-blue outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">원</span>
                                    </div>
                                    <span className="text-secondary font-bold text-xs">~</span>
                                    <div className="relative flex-1">
                                        <input type="number" min="0" placeholder="최대" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})} className="w-full bg-base border border-divider rounded-xl pl-3 pr-8 py-2 text-primary text-xs focus:border-ps-blue outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">원</span>
                                    </div>
                                    <button onClick={handlePriceApply} className="shrink-0 px-4 py-2 bg-ps-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 active:scale-95 shadow-md">적용</button>
                                    {isPriceFilterActive && <button onClick={handlePriceReset} className="shrink-0 px-3 py-2 bg-surface border border-divider text-secondary rounded-xl text-xs font-bold hover:text-primary">초기화</button>}
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
                                                    ${isSelected ? 'bg-teal-500/15 border-teal-500/50 text-teal-400' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
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
                                            className="px-3 py-1.5 rounded-full border text-xs font-bold bg-surface border-divider text-secondary hover:text-primary">
                                            전체 시간
                                        </button>
                                    )}
                                </div>
                            )}
                            {expandedPill === 'metaScore' && (
                                <div className="flex flex-wrap gap-2">
                                    {metaScoreOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(prev => ({...prev, minMetaScore: opt.value})); setExpandedPill(null); setPage(0); }}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.minMetaScore === opt.value ? 'bg-purple-500/15 border-purple-500/50 text-purple-400' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
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
                                            onClick={() => { setFilter(prev => ({...prev, platform: opt.value})); setExpandedPill(null); setPage(0); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95
                                                ${filter.platform === opt.value ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-400' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary'}`}
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

                {/* 트렌딩 핫딜 위젯 */}
                {!isFilterActive && <TrendingGamesWidget />}

                {/* 게임 개수 카운트 */}
                {!loading && (
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-xs font-bold text-secondary">게임 목록</span>
                        <p className="text-xs text-muted text-right">
                            총 <span className="text-primary font-black">{totalElements.toLocaleString()}</span>개의 게임
                        </p>
                    </div>
                )}

                {/* 3:4 그리드 카드 레이아웃 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-6">
                    {loading && page === 0 && !isInitialLoad ? (
                        Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />)
                    ) : (
                        games.length > 0 ? games.map((game, index) => {
                            const isLastElement = games.length === index + 1;
                            const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;

                            const rankToDisplay = filter.isBestSeller ? game.bestSellerRank
                                : filter.isMostDownloaded ? game.mostDownloadedRank
                                    : null;
                            const currentPrice = game.currentPrice || game.price;

                            return (
                                <div
                                    key={game.id}
                                    ref={isLastElement ? lastGameElementRef : null}
                                    onClick={() => navigate(`/games/${game.id}`, { state: { background: location } })}
                                    className={`group relative flex flex-col rounded-2xl overflow-hidden bg-glass backdrop-blur-xl border transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl ${
                                        game.priceVerdict === 'BUY_NOW'
                                            ? 'border-green-500/40 hover:shadow-[0_12px_30px_rgba(34,197,94,0.2)]'
                                            : 'border-divider hover:border-ps-blue/60 hover:shadow-[0_12px_30px_rgba(0,112,209,0.2)]'
                                    }`}
                                >
                                    {/* 3:4 포스터 썸네일 */}
                                    <div className="aspect-[3/4] overflow-hidden relative shrink-0 bg-base">
                                        <PSGameImage
                                            src={game.imageUrl}
                                            alt={game.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                            priority={index < 4}
                                            width={640}
                                        />

                                        {/* 다크 그라디언트 엣지 */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                                        {/* 1. 상단 좌측 (Top-Left): 랭킹 및 긴급도(막차!)/신규(NEW) 상태 배지 */}
                                        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-20 flex flex-col gap-1 items-start">
                                            {rankToDisplay ? (
                                                <div className={`px-2 py-0.5 rounded-full flex items-center shadow-lg border text-[10px] sm:text-[11px] font-black tracking-tight ${
                                                    rankToDisplay === 1 ? 'bg-amber-400 text-black border-amber-300' :
                                                    rankToDisplay === 2 ? 'bg-slate-300 text-black border-slate-200' :
                                                    rankToDisplay === 3 ? 'bg-amber-600 text-white border-amber-500' :
                                                    'bg-black/60 backdrop-blur-md text-white border-white/20'
                                                }`}>
                                                    {rankToDisplay <= 3 && <Trophy className="w-3 h-3 mr-0.5" />}
                                                    <span>#{rankToDisplay}</span>
                                                </div>
                                            ) : isLastCall ? (
                                                <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse flex items-center gap-1 border border-red-400/40">
                                                    <Timer className="w-3 h-3" /> 막차!
                                                </span>
                                            ) : isNew ? (
                                                <span className="bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-emerald-400/30">
                                                    NEW
                                                </span>
                                            ) : null}
                                        </div>

                                        {/* 2. 상단 우측 (Top-Right): 평점(MetaScore/IGN) 고정 노출 */}
                                        {game.displayScore && (
                                            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 bg-black/70 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded-lg border border-white/20 text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-md">
                                                <span className="text-white/60 text-[8px] sm:text-[9px] font-bold">{game.scoreSource === 'MC' ? 'MC' : 'IGN'}</span>
                                                <span className={game.scoreSource === 'MC'
                                                    ? (game.displayScore >= 75 ? 'text-green-400' : game.displayScore >= 50 ? 'text-yellow-400' : 'text-red-400')
                                                    : 'text-purple-400'}>
                                                    {game.displayScore}
                                                </span>
                                            </div>
                                        )}

                                        {/* 3. 하단 우측 (Bottom-Right): 위시리스트 하트 버튼 */}
                                        <button
                                            onClick={(e) => handleLike(e, game.id)}
                                            className={`absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 p-2 rounded-full transition-all transform hover:scale-110 active:scale-95 z-20 shadow-lg backdrop-blur-md ${
                                                game.liked
                                                    ? 'bg-red-500 text-white shadow-red-500/40'
                                                    : 'bg-black/50 text-white/80 hover:text-red-400 border border-white/10'
                                            }`}
                                            aria-label="위시리스트 토글"
                                        >
                                            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${game.liked ? 'fill-current' : ''}`} />
                                        </button>
                                    </div>

                                    {/* 카드 하단 정보 컨텐츠 */}
                                    <div className="p-3 sm:p-4 flex flex-col flex-1 bg-transparent justify-between">
                                        <div>
                                            {/* 플랫폼 태그 & 발굴자 뱃지 (상단 한 줄 정렬) */}
                                            <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2 items-center min-h-[20px]">
                                                {game.pioneerName && (
                                                    <div className="inline-flex items-center gap-1 bg-ps-blue/10 border border-ps-blue/30 py-0.5 px-1.5 rounded-md shadow-sm">
                                                        <Pickaxe className="w-2.5 h-2.5 text-ps-blue" />
                                                        <span className="text-[9px] font-bold text-ps-blue truncate max-w-[80px] sm:max-w-[100px]">{game.pioneerName}</span>
                                                    </div>
                                                )}
                                                {game.isPs5ProEnhanced && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-zinc-800 text-white dark:bg-white dark:text-black border border-zinc-700 dark:border-white/20 tracking-wider shadow-sm">
                                                        PRO
                                                    </span>
                                                )}
                                                {game.inCatalog && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30">
                                                        EXTRA
                                                    </span>
                                                )}
                                                {!game.inCatalog && game.isPlusExclusive && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30">
                                                        PLUS
                                                    </span>
                                                )}
                                            </div>

                                            {/* 타이틀 */}
                                            <h3 className="text-xs sm:text-sm font-black text-primary leading-snug line-clamp-2 mb-2 group-hover:text-ps-blue transition-colors break-keep">
                                                {cleanTitle(game.name)}
                                            </h3>
                                        </div>

                                        {/* 하단 가격 & 진단 섹션 (PS 블루 뱃지 & 시원한 볼드) */}
                                        <div className="pt-2 border-t border-divider/40 flex items-end justify-between gap-1.5 mt-2">
                                            {/* PS 컨트롤러 심볼 가격 진단 */}
                                            <div className="shrink-0 mb-0.5">
                                                {game.priceVerdict === 'BUY_NOW' && <Circle className="w-6 h-6 sm:w-7 sm:h-7 text-green-500 fill-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />}
                                                {game.priceVerdict === 'GOOD_OFFER' && <Triangle className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />}
                                                {game.priceVerdict === 'WAIT' && <X className="w-6 h-6 sm:w-7 sm:h-7 text-red-400 stroke-[3] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                                                {(game.priceVerdict === 'TRACKING' || !game.priceVerdict) && <Square className="w-6 h-6 sm:w-7 sm:h-7 text-ps-blue fill-ps-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                                            </div>

                                            {/* 가격 정보 */}
                                            <div className="text-right flex flex-col items-end">
                                                {game.discountRate > 0 ? (
                                                    <div className="flex items-center justify-end gap-1.5 mb-1">
                                                        {game.originalPrice && (
                                                            <span className="text-[11px] sm:text-xs text-muted line-through font-medium leading-none">
                                                                ₩{game.originalPrice.toLocaleString()}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] sm:text-xs font-black text-ps-blue bg-ps-blue/10 dark:bg-ps-blue/15 border border-ps-blue/20 px-1.5 py-0.5 rounded leading-none">
                                                            -{game.discountRate}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="h-[18px]" />
                                                )}
                                                <p className="text-base sm:text-lg font-black text-primary tracking-tight leading-none">
                                                    {currentPrice ? `₩${currentPrice.toLocaleString()}` : '무료'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            !loading && (
                                <div className="col-span-full text-center py-24 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-surface border border-divider flex items-center justify-center">
                                        <Gamepad2 className="w-8 h-8 text-muted" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-primary mb-1">검색 결과가 없습니다</h4>
                                        <p className="text-xs text-secondary">필터 조건을 변경하거나 초기화해보세요.</p>
                                    </div>
                                    <button
                                        onClick={handleResetAllFilters}
                                        className="flex items-center gap-2 px-4 py-2 bg-ps-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-600 transition-all active:scale-95"
                                    >
                                        <X className="w-4 h-4" /> 필터 전체 초기화
                                    </button>
                                </div>
                            )
                        )
                    )}
                </div>

                {/* 무한스크롤 로더 & 끝 표시 */}
                {!loading && games.length > 0 && page >= totalPages - 1 && (
                    <div className="py-16 text-center flex flex-col items-center gap-2 border-t border-divider mt-12 opacity-60">
                        <Gamepad2 className="w-6 h-6 text-secondary" />
                        <p className="text-secondary font-bold text-xs">모든 게임을 다 확인하셨습니다 🎮</p>
                    </div>
                )}
                {loading && page > 0 && (
                    <div className="py-8 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ps-blue border-t-transparent"></div>
                    </div>
                )}

                {/* 스마트 플로팅 바 */}
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-in-out ${isFloatingVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
                    <div className="flex items-center gap-2 bg-glass backdrop-blur-2xl border border-divider p-2 pl-3 rounded-full shadow-2xl">
                        <button
                            onClick={() => setIsQuickSearchOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-divider hover:border-ps-blue hover:text-ps-blue transition-all active:scale-95"
                            title="빠른 검색 및 필터"
                        >
                            <Search className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-divider hover:border-green-500 transition-all active:scale-95"
                            title="맨 위로"
                        >
                            <Triangle className="w-4 h-4 text-green-500 fill-green-500" />
                        </button>

                        <div className="w-px h-5 bg-divider mx-0.5" />

                        <button
                            onClick={handleContactClick}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-ps-blue/10 border border-ps-blue/30 text-ps-blue hover:bg-ps-blue hover:text-white transition-all active:scale-95"
                            title="문의 및 피드백"
                        >
                            <Mail className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setIsDonationOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-500 hover:bg-yellow-400 hover:text-black transition-all active:scale-95"
                            title="감자 서버 후원"
                        >
                            <Server className="w-3.5 h-3.5" />
                            <span className="text-xs font-black">감자 밥주기</span>
                        </button>
                    </div>
                </div>

                {/* 모바일 퀵 서치 바텀시트 (기존 모든 필터 완벽 복원) */}
                {isQuickSearchOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsQuickSearchOpen(false)}
                    />
                )}
                <div
                    className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-in-out ${isQuickSearchOpen ? 'translate-y-0' : 'translate-y-full'}`}
                    onClick={() => setIsQuickSearchOpen(false)}
                >
                    <div
                        className="bg-base border-t border-divider rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.6)] max-w-3xl mx-auto max-h-[88vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 스와이프 핸들 */}
                        <div
                            className="shrink-0 flex justify-center pt-3 pb-2 cursor-grab touch-none"
                            onTouchStart={(e) => { swipeStartYRef.current = e.touches[0].clientY; }}
                            onTouchEnd={(e) => { if (e.changedTouches[0].clientY - swipeStartYRef.current > 60) setIsQuickSearchOpen(false); }}
                        >
                            <div className="w-10 h-1 rounded-full bg-divider-strong opacity-60" />
                        </div>

                        {/* 모달 헤더 */}
                        <div className="flex justify-between items-center px-6 py-3 border-b border-divider">
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-ps-blue" />
                                <h3 className="text-base font-black text-primary">퀵 필터 & 탐색</h3>
                            </div>
                            <button onClick={() => setIsQuickSearchOpen(false)} className="p-1.5 bg-surface hover:bg-surface-hover rounded-full transition-colors">
                                <X className="w-4 h-4 text-secondary" />
                            </button>
                        </div>

                        {/* 모달 스크롤 바디 */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 [&::-webkit-scrollbar]:hidden">
                            {/* 검색어 입력창 */}
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 tracking-widest uppercase mb-2">
                                    <Search className="w-3 h-3" /> SEARCH KEYWORD
                                </span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="게임 제목 검색 (스파이더맨, 엘든링...)"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-surface border border-divider rounded-xl px-4 py-2.5 text-xs text-primary placeholder-muted focus:border-ps-blue outline-none"
                                    />
                                    <button onClick={executeSearch} className="px-4 py-2.5 bg-ps-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-600 active:scale-95">
                                        검색
                                    </button>
                                </div>
                            </div>

                            {/* 1. 프리셋 섹션 */}
                            {(isAuthenticated && (presets.length > 0 || isFilterActive)) || (!isAuthenticated && isFilterActive) ? (
                                <div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 tracking-widest uppercase mb-2">
                                        <Bookmark className="w-3 h-3" /> MY PRESETS
                                    </span>
                                    <div className="flex flex-col gap-2">
                                        {presets.map(preset => {
                                            const isActive = activePresetId === preset.id;
                                            return (
                                                <div key={preset.id} className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { isActive ? setActivePresetId(null) : applyPreset(preset); setIsQuickSearchOpen(false); }}
                                                        className={`flex items-center justify-between flex-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                            isActive ? 'bg-amber-500/15 border-amber-500/50 text-amber-400' : 'bg-surface border-divider text-secondary'
                                                        }`}
                                                    >
                                                        <span>{preset.name}</span>
                                                        {isActive && <Check className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {presets.length < 5 && isFilterActive && (
                                            <button
                                                onClick={handleSavePreset}
                                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-divider text-xs font-bold text-muted hover:text-amber-400"
                                            >
                                                <Bookmark className="w-3.5 h-3.5" /> 현재 조건 저장
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {/* 2. 최근 본 게임 */}
                            {recentGames.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 tracking-widest uppercase">
                                            <Clock className="w-3 h-3" /> RECENT
                                        </span>
                                        <button onClick={() => { clearRecentGames(); setRecentGames([]); }} className="text-[10px] text-muted hover:text-red-400">
                                            비우기
                                        </button>
                                    </div>
                                    <div
                                        ref={recentGamesScrollRef}
                                        className="flex gap-2.5 overflow-x-auto pb-1 select-none [&::-webkit-scrollbar]:hidden"
                                        onPointerDown={handleRecentGamesDragStart}
                                        onPointerMove={handleRecentGamesDragMove}
                                        onPointerUp={handleRecentGamesDragEnd}
                                    >
                                        {recentGames.map((g) => (
                                            <button
                                                key={g.id}
                                                onClick={() => { if (dragStateRef.current.hasDragged) return; setIsQuickSearchOpen(false); navigate(`/games/${g.id}`, { state: { background: location } }); }}
                                                className="shrink-0 w-20 flex flex-col items-center gap-1 p-2 rounded-xl bg-surface border border-divider text-left"
                                            >
                                                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden">
                                                    <PSGameImage src={g.thumbnail} className="w-full h-full object-cover" width={120} />
                                                </div>
                                                <p className="text-[10px] font-bold text-primary line-clamp-1 w-full text-center">{cleanTitle(g.title)}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. 정렬 옵션 (SORT) */}
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 tracking-widest uppercase mb-2">
                                    <Timer className="w-3 h-3" /> SORT BY
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {sortOptions.map(opt => {
                                        const Icon = opt.icon;
                                        const isSelected = filter.sort === opt.value;
                                        return (
                                            <button key={opt.value} onClick={() => handleQuickSelect('sort', opt.value)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                                    isSelected ? 'bg-blue-500/15 border-blue-500/50 text-blue-400' : 'bg-surface border-divider text-secondary'
                                                }`}>
                                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : opt.color}`} />
                                                <span className="truncate">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 4. 할인율 선택 (DISCOUNT) */}
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-ps-blue tracking-widest uppercase mb-2">
                                    <Percent className="w-3 h-3" /> DISCOUNT
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    {discountOptions.map((opt) => (
                                        <button key={opt.value} onClick={() => handleQuickSelect('minDiscountRate', opt.value)}
                                            className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                                filter.minDiscountRate === opt.value
                                                    ? 'bg-ps-blue/15 border-ps-blue/50 text-ps-blue'
                                                    : 'bg-surface border-divider text-secondary'
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            
                            {/* 5. 가격대 (PRICE RANGE) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-green-400 tracking-widest uppercase">
                                        <Banknote className="w-3 h-3" /> PRICE RANGE
                                    </span>
                                    {isPriceFilterActive && (
                                        <button
                                            onClick={handlePriceReset}
                                            className="text-[10px] text-muted hover:text-red-400 transition-colors"
                                        >
                                            초기화
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="최소 가격"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                if (e.key === 'Enter') handlePriceApply();
                                            }}
                                            className="w-full bg-surface border border-divider rounded-xl pl-3 pr-8 py-2.5 text-xs text-primary placeholder-muted focus:border-green-400 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">원</span>
                                    </div>
                                    <span className="text-secondary font-bold text-xs">~</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="최대 가격"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                if (e.key === 'Enter') handlePriceApply();
                                            }}
                                            className="w-full bg-surface border border-divider rounded-xl pl-3 pr-8 py-2.5 text-xs text-primary placeholder-muted focus:border-green-400 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">원</span>
                                    </div>
                                    <button
                                        onClick={handlePriceApply}
                                        className="shrink-0 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>

                            {/* 6. 평점 선택 (META SCORE) */}
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 tracking-widest uppercase mb-2">
                                    <Star className="w-3 h-3" /> META SCORE
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    {metaScoreOptions.map((opt) => (
                                        <button key={opt.value} onClick={() => handleQuickSelect('minMetaScore', opt.value)}
                                            className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                                filter.minMetaScore === opt.value
                                                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-400'
                                                    : 'bg-surface border-divider text-secondary'
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 7. 맞춤 플레이타임 (PLAYTIME) */}
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-teal-400 tracking-widest uppercase mb-2">
                                    <Clock className="w-3 h-3" /> PLAYTIME
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    {PLAYTIME_PRESETS.map(preset => {
                                        const Icon = preset.icon;
                                        const isSelected = selectedPlayTimeId === preset.id;
                                        return (
                                            <button key={preset.id} onClick={() => handlePlayTimeSelect(preset, true)}
                                                className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                                    isSelected ? 'bg-teal-500/15 border-teal-500/50 text-teal-400' : 'bg-surface border-divider text-secondary'
                                                }`}>
                                                <div className="flex items-center gap-1.5">
                                                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-400' : preset.color}`} />
                                                    <span>{preset.label}</span>
                                                </div>
                                                <span className="opacity-50 text-[10px]">{preset.range}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 8. 특별 필터 & 플랫폼 (EXTRAS) */}
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-2">
                                    <Filter className="w-3 h-3" /> EXTRAS & PLATFORMS
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleQuickSelect('isAllTimeLow', !filter.isAllTimeLow)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                            filter.isAllTimeLow ? 'bg-green-500/15 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-surface border-divider text-secondary hover:border-green-400/40 hover:text-primary'
                                        }`}>
                                        <Circle className={`w-3.5 h-3.5 ${filter.isAllTimeLow ? 'fill-green-400 text-green-400' : 'text-green-500'}`} /> 역대최저만
                                    </button>

                                    <button onClick={() => handleQuickSelect('isPlusExclusive', !filter.isPlusExclusive)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                            filter.isPlusExclusive ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400' : 'bg-surface border-divider text-secondary'
                                        }`}>
                                        <Plus className="w-3.5 h-3.5" strokeWidth={3} /> PLUS 할인만
                                    </button>

                                    <button onClick={() => handleQuickSelect('inCatalog', !filter.inCatalog)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                            filter.inCatalog ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400' : 'bg-surface border-divider text-secondary'
                                        }`}>
                                        <Gamepad2 className="w-3.5 h-3.5 text-yellow-400" /> 스페셜 카탈로그
                                    </button>

                                    <button onClick={() => handleQuickSelect('isPs5ProEnhanced', !filter.isPs5ProEnhanced)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                            filter.isPs5ProEnhanced ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-divider text-secondary'
                                        }`}>
                                        <Sparkles className="w-3.5 h-3.5" /> PS5 Pro 향상
                                    </button>

                                    {platformOptions.slice(1).map((opt) => (
                                        <button key={opt.value} onClick={() => handleQuickSelect('platform', filter.platform === opt.value ? '' : opt.value)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                                                filter.platform === opt.value
                                                    ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-400'
                                                    : 'bg-surface border-divider text-secondary'
                                            }`}>
                                            <MonitorPlay className="w-3.5 h-3.5" /> {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 바텀시트 하단 푸터 버튼 */}
                        <div className="p-4 border-t border-divider bg-surface/50 flex gap-2">
                            <button
                                onClick={handleResetAllFilters}
                                className="flex-1 py-3 rounded-xl border border-divider text-xs font-bold text-secondary hover:text-primary transition-all active:scale-95"
                            >
                                초기화
                            </button>
                            <button
                                onClick={handleApplyQuickSearchAndClose}
                                className="flex-[2] py-3 rounded-xl bg-ps-blue text-white text-xs font-bold shadow-md hover:bg-blue-600 transition-all active:scale-95"
                            >
                                필터 적용 완료
                            </button>
                        </div>
                    </div>
                </div>

                {/* 프리셋 이름 입력 모달 */}
                {isPresetNameModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-base border border-divider rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                            <h3 className="text-base font-black text-primary mb-1">
                                {presetEditingId ? '프리셋 이름 수정' : '탐색 조건 저장'}
                            </h3>
                            <p className="text-xs text-secondary mb-4">현재 설정된 필터 조건을 저장하고 빠르게 불러올 수 있습니다.</p>
                            <input
                                type="text"
                                maxLength={20}
                                value={presetNameInput}
                                onChange={(e) => setPresetNameInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleModalConfirm(); }}
                                placeholder="프리셋 이름 (최대 20자)"
                                className="w-full bg-surface border border-divider rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:border-ps-blue outline-none mb-4"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsPresetNameModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-divider text-xs font-bold text-secondary hover:text-primary"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleModalConfirm}
                                    className="flex-1 py-2.5 rounded-xl bg-ps-blue text-white text-xs font-bold hover:bg-blue-600 shadow-md"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 감자 서버 후원 모달 */}
                <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
            </main>
        </div>
    );
};

export default GameListPage;
