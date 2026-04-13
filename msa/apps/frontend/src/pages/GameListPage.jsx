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
    X
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import {useAuth} from '../contexts/AuthContext';
import DonationModal from '../components/DonationModal';

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
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '');

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
        isAllTimeLow: searchParams.get('isAllTimeLow') === 'true',
        isPs5ProEnhanced: searchParams.get('isPs5ProEnhanced') === 'true',
        isBestSeller: searchParams.get('isBestSeller') === 'true',
        isMostDownloaded: searchParams.get('isMostDownloaded') === 'true'
    }));

    const isPriceFilterActive = filter.minPrice !== '' || filter.maxPrice !== '';

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
                ...(currentFilter.isAllTimeLow && { isAllTimeLow: true }),
                ...(currentFilter.isPs5ProEnhanced && { isPs5ProEnhanced: true }),
                ...(currentFilter.isBestSeller && { isBestSeller: true }),
                ...(currentFilter.isMostDownloaded && { isMostDownloaded: true }),
            };
            const response = await client.get('/api/v1/games/search', { params });

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

    const handleKeyDown = (e) => { if (e.key === 'Enter') executeSearch(); };

    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilter(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (name !== 'keyword') setPage(0);
    };

    const handleCustomSelect = (name, value) => {
        setFilter(prev => ({ ...prev, [name]: value }));
        setActiveDropdown(null);
        setPage(0);
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
                    !prev.isAllTimeLow &&
                    !prev.isPs5ProEnhanced &&
                    !prev.isBestSeller &&
                    !prev.isMostDownloaded;

                if (isAlreadyDefault) return prev;

                setPage(0);
                setSearchInput('');
                setPriceRange({ min: '', max: '' });
                return {
                    keyword: '', genre: '', minDiscountRate: '', minMetaScore: '',
                    platform: '', isPlusExclusive: false, inCatalog: false,
                    sort: 'lastUpdated,desc', minPrice: '', maxPrice: '',
                    isAllTimeLow: false,
                    isPs5ProEnhanced: false,
                    isBestSeller: false,
                    isMostDownloaded: false
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
            const urlIsAllTimeLow = searchParams.get('isAllTimeLow') === 'true';
            const urlIsPs5ProEnhanced = searchParams.get('isPs5ProEnhanced') === 'true';
            const urlIsBestSeller = searchParams.get('isBestSeller') === 'true';
            const urlIsMostDownloaded = searchParams.get('isMostDownloaded') === 'true';

            setFilter(prev => {
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
                    prev.isAllTimeLow === urlIsAllTimeLow &&
                    prev.isPs5ProEnhanced === urlIsPs5ProEnhanced &&
                    prev.isBestSeller === urlIsBestSeller &&
                    prev.isMostDownloaded === urlIsMostDownloaded
                ) {
                    return prev;
                }

                setPage(0);
                setSearchInput(urlKeyword);
                setPriceRange({ min: urlMinPrice, max: urlMaxPrice });

                return {
                    keyword: urlKeyword, genre: urlGenre, minDiscountRate: urlMinDiscountRate,
                    minMetaScore: urlMinMetaScore, platform: urlPlatform, isPlusExclusive: urlIsPlusExclusive,
                    inCatalog: urlInCatalog, sort: urlSort, minPrice: urlMinPrice,
                    maxPrice: urlMaxPrice, isAllTimeLow: urlIsAllTimeLow,
                    isPs5ProEnhanced: urlIsPs5ProEnhanced,
                    isBestSeller: urlIsBestSeller,
                    isMostDownloaded: urlIsMostDownloaded
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
        if (filter.isAllTimeLow) params.isAllTimeLow = 'true';
        if (filter.isPs5ProEnhanced) params.isPs5ProEnhanced = 'true';
        if (filter.isBestSeller) params.isBestSeller = 'true';
        if (filter.isMostDownloaded) params.isMostDownloaded = 'true';

        const currentParamsStr = searchParams.toString();
        const newParamsStr = new URLSearchParams(params).toString();

        if (currentParamsStr !== newParamsStr) {
            setSearchParams(params, { replace: true });
        }
    }, [filter]);

    useEffect(() => {
        fetchGames(page);
    }, [
        page,
        filter.sort,
        filter.genre,
        filter.minDiscountRate,
        filter.minMetaScore,
        filter.platform,
        filter.isPlusExclusive,
        filter.inCatalog,
        filter.minPrice,
        filter.maxPrice,
        filter.isAllTimeLow,
        filter.keyword,
        filter.isPs5ProEnhanced,
        filter.isBestSeller,
        filter.isMostDownloaded
    ]);

    const sortOptions = [
        { value: 'lastUpdated,desc', label: '최근 업데이트순', icon: Clock, color: 'text-blue-400' },
        { value: 'releaseDate,desc', label: '최신 발매순', icon: CalendarDays, color: 'text-purple-400' },
        { value: 'saleEndDate,asc', label: '마감 임박순', icon: Timer, color: 'text-orange-400' },
        { value: 'price,asc', label: '낮은 가격순', icon: Banknote, color: 'text-green-400' },
        { value: 'discountRate,desc', label: '높은 할인율순', icon: TrendingUp, color: 'text-red-400' },
        { value: 'metaScore,desc', label: '높은 평점순', icon: Star, color: 'text-purple-400' }
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

                {/* 다이내믹 인사이트 배너 */}
                {filter.isAllTimeLow ? (
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

                ) : (filter.minMetaScore === '85' && filter.minDiscountRate === '50') ? (
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

                ) : (filter.minDiscountRate === '1' && filter.minMetaScore === '') ? (
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
                ) : filter.isBestSeller ? (
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

                ) : filter.isMostDownloaded ? (
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
                ) : (
                    /* ⚪ 상태 6: 아무 필터도 없을 때 기본 배너 */
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
                )}

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
                            const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
                            const isLastElement = games.length === index + 1;

                            const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                            const isClosing = !isLastCall && daysLeft <= 3;

                            const rankToDisplay = filter.isBestSeller ? game.bestSellerRank
                                : filter.isMostDownloaded ? game.mostDownloadedRank
                                    : null;

                            return (
                                <div
                                    key={game.id}
                                    ref={isLastElement ? lastGameElementRef : null}
                                    onClick={() => navigate(`/games/${game.id}`, { state: { background: location } })}
                                    className={`group bg-glass backdrop-blur-md rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-lg cursor-pointer border relative flex flex-col h-full ${isPlatinum ? 'border-[color:var(--bento-yellow-border-hover)] shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'border-divider hover:border-[color:var(--bento-blue-border-hover)] hover:[box-shadow:var(--bento-blue-shadow)]'}`}
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
                                        {isPlatinum && <div className="absolute top-2 right-2 z-20"><Sparkles className="w-5 h-5 text-yellow-300 animate-pulse drop-shadow-md" /></div>}
                                        {isLastCall && <span className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 막차!</span>}
                                        {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}

                                        <button onClick={(e) => handleLike(e, game.id)} className={`absolute bottom-12 right-2 p-2 rounded-full transition-all transform hover:scale-110 z-20 shadow-lg backdrop-blur-sm ${game.liked ? 'bg-red-500/20 text-red-500' : 'bg-glass text-secondary hover:bg-[var(--bento-red-from)] hover:text-red-500'}`}>
                                            <Heart className={`w-5 h-5 ${game.liked ? 'fill-current' : ''}`} />
                                        </button>

                                        {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}

                                        {game.inCatalog ? (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(250,204,21,0.6)] z-10 flex items-center gap-1 animate-pulse-slow">
                                                <Gamepad2 className="w-3 h-3 fill-black" /> EXTRA
                                            </span>
                                        ) : game.isPlusExclusive ? (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow-md">PLUS</span>
                                        ) : null}
                                    </div>

                                    <div className="p-4 flex flex-col flex-1 bg-transparent relative z-20">
                                        <div className="flex flex-wrap gap-1 mb-2 min-h-[22px] items-center">
                                            {game.isPs5ProEnhanced && <span className="text-[10px] px-1.5 py-0.5 rounded border font-black bg-gradient-to-r from-gray-300 to-white text-black border-white shadow-[0_0_8px_rgba(255,255,255,0.4)] tracking-wider">PRO</span>}
                                            {game.genres && game.genres.length > 0 ? (
                                                game.genres.map((g, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-colors ${getGenreBadgeStyle(g)}`}>{g}</span>)
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
                                <div className="col-span-full text-center py-20 flex flex-col items-center gap-4">
                                    <Gamepad2 className="w-12 h-12 text-muted" />
                                    <p className="text-secondary">검색 결과가 없습니다.</p>
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
                                    <button onClick={() => handleFilterChange('isPs5ProEnhanced', !filter.isPs5ProEnhanced)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${filter.isPs5ProEnhanced ? 'bg-primary border-primary text-[color:var(--color-bg-base)] shadow-glow' : 'bg-surface border-divider text-secondary hover:bg-surface-hover hover:text-primary shadow-sm'}`}>
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