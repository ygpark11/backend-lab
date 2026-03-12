import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getGenreBadgeStyle } from "../utils/uiUtils.js";
import client from '../api/client';
import toast from 'react-hot-toast';
import SkeletonCard from '../components/SkeletonCard';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
    Activity, Banknote, ChevronDown, CircleDollarSign, Clock, Filter, Gamepad2, Heart, TrendingDown, Search, Sparkles,
    Timer, TrendingUp, Waves, X, Check, CalendarDays, Star, Server, Triangle, Layers, MonitorPlay, Percent,
    Flame, ChevronRight
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';
import { requestFcmToken, isSupported } from '../utils/fcm';
import DonationModal from '../components/DonationModal';

const GameListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated, openLoginModal } = useAuth();

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
        isAllTimeLow: searchParams.get('isAllTimeLow') === 'true'
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

    // 커스텀 드롭다운 핸들러 (메인 화면)
    const handleCustomSelect = (name, value) => {
        setFilter(prev => ({ ...prev, [name]: value }));
        setActiveDropdown(null);
        setPage(0);
    };

    // 퀵 서치 즉시 적용 핸들러 (바텀 시트용)
    const handleQuickSelect = (name, value) => {
        setFilter(prev => ({ ...prev, [name]: value }));
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 최상단 이동
        setPage(0);
        setIsQuickSearchOpen(false); // 즉시 닫힘 (배경 선명해짐)
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

    // 스크롤 감지 (플로팅 바 숨김/표시)
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
        if (!location.search) {
            setFilter(prev => {
                const isAlreadyDefault =
                    prev.keyword === '' && prev.genre === '' &&
                    prev.minDiscountRate === '' && prev.minMetaScore === '' &&
                    prev.platform === '' && !prev.isPlusExclusive &&
                    !prev.inCatalog && prev.sort === 'lastUpdated,desc' &&
                    prev.minPrice === '' && prev.maxPrice === '' && !prev.isAllTimeLow;

                if (isAlreadyDefault) return prev;

                setPage(0);
                setSearchInput('');
                setPriceRange({ min: '', max: '' }); // 가격 UI도 초기화
                return {
                    keyword: '', genre: '', minDiscountRate: '', minMetaScore: '',
                    platform: '', isPlusExclusive: false, inCatalog: false,
                    sort: 'lastUpdated,desc', minPrice: '', maxPrice: '', isAllTimeLow: false
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
                    prev.isAllTimeLow === urlIsAllTimeLow
                ) {
                    return prev;
                }

                setPage(0);
                setSearchInput(urlKeyword); // 검색창 UI 동기화
                setPriceRange({ min: urlMinPrice, max: urlMaxPrice });

                return {
                    keyword: urlKeyword, genre: urlGenre, minDiscountRate: urlMinDiscountRate,
                    minMetaScore: urlMinMetaScore, platform: urlPlatform, isPlusExclusive: urlIsPlusExclusive,
                    inCatalog: urlInCatalog, sort: urlSort, minPrice: urlMinPrice,
                    maxPrice: urlMaxPrice, isAllTimeLow: urlIsAllTimeLow
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
        filter.keyword
    ]);

    useEffect(() => {

        if (!isAuthenticated) return;

        const initNotificationToast = async () => {
            const supported = await isSupported();
            if (!supported || !('Notification' in window)) return;

            const hasSkipped = sessionStorage.getItem('skipNotification');

            if (Notification.permission === 'default' && !hasSkipped) {
                toast((t) => (
                    <div className="flex flex-col gap-3 min-w-[250px]">
                        <div className="flex flex-col"><span className="font-bold text-sm text-gray-900">찜한 게임 할인 알림 받기</span><span className="text-xs text-gray-500 mt-1">가격이 떨어지면 가장 먼저 알려드릴까요?</span></div>
                        <div className="flex gap-2">
                            <button className="bg-ps-blue text-white px-3 py-1.5 rounded text-xs font-bold shadow-md flex-1" onClick={async () => { toast.dismiss(t.id); await requestFcmToken(); if (Notification.permission === 'granted') toast.success('알림 설정 완료!'); else toast.error('알림 차단됨'); }}>네, 받을래요!</button>
                            <button className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold flex-1" onClick={() => {
                                toast.dismiss(t.id);
                                sessionStorage.setItem('skipNotification', 'true');
                            }}>나중에</button>
                        </div>
                    </div>
                ), {
                    id: 'fcm-permission-toast',
                    duration: 10000,
                    style: { background: '#fff', padding: '16px', borderRadius: '12px' }
                });
            }
        };
        initNotificationToast();
    }, [isAuthenticated]);

    // 드롭다운 및 칩에 사용될 옵션 데이터
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

    if (loading && page === 0 && isInitialLoad) return <div className="min-h-screen pt-20 flex justify-center"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-ps-black text-white relative">
            <SEO title="게임 목록" description="플레이스테이션 게임 실시간 최저가 확인 및 할인 정보" />

            <div className="pt-24 md:pt-32 px-6 md:px-10 pb-24 max-w-7xl mx-auto">

                {/* 장르 파도타기 배너 */}
                {filter.genre && (
                    <div className="mb-6 relative overflow-hidden rounded-xl border border-blue-500/30 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-purple-900/60 to-blue-900/60 animate-pulse"></div>
                        <div className="relative p-5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Waves className="w-3 h-3" /> Genre Surfing</p>
                                    <h2 className="text-xl font-black text-white tracking-tight"><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">'{filter.genre}'</span> 게임 모아보기</h2>
                                </div>
                            </div>
                            <button onClick={clearGenreFilter} className="flex items-center gap-1.5 bg-black/30 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all text-sm font-bold text-gray-300 hover:text-white"><X className="w-4 h-4" /> 필터 해제</button>
                        </div>
                    </div>
                )}

                {/* 다이내믹 인사이트 배너 */}
                {filter.isAllTimeLow ? (
                    /* 🔴 상태 1: 역대 최저가 파도타기 중 */
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-red-900/50 via-red-950 to-black border border-red-500/50 p-4 sm:p-5 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <div className="absolute top-0 left-0 w-48 h-full bg-red-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/40 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                <Flame className="w-6 h-6 text-red-500 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-red-400 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Waves className="w-3 h-3"/> WIDGET SURFING
                                </div>
                                <div className="text-white font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">역대 최저가</span>' 게임만 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, isAllTimeLow: false})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-black/50 hover:bg-white/10 border border-white/20 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-gray-300 hover:text-white">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>

                ) : (filter.minMetaScore === '85' && filter.minDiscountRate === '50') ? (
                    /* 🟣 상태 2: 명작 갓겜 파도타기 중 */
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/50 via-indigo-950 to-black border border-purple-500/50 p-4 sm:p-5 flex items-center justify-between shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                        <div className="absolute top-0 left-0 w-48 h-full bg-purple-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                                <Star className="w-6 h-6 text-purple-400 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-purple-300 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Waves className="w-3 h-3"/> WIDGET SURFING
                                </div>
                                <div className="text-white font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">인증된 명작 갓겜</span>' 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, minMetaScore: '', minDiscountRate: ''})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-black/50 hover:bg-white/10 border border-white/20 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-gray-300 hover:text-white">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>

                ) : (filter.minDiscountRate === '1' && filter.minMetaScore === '') ? (
                    /* 🟢 상태 3: 진행 중인 총 할인 파도타기 중 (새로 추가됨!) */
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-green-900/40 via-green-950 to-black border border-green-500/50 p-4 sm:p-5 flex items-center justify-between shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <div className="absolute top-0 left-0 w-48 h-full bg-green-500/20 blur-3xl transform -skew-x-12"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/40 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                <TrendingDown className="w-6 h-6 text-green-400 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-green-400 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider flex items-center gap-1">
                                    <Waves className="w-3 h-3"/> WIDGET SURFING
                                </div>
                                <div className="text-white font-black text-sm sm:text-base lg:text-lg">
                                    '<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">진행 중인 모든 할인</span>' 모아보는 중!
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { setFilter(prev => ({...prev, minDiscountRate: ''})); setPage(0); }} className="relative z-10 flex items-center gap-1.5 bg-black/50 hover:bg-white/10 border border-white/20 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold text-gray-300 hover:text-white">
                            <X className="w-4 h-4" /> <span className="hidden sm:inline">해제</span>
                        </button>
                    </div>

                ) : (
                    /* ⚪ 상태 4: 아무 필터도 없을 때 (기존 듀얼 액션 배너) */
                    <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-red-900/30 via-black to-black border border-red-500/20 flex flex-col sm:flex-row group transition-all hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                        {/* 좌측 메인 영역: 클릭 시 '역대 최저가 파도타기'*/}
                        <div
                            onClick={() => {
                                setFilter(prev => ({...prev, isAllTimeLow: true}));
                                setPage(0);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex-1 p-4 sm:p-5 cursor-pointer relative overflow-hidden flex items-center justify-between"
                        >
                            <div className="absolute top-0 left-0 w-48 h-full bg-red-500/10 blur-3xl transform -skew-x-12 group-hover:bg-red-500/20 transition-colors"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="hidden sm:flex w-12 h-12 rounded-full bg-red-500/10 items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                                    <Flame className="w-6 h-6 text-red-500 animate-pulse" />
                                </div>
                                <div>
                                    <div className="text-red-400 font-bold text-[10px] sm:text-xs mb-0.5 tracking-wider">TODAY'S HOT DEAL</div>
                                    <div className="text-white font-black text-sm sm:text-base lg:text-lg">
                                        지금 <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">수많은 게임</span>이 역대 최저가 갱신 중!
                                    </div>
                                </div>
                            </div>
                            <div className="text-red-400/80 font-bold text-xs sm:text-sm flex items-center gap-1 group-hover:text-red-400 transition-colors pr-2">
                                <span className="hidden sm:inline">모아보기</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>

                        {/* 우측 분리 영역: '인사이트 페이지'로 가는 전용 버튼 */}
                        <div
                            onClick={() => navigate('/insights')}
                            className="sm:w-48 border-t sm:border-t-0 sm:border-l border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer flex items-center justify-center p-3 sm:p-0 transition-colors group/insight"
                        >
                            <div className="flex items-center gap-2 text-gray-300 font-bold text-xs sm:text-sm group-hover/insight:text-white">
                                <Activity className="w-4 h-4 text-ps-blue" />
                                <span>통계 대시보드</span>
                                <ChevronRight className="w-4 h-4 opacity-50 group-hover/insight:translate-x-1 group-hover/insight:opacity-100 transition-all" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 메인 검색/필터 UI */}
                <div className="bg-ps-card p-6 rounded-xl border border-white/10 shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* 검색창 */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="keyword"
                                placeholder="게임 제목 검색..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        </div>

                        {/* 🚀 정렬 드롭다운 (Custom) */}
                        <div className="relative min-w-[180px]">
                            <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'sort' ? null : prev), 200)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm font-bold text-white flex items-center justify-between hover:border-ps-blue hover:bg-white/5 transition-all">
                                <span className="flex items-center gap-2">
                                    {sortOptions.find(opt => opt.value === filter.sort)?.icon && React.createElement(sortOptions.find(opt => opt.value === filter.sort).icon, { className: `w-4 h-4 ${sortOptions.find(opt => opt.value === filter.sort).color}` })}
                                    {sortOptions.find(opt => opt.value === filter.sort)?.label.split(' ')[1] || '정렬'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />
                            </button>
                            {activeDropdown === 'sort' && (
                                <div className="absolute top-full mt-2 right-0 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn origin-top">
                                    <div className="py-1">
                                        {sortOptions.map((option) => (
                                            <button key={option.value} onClick={() => handleCustomSelect('sort', option.value)} className={`w-full px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${filter.sort === option.value ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                                <option.icon className={`w-4 h-4 ${option.color}`} /> {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setShowFilter(!showFilter)} className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${showFilter ? 'bg-ps-blue border-ps-blue text-white' : 'border-white/20 text-gray-300 hover:bg-white/10'}`}>
                            <Filter className="w-4 h-4" /> 상세 필터
                        </button>
                        <button onClick={executeSearch} className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">검색</button>
                    </div>

                    {showFilter && (
                        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fadeIn">

                            {/* 할인율 드롭다운 */}
                            <div className="relative">
                                <label className="block text-xs text-gray-400 mb-2 font-bold flex items-center gap-1"><Percent className="w-3 h-3 text-red-400"/>최소 할인율</label>
                                <button onClick={() => setActiveDropdown(activeDropdown === 'discount' ? null : 'discount')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'discount' ? null : prev), 200)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white flex items-center justify-between hover:border-ps-blue hover:bg-white/5 transition-all text-left">
                                    <span className="truncate">{discountOptions.find(o => o.value === filter.minDiscountRate)?.label}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${activeDropdown === 'discount' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'discount' && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                                        <div className="py-1">
                                            {discountOptions.map((opt) => (
                                                <button key={opt.value} onClick={() => handleCustomSelect('minDiscountRate', opt.value)} className={`w-full px-4 py-3 text-sm text-left transition-colors ${filter.minDiscountRate === opt.value ? 'bg-ps-blue/20 text-white font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 🚀 가격대 필터 팝오버 (디자인 통일 완료) */}
                            <div className="relative">
                                <label className="block text-xs text-gray-400 mb-2 font-bold flex items-center gap-1">
                                    <CircleDollarSign className="w-3 h-3 text-green-400"/>가격 범위
                                </label>
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
                                    className={`w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between hover:border-ps-blue hover:bg-white/5 transition-all text-left ${
                                        isPriceFilterActive
                                            ? 'bg-ps-blue/20 text-white font-bold border-ps-blue/50'
                                            : 'text-white'
                                    }`}
                                >
                                    <span className="truncate">
                                        {isPriceFilterActive
                                            ? `${filter.minPrice ? Number(filter.minPrice).toLocaleString() + '원' : '0원'} ~ ${filter.maxPrice ? Number(filter.maxPrice).toLocaleString() + '원' : '최대'}`
                                            : '전체 범위'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${activeDropdown === 'price' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'price' && (
                                    <div className="absolute top-full mt-2 right-0 md:right-auto md:left-0 w-[300px] md:w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 p-5 animate-fadeIn origin-top-right md:origin-top-left"
                                         onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-2 mb-5">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="예: 10000"
                                                    value={priceRange.min}
                                                    onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-sm focus:border-ps-blue outline-none transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">원</span>
                                            </div>
                                            <span className="text-gray-500 font-bold">~</span>
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="예: 50000"
                                                    value={priceRange.max}
                                                    onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-sm focus:border-ps-blue outline-none transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">원</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={handlePriceReset} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-colors">초기화</button>
                                            <button onClick={handlePriceApply} className="flex-1 px-4 py-2 bg-ps-blue hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">적용</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* IGDB 드롭다운 */}
                            <div className="relative">
                                <label className="block text-xs text-gray-400 mb-2 font-bold flex items-center gap-1"><Star className="w-3 h-3 text-purple-400"/>IGDB스코어</label>
                                <button onClick={() => setActiveDropdown(activeDropdown === 'metaScore' ? null : 'metaScore')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'metaScore' ? null : prev), 200)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white flex items-center justify-between hover:border-ps-blue hover:bg-white/5 transition-all text-left">
                                    <span className="truncate">{metaScoreOptions.find(o => o.value === filter.minMetaScore)?.label}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${activeDropdown === 'metaScore' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'metaScore' && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                                        <div className="py-1">
                                            {metaScoreOptions.map((opt) => (
                                                <button key={opt.value} onClick={() => handleCustomSelect('minMetaScore', opt.value)} className={`w-full px-4 py-3 text-sm text-left transition-colors ${filter.minMetaScore === opt.value ? 'bg-ps-blue/20 text-white font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 플랫폼 드롭다운 */}
                            <div className="relative">
                                <label className="block text-xs text-gray-400 mb-2 font-bold flex items-center gap-1"><MonitorPlay className="w-3 h-3 text-blue-300"/>플랫폼</label>
                                <button onClick={() => setActiveDropdown(activeDropdown === 'platform' ? null : 'platform')} onBlur={() => setTimeout(() => setActiveDropdown(prev => prev === 'platform' ? null : prev), 200)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white flex items-center justify-between hover:border-ps-blue hover:bg-white/5 transition-all text-left">
                                    <span className="truncate">{platformOptions.find(o => o.value === filter.platform)?.label}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${activeDropdown === 'platform' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'platform' && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                                        <div className="py-1">
                                            {platformOptions.map((opt) => (
                                                <button key={opt.value} onClick={() => handleCustomSelect('platform', opt.value)} className={`w-full px-4 py-3 text-sm text-left transition-colors ${filter.platform === opt.value ? 'bg-ps-blue/20 text-white font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 체크박스 영역 */}
                            <div className="col-span-2 md:col-span-4 flex flex-row flex-wrap items-center gap-6 pt-2 h-full">
                                <label className="flex items-center gap-2 cursor-pointer group hover:bg-white/5 p-2 rounded-lg transition-colors border border-transparent">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" name="isPlusExclusive" checked={filter.isPlusExclusive} onChange={handleFilterChange} className="peer w-4 h-4 appearance-none rounded bg-gray-800 border border-gray-600 checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer" />
                                        <Check className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-400 group-hover:text-yellow-400 transition-colors"><span className="text-yellow-500 font-black">PLUS</span> 전용 할인</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group hover:bg-white/5 p-2 rounded-lg transition-colors border border-transparent">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" name="inCatalog" checked={filter.inCatalog} onChange={handleFilterChange} className="peer w-4 h-4 appearance-none rounded bg-gray-800 border border-gray-600 checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer" />
                                        <Check className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-400 group-hover:text-yellow-400 transition-colors flex items-center gap-1.5"><Gamepad2 className="w-4 h-4 text-yellow-500" /> 스페셜(무료) 포함</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {!loading && <p className="text-ps-muted text-sm mb-4 text-right">총 <span className="text-white font-bold">{totalElements.toLocaleString()}</span>개의 게임이 검색되었습니다.</p>}

                {/* 게임 리스트 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {loading && page === 0 && !isInitialLoad ? (
                        Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />)
                    ) : (
                        games.length > 0 ? games.map((game, index) => {
                            const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;
                            const isLastElement = games.length === index + 1; // 인피니트 스크롤 센서

                            const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                            const isClosing = !isLastCall && daysLeft <= 3; // 🚀 복구 완료: 마감임박 계산

                            return (
                                <div
                                    key={game.id}
                                    ref={isLastElement ? lastGameElementRef : null}
                                    onClick={() => navigate(`/games/${game.id}`, { state: { background: location } })}
                                    className={`group bg-ps-card rounded-xl overflow-hidden shadow-lg border hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative will-change-transform ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-transparent hover:border-ps-blue/50'}`}
                                >
                                    <div className="aspect-[3/4] overflow-hidden relative">
                                        <PSGameImage
                                            src={game.imageUrl}
                                            alt={game.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
                                        />

                                        {isPlatinum && <div className="absolute top-2 right-2 z-20"><Sparkles className="w-5 h-5 text-yellow-300 animate-pulse drop-shadow-md" /></div>}
                                        {isNew && <span className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">NEW</span>}

                                        {isLastCall && <span className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse z-10 flex items-center gap-1"><Timer className="w-3 h-3" /> 막차!</span>}

                                        {isClosing && <span className="absolute top-2 right-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">마감임박</span>}

                                        <button onClick={(e) => handleLike(e, game.id)} className={`absolute bottom-12 right-2 p-2 rounded-full transition-all transform hover:scale-110 z-20 shadow-lg backdrop-blur-sm ${game.liked ? 'bg-red-500/20 text-red-500' : 'bg-black/40 text-gray-300 hover:bg-red-500 hover:text-white'}`}>
                                            <Heart className={`w-5 h-5 ${game.liked ? 'fill-current' : ''}`} />
                                        </button>

                                        {game.discountRate > 0 && <span className="absolute bottom-2 right-2 bg-ps-blue text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">-{game.discountRate}%</span>}

                                        {game.inCatalog ? (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(250,204,21,0.6)] z-10 flex items-center gap-1 animate-pulse-slow">
                                                <Gamepad2 className="w-3 h-3 fill-black" /> EXTRA
                                            </span>
                                        ) : game.isPlusExclusive ? (
                                            <span className="absolute bottom-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded z-10 shadow-md">
                                                PLUS
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                                            {game.genres && game.genres.length > 0 ? game.genres.map((g, i) => <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${getGenreBadgeStyle(g)}`}>{g}</span>) : <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-gray-600/20 text-gray-400 border-gray-500/30">미분류</span>}
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-100 leading-[1.3] line-clamp-2 h-[2.6em] overflow-hidden mb-3 group-hover:text-ps-blue transition-colors">{game.name}</h3>
                                        <div className="flex flex-col gap-0.5">
                                            {game.discountRate > 0 && <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>}
                                            <div className="flex justify-between items-end mt-1">
                                                <span className="text-lg font-black text-white">{game.price?.toLocaleString()}원</span>
                                                {game.metaScore > 0 && <span className={`text-xs font-black px-2 py-0.5 rounded shadow-sm ${game.metaScore >= 80 ? 'bg-green-900 text-green-300 border border-green-500/30' : 'bg-yellow-900 text-yellow-300 border border-yellow-500/30'}`}>{game.metaScore}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            !loading && (
                                <div className="col-span-full text-center py-20 flex flex-col items-center gap-4">
                                    <Gamepad2 className="w-12 h-12 text-gray-600" />
                                    <p className="text-gray-400">검색 결과가 없습니다.</p>
                                </div>
                            )
                        )
                    )}
                </div>

                {!loading && games.length > 0 && page >= totalPages - 1 && (
                    <div className="py-16 text-center flex flex-col items-center gap-3 opacity-50 border-t border-white/5 mt-10">
                        <Gamepad2 className="w-8 h-8 text-gray-500" />
                        <p className="text-gray-400 font-bold text-sm">모든 게임을 다 보셨습니다 🎮</p>
                    </div>
                )}
                {loading && page > 0 && (
                    <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ps-blue"></div></div>
                )}

                {/* 스마트 플로팅 바 */}
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out will-change-transform ${isFloatingVisible ? 'translate-y-0' : 'translate-y-24'}`}>
                    <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 p-2 pl-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">

                        {/* 빠른 검색 & 위로 가기 */}
                        <button onClick={() => setIsQuickSearchOpen(true)} className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all border border-white/5 bg-white/5" title="빠른 검색"><Search className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" /></button>
                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all" title="맨 위로">
                            <Triangle className="w-5 h-5 text-green-400 fill-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)] group-hover:-translate-y-1 transition-transform" />
                        </button>

                        <div className="w-[1px] h-6 bg-white/20 mx-1"></div>

                        <button
                            onClick={() => setIsDonationOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all border border-yellow-500/40 bg-yellow-500/15 hover:bg-yellow-500/25 relative overflow-hidden"
                            title="감자 서버 밥 주기"
                        >
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>

                            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] group-hover:scale-110 group-hover:-rotate-12 transition-transform" />
                            <span className="text-xs sm:text-sm font-black text-yellow-500 whitespace-nowrap drop-shadow-md">감자 서버 밥 주기</span>
                        </button>

                    </div>
                </div>

                <div className={`fixed inset-x-0 bottom-0 z-[60] transform transition-transform duration-300 ease-in-out ${isQuickSearchOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="bg-[#1a1a1a] border-t border-white/10 p-6 md:p-8 rounded-t-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.8)] max-w-3xl mx-auto max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#1a1a1a] pb-4 z-10 border-b border-white/5">
                            <h3 className="text-xl font-black text-white flex items-center gap-2"><Search className="w-5 h-5 text-ps-blue"/> 퀵 서치 & 필터</h3>
                            <button onClick={() => setIsQuickSearchOpen(false)} className="p-2 bg-white/5 hover:bg-red-500/80 rounded-full transition-colors"><X className="w-5 h-5 text-gray-300"/></button>
                        </div>

                        <div className="flex flex-col gap-8 pb-24">
                            {/* 1. 검색어 입력 (검색어는 버튼 눌러야 적용) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">어떤 게임을 찾으시나요?</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="keyword"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-ps-blue outline-none transition-all" />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">원하시는 가격대가 있나요?</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="예: 10000"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-4 pr-10 text-white focus:border-ps-blue outline-none transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">원</span>
                                    </div>
                                    <span className="text-gray-500 font-bold">~</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="예: 50000"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-4 pr-10 text-white focus:border-ps-blue outline-none transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">원</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. 정렬 칩 (클릭 즉시 적용 후 닫힘) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-3">정렬 기준</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {sortOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleQuickSelect('sort', opt.value)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs md:text-sm transition-all ${filter.sort === opt.value ? 'bg-ps-blue/20 border-ps-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            <opt.icon className={`w-4 h-4 shrink-0 ${filter.sort === opt.value ? 'text-ps-blue' : opt.color}`} />
                                            <span className="truncate">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. 할인율 & IGDB 칩 (클릭 즉시 적용 후 닫힘) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-3">최소 할인율</label>
                                    <div className="flex flex-wrap gap-2">
                                        {discountOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleQuickSelect('minDiscountRate', opt.value)}
                                                className={`px-4 py-2 rounded-lg border font-bold text-xs transition-all ${filter.minDiscountRate === opt.value ? 'bg-red-500/20 border-red-500 text-white' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-3">IGDB 스코어</label>
                                    <div className="flex flex-wrap gap-2">
                                        {metaScoreOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleQuickSelect('minMetaScore', opt.value)}
                                                className={`px-4 py-2 rounded-lg border font-bold text-xs transition-all ${filter.minMetaScore === opt.value ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 4. 플랫폼 및 기타 필터 (클릭 즉시 적용 후 닫힘) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-3">추가 옵션</label>
                                <div className="flex flex-wrap gap-3">
                                    {platformOptions.slice(1).map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleQuickSelect('platform', filter.platform === opt.value ? '' : opt.value)} // 토글 방식
                                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${filter.platform === opt.value ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            <MonitorPlay className="w-4 h-4" /> {opt.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handleQuickSelect('isPlusExclusive', !filter.isPlusExclusive)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${filter.isPlusExclusive ? 'bg-yellow-500/20 border-yellow-500 text-white' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className="text-yellow-500 font-black">PLUS</span> 할인만
                                    </button>
                                    <button
                                        onClick={() => handleQuickSelect('inCatalog', !filter.inCatalog)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${filter.inCatalog ? 'bg-yellow-500/20 border-yellow-500 text-white' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <Gamepad2 className="w-4 h-4 text-yellow-500" /> 스페셜 카탈로그
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 검색어 입력 시 사용할 적용 버튼 */}
                        <div className="absolute bottom-0 left-0 w-full p-4 bg-[#1a1a1a] border-t border-white/5">
                            <button onClick={executeSearch} className="w-full bg-ps-blue hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2">
                                <Search className="w-5 h-5" /> 검색어 적용하기
                            </button>
                        </div>
                    </div>
                </div>
                {isQuickSearchOpen && <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn" onClick={() => setIsQuickSearchOpen(false)}></div>}

                <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
            </div>
        </div>
    );
};
export default GameListPage;