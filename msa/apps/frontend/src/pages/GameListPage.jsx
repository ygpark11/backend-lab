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
    MonitorPlay,
    Percent,
    Pickaxe,
    Plus,
    Search,
    Server,
    Sparkles,
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
import {useAuth} from '../contexts/AuthContext';
import DonationModal from '../components/DonationModal';

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
    const { openLoginModal } = useAuth();

    const lastScrollYRef = useRef(0);
    const observer = useRef();

    const [isDonationOpen, setIsDonationOpen] = useState(false);
    const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
    const [isFloatingVisible, setIsFloatingVisible] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [showFilter, setShowFilter] = useState(false);
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

    const handlePriceReset = () => {
        setPriceRange({ min: '', max: '' });
        setFilter(prev => ({ ...prev, minPrice: '', maxPrice: '' }));
        setActiveDropdown(null);
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
        setActiveDropdown(null);
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
            setActiveDropdown(null);
        }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') executeSearch(); };

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
        setActiveDropdown(null);
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
            <SEO title="게임 목록" description="플레이스테이션 게임 실시간 최저가 확인 및 할인 정보" />

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

                <div className="relative z-40 bg-glass backdrop-blur-md md:backdrop-blur-xl p-6 rounded-xl border border-divider shadow-lg mb-8 transition-colors duration-500">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="keyword"
                                placeholder="게임 제목 검색..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-base border border-divider rounded-lg py-3 pl-12 pr-4 text-primary placeholder-muted focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all shadow-inner" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                        </div>

                        <div className="relative min-w-[180px]">
                            <button
                                disabled={filter.isBestSeller || filter.isMostDownloaded}
                                onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                                onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'sort' ? null : prev), 200)}
                                className={`w-full bg-base border border-divider rounded-lg px-4 py-3 text-sm font-bold text-primary flex items-center justify-between transition-all shadow-inner
                                    ${(filter.isBestSeller || filter.isMostDownloaded) ? 'opacity-50 cursor-not-allowed' : 'hover:border-ps-blue hover:bg-surface-hover'}`}
                            >
                                <span className="flex items-center gap-2">
                                    {(filter.isBestSeller || filter.isMostDownloaded) ? (
                                        <><Lock className="w-4 h-4 text-secondary"/> 랭킹순 고정됨</>
                                    ) : (
                                        <>
                                            {sortOptions.find(opt => opt.value === filter.sort)?.icon && React.createElement(sortOptions.find(opt => opt.value === filter.sort).icon, { className: `w-4 h-4 ${sortOptions.find(opt => opt.value === filter.sort).color}` })}
                                            {sortOptions.find(opt => opt.value === filter.sort)?.label.split(' ')[1] || '정렬'}
                                        </>
                                    )}
                                </span>
                                {!(filter.isBestSeller || filter.isMostDownloaded) && <ChevronDown className={`w-4 h-4 text-secondary transition-transform duration-200 ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />}
                            </button>
                            {activeDropdown === 'sort' && (
                                <div className="absolute top-full mt-2 right-0 w-full bg-base border border-divider rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn origin-top">
                                    <div className="py-1">
                                        {sortOptions.map((option) => (
                                            <button key={option.value} onClick={() => handleCustomSelect('sort', option.value)} className={`w-full px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${filter.sort === option.value ? 'bg-ps-blue/10 text-ps-blue' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                                <option.icon className={`w-4 h-4 ${option.color}`} /> {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                                showFilter
                                    ? 'bg-ps-blue border-ps-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                    : 'bg-base border-divider text-secondary hover:border-primary hover:text-primary shadow-inner'
                            }`}
                        >
                            <Filter className="w-4 h-4" /> 상세 필터
                        </button>
                        <button
                            onClick={executeSearch}
                            className="px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 shadow-md"
                        >
                            검색
                        </button>
                    </div>

                    {showFilter && (
                        <div className="mt-6 pt-6 border-t border-divider grid grid-cols-2 md:grid-cols-4 gap-6 animate-fadeIn">
                            <div className="relative">
                                <label className="block text-xs text-secondary mb-2 font-bold flex items-center gap-1"><Percent className="w-3 h-3 text-red-400"/>최소 할인율</label>
                                <button onClick={() => setActiveDropdown(activeDropdown === 'discount' ? null : 'discount')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'discount' ? null : prev), 200)} className="w-full bg-base border border-divider rounded-lg px-4 py-2.5 text-sm text-primary flex items-center justify-between hover:border-ps-blue hover:bg-surface-hover transition-all text-left shadow-inner">
                                    <span className="truncate">{discountOptions.find(o => o.value === filter.minDiscountRate)?.label}</span>
                                    <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${activeDropdown === 'discount' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'discount' && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-base border border-divider rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                                        <div className="py-1">
                                            {discountOptions.map((opt) => (
                                                <button key={opt.value} onClick={() => handleCustomSelect('minDiscountRate', opt.value)} className={`w-full px-4 py-3 text-sm text-left transition-colors ${filter.minDiscountRate === opt.value ? 'bg-ps-blue/10 text-ps-blue font-bold' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-xs text-secondary mb-2 font-bold flex items-center gap-1"><CircleDollarSign className="w-3 h-3 text-green-400"/>가격 범위</label>
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
                                    className={`w-full bg-base border border-divider rounded-lg px-4 py-2.5 text-sm flex items-center justify-between hover:border-ps-blue hover:bg-surface-hover transition-all text-left shadow-inner ${
                                        isPriceFilterActive ? 'bg-ps-blue/10 text-ps-blue font-bold border-ps-blue/50' : 'text-primary'
                                    }`}
                                >
                                    <span className="truncate">
                                        {isPriceFilterActive
                                            ? `${filter.minPrice ? Number(filter.minPrice).toLocaleString() + '원' : '0원'} ~ ${filter.maxPrice ? Number(filter.maxPrice).toLocaleString() + '원' : '최대'}`
                                            : '전체 범위'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${activeDropdown === 'price' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'price' && (
                                    <div className="absolute top-full mt-2 right-0 md:right-auto md:left-0 w-[300px] md:w-80 bg-base border border-divider rounded-2xl shadow-2xl z-50 p-5 animate-fadeIn origin-top-right md:origin-top-left" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2 mb-5">
                                            <div className="relative flex-1">
                                                <input type="number" min="0" placeholder="예: 10000" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} className="w-full bg-surface border border-divider rounded-lg pl-3 pr-8 py-2 text-primary text-sm focus:border-ps-blue outline-none transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">원</span>
                                            </div>
                                            <span className="text-secondary font-bold">~</span>
                                            <div className="relative flex-1">
                                                <input type="number" min="0" placeholder="예: 50000" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} className="w-full bg-surface border border-divider rounded-lg pl-3 pr-8 py-2 text-primary text-sm focus:border-ps-blue outline-none transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">원</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handlePriceReset} className="flex-1 px-4 py-2 bg-surface hover:bg-surface-hover text-secondary hover:text-primary rounded-lg text-xs font-bold transition-colors">초기화</button>
                                            <button onClick={handlePriceApply} className="flex-1 px-4 py-2 bg-ps-blue hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">적용</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-xs text-secondary mb-2 font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-teal-400"/>플레이 타임
                                </label>
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'playtime' ? null : 'playtime')}
                                    className={`w-full bg-base border border-divider rounded-lg px-4 py-2.5 text-sm flex items-center justify-between hover:border-ps-blue hover:bg-surface-hover transition-all text-left shadow-inner ${
                                        isPlayTimeFilterActive ? 'bg-ps-blue/10 text-ps-blue font-bold border-ps-blue/50' : 'text-primary'
                                    }`}
                                >
                                    <span className="truncate">
                                        {isPlayTimeFilterActive
                                            ? PLAYTIME_PRESETS.find(p => p.id === selectedPlayTimeId)?.label || '선택됨'
                                            : '전체 시간'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${activeDropdown === 'playtime' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'playtime' && (
                                    <div className="absolute top-full mt-2 left-0 w-[280px] bg-base border border-divider rounded-2xl shadow-2xl z-50 p-4 animate-fadeIn origin-top-left" onClick={(e) => e.stopPropagation()}>
                                        <div className="grid grid-cols-2 gap-2">
                                            {PLAYTIME_PRESETS.map((preset) => {
                                                const Icon = preset.icon;
                                                const isSelected = selectedPlayTimeId === preset.id;
                                                return (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => handlePlayTimeSelect(preset, false)}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                                                            isSelected
                                                                ? 'bg-ps-blue/10 border-ps-blue text-ps-blue shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                                : `bg-surface border-divider ${preset.bg} text-primary`
                                                        }`}
                                                    >
                                                        <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-ps-blue' : preset.color}`} />
                                                        <span className="text-xs font-black tracking-tight">{preset.label}</span>
                                                        <span className="text-[9px] font-bold opacity-60">{preset.range}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePlayTimeSelect(null, false)}
                                            className="w-full mt-3 py-2.5 bg-surface hover:bg-surface-hover text-xs font-bold text-secondary hover:text-primary rounded-lg transition-colors border border-divider shadow-sm"
                                        >
                                            전체 시간
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-xs text-secondary mb-2 font-bold flex items-center gap-1"><Star className="w-3 h-3 text-purple-400"/>전문가 평점</label>
                                <button onClick={() => setActiveDropdown(activeDropdown === 'metaScore' ? null : 'metaScore')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'metaScore' ? null : prev), 200)} className="w-full bg-base border border-divider rounded-lg px-4 py-2.5 text-sm text-primary flex items-center justify-between hover:border-ps-blue hover:bg-surface-hover transition-all text-left shadow-inner">
                                    <span className="truncate">{metaScoreOptions.find(o => o.value === filter.minMetaScore)?.label}</span>
                                    <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${activeDropdown === 'metaScore' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'metaScore' && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-base border border-divider rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                                        <div className="py-1">
                                            {metaScoreOptions.map((opt) => (
                                                <button key={opt.value} onClick={() => handleCustomSelect('minMetaScore', opt.value)} className={`w-full px-4 py-3 text-sm text-left transition-colors ${filter.minMetaScore === opt.value ? 'bg-ps-blue/10 text-ps-blue font-bold' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-xs text-secondary mb-2 font-bold flex items-center gap-1"><MonitorPlay className="w-3 h-3 text-blue-400"/>플랫폼</label>
                                <button onClick={() => setActiveDropdown(activeDropdown === 'platform' ? null : 'platform')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'platform' ? null : prev), 200)} className="w-full bg-base border border-divider rounded-lg px-4 py-2.5 text-sm text-primary flex items-center justify-between hover:border-ps-blue hover:bg-surface-hover transition-all text-left shadow-inner">
                                    <span className="truncate">{platformOptions.find(o => o.value === filter.platform)?.label}</span>
                                    <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${activeDropdown === 'platform' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'platform' && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-base border border-divider rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                                        <div className="py-1">
                                            {platformOptions.map((opt) => (
                                                <button key={opt.value} onClick={() => handleCustomSelect('platform', opt.value)} className={`w-full px-4 py-3 text-sm text-left transition-colors ${filter.platform === opt.value ? 'bg-ps-blue/10 text-ps-blue font-bold' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="col-span-2 md:col-span-4 flex flex-row flex-wrap items-center gap-6 pt-2 h-full">
                                <label className="flex items-center gap-2 cursor-pointer group hover:bg-surface-hover p-2 rounded-lg transition-colors border border-transparent">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" name="isPlusExclusive" checked={filter.isPlusExclusive} onChange={handleFilterChange} className="peer w-4 h-4 appearance-none rounded bg-base border border-divider-strong checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer shadow-inner" />
                                        <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-bold text-secondary group-hover:text-primary transition-colors"><span className="text-yellow-500 font-black">PLUS</span> 전용 할인</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group hover:bg-surface-hover p-2 rounded-lg transition-colors border border-transparent">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" name="inCatalog" checked={filter.inCatalog} onChange={handleFilterChange} className="peer w-4 h-4 appearance-none rounded bg-base border border-divider-strong checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer shadow-inner" />
                                        <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-bold text-secondary group-hover:text-primary transition-colors flex items-center gap-1.5"><Gamepad2 className="w-4 h-4 text-yellow-500" /> 스페셜(무료) 포함</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group hover:bg-surface-hover p-2 rounded-lg transition-colors border border-transparent">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" name="isPs5ProEnhanced" checked={filter.isPs5ProEnhanced} onChange={handleFilterChange} className="peer w-4 h-4 appearance-none rounded bg-base border border-divider-strong checked:bg-primary checked:border-primary transition-all cursor-pointer shadow-inner" />
                                        <Check className="absolute w-3 h-3 text-[color:var(--color-bg-base)] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-bold text-secondary group-hover:text-primary transition-colors flex items-center gap-1.5">
                                        <Sparkles className={`w-4 h-4 ${filter.isPs5ProEnhanced ? 'text-primary' : 'text-secondary'}`} /> PS5 Pro 향상
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

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
                                    className={`group bg-glass backdrop-blur-md rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-lg cursor-pointer border relative flex flex-col h-full ${game.priceVerdict === 'BUY_NOW' ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-divider hover:border-[color:var(--bento-blue-border-hover)] hover:[box-shadow:var(--bento-blue-shadow)]'}`}
                                >
                                    <div
                                        className="aspect-[3/4] overflow-hidden relative shrink-0 bg-base"
                                    >
                                        <PSGameImage
                                            src={game.imageUrl}
                                            alt={game.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                        <button onClick={() => setIsQuickSearchOpen(true)} className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-hover transition-all border border-divider bg-surface" title="빠른 검색"><Search className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" /></button>

                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-hover transition-all border border-divider bg-surface" title="맨 위로"><Triangle className="w-5 h-5 text-green-500 fill-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] group-hover:-translate-y-1 transition-transform" /></button>

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

                <div className={`fixed inset-x-0 bottom-0 z-[60] transition-transform duration-300 ease-in-out ${isQuickSearchOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="bg-base border-t border-divider p-6 md:p-8 rounded-t-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.5)] max-w-3xl mx-auto max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex justify-between items-center mb-6 sticky top-0 bg-base pb-4 z-10 border-b border-divider">
                            <h3 className="text-xl font-black text-primary flex items-center gap-2"><Search className="w-5 h-5 text-ps-blue"/> 퀵 서치 & 필터</h3>
                            <button onClick={() => setIsQuickSearchOpen(false)} className="p-2 bg-surface hover:bg-[var(--bento-red-from)] rounded-full transition-colors"><X className="w-5 h-5 text-secondary hover:text-red-500"/></button>
                        </div>

                        <div className="flex flex-col gap-8 pb-24">
                            <div>
                                <label className="block text-sm font-bold text-secondary mb-2">어떤 게임을 찾으시나요?</label>
                                <div className="relative">
                                    <input type="text" name="keyword" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleKeyDown} className="w-full bg-surface border border-divider rounded-xl py-4 pl-12 pr-4 text-primary placeholder-muted focus:border-ps-blue outline-none transition-all shadow-inner" />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-secondary mb-2">원하시는 가격대가 있나요?</label>
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

                            <div>
                                <label className="block text-sm font-bold text-secondary mb-3 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-teal-400" /> 어떤 볼륨의 게임을 찾으세요?
                                </label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {PLAYTIME_PRESETS.map((preset) => {
                                        const Icon = preset.icon;
                                        const isSelected = selectedPlayTimeId === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                // 퀵서치에서는 선택 시 즉시 닫히며 검색되도록 true 전달
                                                onClick={() => handlePlayTimeSelect(preset, true)}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                                    isSelected
                                                        ? 'bg-ps-blue border-ps-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                                        : 'bg-surface border-divider text-primary hover:bg-surface-hover'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-base border border-divider'}`}>
                                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : preset.color}`} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs font-black">{preset.label}</div>
                                                    <div className={`text-[10px] font-bold opacity-60 ${isSelected ? 'text-white/80' : 'text-secondary'}`}>{preset.range}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => handlePlayTimeSelect(null, true)}
                                    className="w-full mt-3 py-3.5 bg-surface hover:bg-surface-hover text-sm font-bold text-secondary hover:text-primary rounded-xl transition-colors border border-divider shadow-sm"
                                >
                                    전체 시간
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-secondary mb-3 flex items-center justify-between">
                                    정렬 기준
                                    {(filter.isBestSeller || filter.isMostDownloaded) && <span className="text-xs text-amber-500 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> 랭킹 모드 고정됨</span>}
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {sortOptions.map((opt) => {
                                        const isLocked = filter.isBestSeller || filter.isMostDownloaded;
                                        return (
                                            <button key={opt.value} disabled={isLocked} onClick={() => handleQuickSelect('sort', opt.value)} className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs md:text-sm transition-all ${isLocked ? 'opacity-40 cursor-not-allowed bg-surface border-divider text-muted' : filter.sort === opt.value ? 'bg-ps-blue/10 border-ps-blue text-ps-blue shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                                <opt.icon className={`w-4 h-4 shrink-0 ${isLocked ? 'text-muted' : filter.sort === opt.value ? 'text-ps-blue' : opt.color}`} />
                                                <span className="truncate">{opt.label}</span>
                                            </button>
                                        )})}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-secondary mb-3">최소 할인율</label>
                                    <div className="flex flex-wrap gap-2">
                                        {discountOptions.map((opt) => (
                                            <button key={opt.value} onClick={() => handleQuickSelect('minDiscountRate', opt.value)} className={`px-4 py-2 rounded-lg border font-bold text-xs transition-all ${filter.minDiscountRate === opt.value ? 'bg-[var(--bento-red-from)] border-[color:var(--bento-red-border)] text-red-500 shadow-sm' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-secondary mb-3">전문가 평점</label>
                                    <div className="flex flex-wrap gap-2">
                                        {metaScoreOptions.map((opt) => (
                                            <button key={opt.value} onClick={() => handleQuickSelect('minMetaScore', opt.value)} className={`px-4 py-2 rounded-lg border font-bold text-xs transition-all ${filter.minMetaScore === opt.value ? 'bg-[var(--bento-purple-from)] border-[color:var(--bento-purple-border)] text-purple-500 shadow-sm' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-secondary mb-3">추가 옵션</label>
                                <div className="flex flex-wrap gap-3">
                                    {platformOptions.slice(1).map((opt) => (
                                        <button key={opt.value} onClick={() => handleQuickSelect('platform', filter.platform === opt.value ? '' : opt.value)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${filter.platform === opt.value ? 'bg-[var(--bento-blue-from)] border-[color:var(--bento-blue-border)] text-ps-blue shadow-sm' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                            <MonitorPlay className="w-4 h-4 text-blue-500" /> {opt.label}
                                        </button>
                                    ))}
                                    <button onClick={() => handleQuickSelect('isPlusExclusive', !filter.isPlusExclusive)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${filter.isPlusExclusive ? 'bg-[var(--bento-yellow-from)] border-[color:var(--bento-yellow-border)] text-yellow-600 shadow-sm' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                        <Star className="w-4 h-4 text-yellow-500" /> <span className="text-yellow-500 font-black">PLUS</span> 할인만
                                    </button>
                                    <button onClick={() => handleQuickSelect('inCatalog', !filter.inCatalog)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${filter.inCatalog ? 'bg-[var(--bento-yellow-from)] border-[color:var(--bento-yellow-border)] text-yellow-600 shadow-sm' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                        <Layers className="w-4 h-4 text-yellow-500" /> 스페셜 카탈로그
                                    </button>
                                    <button onClick={() => handleQuickSelect('isPs5ProEnhanced', !filter.isPs5ProEnhanced)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all ${filter.isPs5ProEnhanced ? 'bg-primary border-primary text-[color:var(--color-bg-base)] shadow-glow' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
                                        <Sparkles className={`w-4 h-4 ${filter.isPs5ProEnhanced ? 'text-base' : 'text-primary'}`} /> PS5 Pro 향상
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-4 bg-base border-t border-divider">
                            <button onClick={executeSearch} className="w-full bg-ps-blue hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-colors shadow-glow-blue flex items-center justify-center gap-2">
                                <Search className="w-5 h-5" /> 검색어 적용하기
                            </button>
                        </div>
                    </div>
                </div>
                {isQuickSearchOpen && <div className="fixed inset-0 z-[55] bg-backdrop backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsQuickSearchOpen(false)}></div>}

                <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
            </div>
        </div>
    );
};

export default GameListPage;