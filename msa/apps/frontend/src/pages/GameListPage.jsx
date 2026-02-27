import React, {useEffect, useState} from 'react';
import {getGenreBadgeStyle} from "../utils/uiUtils.js";
import client from '../api/client';
import toast from 'react-hot-toast';
import SkeletonCard from '../components/SkeletonCard';
import {differenceInCalendarDays, parseISO} from 'date-fns';
import {useNavigate, useSearchParams, useLocation} from 'react-router-dom';
import {
    Banknote,
    ChevronDown,
    Clock,
    Filter,
    Gamepad2,
    Heart,
    Search,
    Sparkles,
    Timer,
    TrendingUp,
    Trophy,
    Waves,
    X,
    Check,
    Trash2,
    CalendarDays,
    Star
} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';

const GameListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const { openLoginModal } = useAuth();

    const [recentGames, setRecentGames] = useState([]);

    useEffect(() => {
        const updateRecent = () => {
            const data = JSON.parse(localStorage.getItem('recentGames') || '[]');
            setRecentGames(data);
        };

        updateRecent(); // 마운트 시 실행
        window.addEventListener('focus', updateRecent); // 브라우저 탭 복귀/뒤로가기 시 실행
        return () => window.removeEventListener('focus', updateRecent);
    }, []);

    // 최근 본 목록 전체 삭제
    const handleClearRecent = () => {
        localStorage.removeItem('recentGames');
        setRecentGames([]);
        toast.success('최근 본 목록이 비워졌습니다.');
    };

    // 최근 본 목록에서 개별 게임 삭제
    const removeRecentGame = (e, gameId) => {
        e.stopPropagation(); // 상세 페이지 이동 방지
        const updated = recentGames.filter(g => g.id !== gameId);
        localStorage.setItem('recentGames', JSON.stringify(updated));
        setRecentGames(updated);
    };

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    // 초기 상태를 URL(searchParams)에서 읽어와서 설정 (새로고침/공유 대비)
    const [page, setPage] = useState(() => {
        const pageParam = searchParams.get('page');
        return pageParam ? parseInt(pageParam) : 0;
    });

    const [filter, setFilter] = useState(() => ({
        keyword: searchParams.get('keyword') || '',
        genre: searchParams.get('genre') || '',
        minDiscountRate: searchParams.get('minDiscountRate') || '',
        minMetaScore: searchParams.get('minMetaScore') || '',
        platform: searchParams.get('platform') || '',
        isPlusExclusive: searchParams.get('isPlusExclusive') === 'true',
        inCatalog: searchParams.get('inCatalog') === 'true',
        sort: searchParams.get('sort') || 'lastUpdated,desc'
    }));

    useEffect(() => {
        if (!location.search) {
            setPage(0);
            setFilter({
                keyword: '',
                genre: '',
                minDiscountRate: '',
                minMetaScore: '',
                platform: '',
                isPlusExclusive: false,
                sort: 'lastUpdated,desc'
            });
            setShowFilter(false);
        }
    }, [location.search]);

    const [showFilter, setShowFilter] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isSortOpen, setIsSortOpen] = useState(false);

    useEffect(() => {
        // 로딩이 끝났는데(loading === false)
        // 데이터가 하나도 없고(games.length === 0)
        // 1페이지가 아니라면(page > 0) -> (API는 0부터 시작하므로 0이 1페이지임)
        if (!loading && games.length === 0 && page > 0) {
            console.log("⚠️ 현재 페이지에 데이터가 없어 앞 페이지로 이동합니다.");
            setPage(prev => Math.max(0, prev - 1));
        }
    }, [games, loading, page]);

    // filter나 page 상태가 바뀔 때마다 URL에 반영
    useEffect(() => {
        const params = {};

        // 값이 있는 것만 URL에 넣기 (깔끔한 URL 유지)
        if (page > 0) params.page = page;
        if (filter.keyword) params.keyword = filter.keyword;
        if (filter.genre) params.genre = filter.genre;
        if (filter.minDiscountRate) params.minDiscountRate = filter.minDiscountRate;
        if (filter.minMetaScore) params.minMetaScore = filter.minMetaScore;
        if (filter.platform) params.platform = filter.platform;
        if (filter.isPlusExclusive) params.isPlusExclusive = 'true';
        if (filter.inCatalog) params.inCatalog = 'true';
        if (filter.sort !== 'lastUpdated,desc') params.sort = filter.sort;

        setSearchParams(params, { replace: true });

    }, [filter, page, setSearchParams]);

    // 알림 권한 요청
    useEffect(() => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            toast((t) => (
                <div className="flex flex-col gap-3 min-w-[250px]">
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-gray-900">
                            🔥 찜한 게임 할인 알림 받기
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                            가격이 떨어지면 가장 먼저 알려드릴까요?
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="bg-ps-blue text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-600 transition flex-1 shadow-md"
                            onClick={() => {
                                toast.dismiss(t.id);
                                Notification.requestPermission().then((permission) => {
                                    if (permission === 'granted') {
                                        toast.success('알림이 설정되었습니다! 🎉');
                                    } else if (permission === 'denied') {
                                        toast.error('알림이 차단되었습니다 😭');
                                    }
                                });
                            }}
                        >
                            네, 받을래요! 🔔
                        </button>
                        <button
                            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-300 transition"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            나중에
                        </button>
                    </div>
                </div>
            ), {
                duration: 10000,
                position: 'top-center',
                style: {
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '16px',
                }
            });
        }
    }, []);

    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilter(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (name !== 'keyword') {
            setPage(0);
        }
    };

    const executeSearch = () => { setPage(0); fetchGames(0); };
    const handleKeyDown = (e) => { if (e.key === 'Enter') executeSearch(); };

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
        filter.inCatalog
    ]);

    const fetchGames = async (pageNumber) => {
        setLoading(true);
        try {
            const params = {
                page: pageNumber,
                size: 20,
                sort: filter.sort,
                keyword: filter.keyword,
                genre: filter.genre,
                ...(filter.minDiscountRate && { minDiscountRate: filter.minDiscountRate }),
                ...(filter.minMetaScore && { minMetaScore: filter.minMetaScore }),
                ...(filter.platform && { platform: filter.platform }),
                ...(filter.isPlusExclusive && { isPlusExclusive: true }),
                ...(filter.inCatalog && { inCatalog: true }),
            };
            const response = await client.get('/api/v1/games/search', { params });
            setGames(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (error) {
            console.error(error);
            toast.error("데이터 로딩 실패");
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (e, gameId) => {
        e.stopPropagation();
        const toastId = toast.loading('처리 중...');
        try {
            const response = await client.post(`/api/v1/wishlists/${gameId}`);
            const message = response.data;
            const isAdded = message.includes("추가");
            setGames(prevGames => prevGames.map(game =>
                game.id === gameId ? { ...game, liked: isAdded } : game
            ));
            toast.success(message, { id: toastId, icon: isAdded ? '❤️' : '💔' });
        } catch (error) {
            if (error.response && error.response.status === 401) {
                toast.dismiss(toastId); // 로딩 토스트 끄기
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-sm text-gray-900">
                            로그인이 필요한 기능입니다 🔒
                        </span>
                        <span className="text-xs text-gray-500 mb-1">
                            로그인하고 찜한 게임의 할인 알림을 받아보세요!
                        </span>
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    openLoginModal();
                                }}
                                className="bg-ps-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-md flex-1"
                            >
                                로그인 하러 가기
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex-1"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                ), {
                    duration: 5000,
                    position: 'top-center',
                    style: {
                        background: '#ffffff',
                        padding: '16px',
                        borderRadius: '16px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                    }
                });
            }
            else if (error.response && error.response.data) {
                toast.error(error.response.data, { id: toastId });
            }
            else {
                toast.error("요청 실패", { id: toastId });
            }
        }
    };

    const clearGenreFilter = () => {
        setFilter(prev => ({ ...prev, genre: '' }));
        setPage(0);
    };

    if (loading) return <div className="min-h-screen pt-20"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-ps-black text-white">
            <SEO
                title="게임 목록"
                description="플레이스테이션 게임 실시간 최저가 확인 및 할인 정보"
            />

            <div className="p-6 md:p-10 pb-20 max-w-7xl mx-auto">
                {/* 장르 파도타기 배너 */}
                {filter.genre && (
                    <div className="mb-6 relative overflow-hidden rounded-xl border border-blue-500/30 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-purple-900/60 to-blue-900/60 animate-pulse"></div>

                        <div className="relative p-5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex items-end gap-1 h-6">
                                    <div className="w-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite] h-3"></div>
                                    <div className="w-1.5 bg-purple-400 rounded-full animate-[bounce_1.2s_infinite] h-5 delay-75"></div>
                                    <div className="w-1.5 bg-blue-300 rounded-full animate-[bounce_0.8s_infinite] h-4 delay-150"></div>
                                    <div className="w-1.5 bg-indigo-400 rounded-full animate-[bounce_1.1s_infinite] h-6 delay-100"></div>
                                    <div className="w-1.5 bg-blue-500 rounded-full animate-[bounce_0.9s_infinite] h-2"></div>
                                </div>

                                <div>
                                    <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                        <Waves className="w-3 h-3" /> Genre Surfing
                                    </p>
                                    <h2 className="text-xl font-black text-white tracking-tight">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                                            '{filter.genre}'
                                        </span> 게임 모아보기
                                    </h2>
                                </div>
                            </div>

                            <button
                                onClick={clearGenreFilter}
                                className="flex items-center gap-1.5 bg-black/30 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all text-sm font-bold text-gray-300 hover:text-white group-hover:border-white/30"
                            >
                                <X className="w-4 h-4" /> 필터 해제
                            </button>
                        </div>
                    </div>
                )}

                {/* Recently Viewed 섹션 - PS5 대시보드 인터랙션 버전 */}
                {recentGames.length > 0 && !filter.keyword && !filter.genre && (
                    <div className="mb-8 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-ps-blue" />
                                <h3 className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Recently Viewed</h3>
                            </div>
                            <button
                                onClick={handleClearRecent}
                                className="group flex items-center gap-1.5 text-[9px] md:text-[10px] text-gray-400 hover:text-white font-bold uppercase transition-all bg-white/5 hover:bg-ps-blue/20 px-2.5 py-1.5 rounded-full border border-transparent hover:border-ps-blue/30"
                            >
                                <Trash2 className="w-3 h-3 group-hover:text-ps-blue transition-colors" />
                                <span>Clear All</span>
                            </button>
                        </div>

                        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth p-1">
                            {recentGames.slice(0, window.innerWidth < 768 ? 4 : 7).map((rg) => (
                                <div
                                    key={rg.id}
                                    className="flex-shrink-0 w-24 md:w-36 group cursor-pointer relative"
                                    onClick={() => navigate(`/games/${rg.id}`)}
                                >
                                    <div
                                        className="aspect-[3/4] rounded-lg overflow-hidden border border-white/5 group-hover:border-ps-blue/50 transition-all shadow-xl bg-ps-card relative"
                                    >
                                        <PSGameImage
                                            src={rg.imageUrl}
                                            alt={rg.title}
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent flex items-end p-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <p className="text-[9px] md:text-[11px] font-bold text-white line-clamp-1">
                                                {rg.title}
                                            </p>
                                        </div>

                                        <button
                                            onClick={(e) => removeRecentGame(e, rg.id)}
                                            className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/60 text-gray-300 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white hover:border-red-500/50 shadow-sm backdrop-blur-sm"
                                        >
                                            <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 검색/필터 UI */}
                <div className="bg-ps-card p-6 rounded-xl border border-white/10 shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input type="text" name="keyword" placeholder="게임 제목 검색..." value={filter.keyword} onChange={handleFilterChange} onKeyDown={handleKeyDown} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        </div>

                        {/* 커스텀 드롭다운 (Custom Dropdown) */}
                        <div className="relative min-w-[160px]">
                            <button
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                onBlur={() => setTimeout(() => setIsSortOpen(false), 200)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm font-bold text-white flex items-center justify-between hover:border-ps-blue hover:bg-white/5 transition-all focus:outline-none focus:border-ps-blue"
                            >
                                <span className="flex items-center gap-2">
                                    {filter.sort === 'lastUpdated,desc' && <><Clock className="w-4 h-4 text-blue-400" /> 최근 업데이트순</>}
                                    {filter.sort === 'releaseDate,desc' && <><CalendarDays className="w-4 h-4 text-purple-400" /> 최신 발매순</>}
                                    {filter.sort === 'saleEndDate,asc' && <><Timer className="w-4 h-4 text-orange-400" /> 마감 임박순</>}
                                    {filter.sort === 'price,asc' && <><Banknote className="w-4 h-4 text-green-400" /> 낮은 가격순</>}
                                    {filter.sort === 'discountRate,desc' && <><TrendingUp className="w-4 h-4 text-red-400" /> 높은 할인율순</>}
                                    {filter.sort === 'metaScore,desc' && <><Star className="w-4 h-4 text-purple-400" /> 높은 평점순</>}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSortOpen && (
                                <div className="absolute top-full mt-2 right-0 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn origin-top">
                                    <div className="py-1">
                                        {[
                                            { value: 'lastUpdated,desc', label: '최근 업데이트순', icon: Clock, color: 'text-blue-400' },
                                            { value: 'releaseDate,desc', label: '최신 발매순', icon: CalendarDays, color: 'text-purple-400' },
                                            { value: 'saleEndDate,asc', label: '마감 임박순', icon: Timer, color: 'text-orange-400' },
                                            { value: 'price,asc', label: '낮은 가격순', icon: Banknote, color: 'text-green-400' },
                                            { value: 'discountRate,desc', label: '높은 할인율순', icon: TrendingUp, color: 'text-red-400' },
                                            { value: 'metaScore,desc', label: '높은 평점순', icon: Star, color: 'text-purple-400' }
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setFilter(prev => ({ ...prev, sort: option.value }));
                                                    setIsSortOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${
                                                    filter.sort === option.value
                                                        ? 'bg-white/10 text-white'
                                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                <option.icon className={`w-4 h-4 ${option.color}`} />
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setShowFilter(!showFilter)} className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${showFilter ? 'bg-ps-blue border-ps-blue text-white' : 'border-white/20 text-gray-300 hover:bg-white/10'}`}>
                            <Filter className="w-4 h-4" /> 필터
                        </button>
                        <button onClick={executeSearch} className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">검색</button>
                    </div>
                    {/* 상세 필터 */}
                    {showFilter && (
                        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-bold">최소 할인율</label>
                                <select name="minDiscountRate" value={filter.minDiscountRate} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none">
                                    <option value="">전체</option>
                                    <option value="30">30% 이상</option>
                                    <option value="50">50% 이상</option>
                                    <option value="70">70% 이상</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-bold">IGDB스코어</label>
                                <select name="minMetaScore" value={filter.minMetaScore} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none">
                                    <option value="">전체</option>
                                    <option value="75">75점 이상 (Good)</option>
                                    <option value="80">80점 이상 (Great)</option>
                                    <option value="90">90점 이상 (Must Play)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-bold">플랫폼</label>
                                <select name="platform" value={filter.platform} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-ps-blue outline-none">
                                    <option value="">전체</option>
                                    <option value="PS5">PS5</option>
                                    <option value="PS4">PS4</option>
                                </select>
                            </div>
                            <div className="flex flex-col justify-end gap-2 pb-0.5 h-full">
                                <label className="flex items-center gap-2 cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-all -ml-1 border border-transparent hover:border-white/5">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            name="isPlusExclusive"
                                            checked={filter.isPlusExclusive}
                                            onChange={handleFilterChange}
                                            className="peer w-4 h-4 appearance-none rounded bg-gray-800 border border-gray-600 checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer"
                                        />
                                        <Check className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-yellow-400 transition-colors">
                                        <span className="text-yellow-500 font-black">PLUS</span> 회원 전용 할인
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-all -ml-1 border border-transparent hover:border-white/5">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            name="inCatalog"
                                            checked={filter.inCatalog}
                                            onChange={handleFilterChange}
                                            className="peer w-4 h-4 appearance-none rounded bg-gray-800 border border-gray-600 checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer"
                                        />
                                        <Check className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                                        <Gamepad2 className="w-3.5 h-3.5 text-yellow-500" /> 스페셜(무료) 포함
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {!loading && <p className="text-ps-muted text-sm mb-4 text-right">총 <span className="text-white font-bold">{totalElements.toLocaleString()}</span>개의 게임이 검색되었습니다.</p>}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                    {loading ? Array.from({ length: 10 }).map((_, idx) => <SkeletonCard key={idx} />) : (
                        games.length > 0 ? games.map((game) => {
                            const isNew = game.createdAt && differenceInCalendarDays(new Date(), parseISO(game.createdAt)) <= 3;
                            const daysLeft = game.saleEndDate ? differenceInCalendarDays(parseISO(game.saleEndDate), new Date()) : 99;
                            const isLastCall = daysLeft >= 0 && daysLeft <= 1;
                            const isClosing = !isLastCall && daysLeft <= 3;

                            const isPlatinum = game.metaScore >= 85 && game.discountRate >= 50;

                            return (
                                <div
                                    key={game.id}
                                    onClick={() => navigate(`/games/${game.id}`)}
                                    className={`group bg-ps-card rounded-xl overflow-hidden shadow-lg border hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative
                                        ${isPlatinum ? 'border-yellow-400/50 shadow-yellow-500/20' : 'border-transparent hover:border-ps-blue/50'}
                                    `}
                                >
                                    <div className="aspect-[3/4] overflow-hidden relative">
                                        <PSGameImage
                                            src={game.imageUrl}
                                            alt={game.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

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
                                            {game.genres && game.genres.length > 0 ? (
                                                game.genres.map((genreName, index) => (
                                                    <span
                                                        key={index}
                                                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${getGenreBadgeStyle(genreName)}`}
                                                    >
                                                        {genreName}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors bg-gray-600/20 text-gray-400 border-gray-500/30">
                                                    미분류
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-100 leading-[1.3] line-clamp-2 h-[2.6em] overflow-hidden mb-3 group-hover:text-ps-blue transition-colors">
                                            {game.name}
                                        </h3>
                                        <div className="flex flex-col gap-0.5">
                                            {game.discountRate > 0 && <span className="text-xs text-gray-500 line-through">{game.originalPrice?.toLocaleString()}원</span>}
                                            <div className="flex justify-between items-end mt-1">
                                                <span className="text-lg font-black text-white">{game.price?.toLocaleString()}원</span>
                                                {game.metaScore > 0 && (
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded shadow-sm ${
                                                        game.metaScore >= 80
                                                            ? 'bg-green-900 text-green-300 border border-green-500/30'
                                                            : 'bg-yellow-900 text-yellow-300 border border-yellow-500/30'
                                                    }`}>
                                                        {game.metaScore}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            /* 검색 결과 없음 UI */
                            <div className="col-span-full text-center py-20 bg-ps-card/50 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-4">
                                <div className="bg-gray-800/50 p-6 rounded-full animate-pulse">
                                    <Gamepad2 className="w-12 h-12 text-gray-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-2">검색 결과가 없습니다</h3>
                                    <p className="text-gray-400">
                                        {filter.genre ? <><span className="text-ps-blue font-bold">'{filter.genre}'</span> 장르에는 해당하는 게임이 없네요.</> : "검색어를 변경하거나 필터를 조정해보세요."}
                                    </p>
                                </div>
                            </div>
                        )
                    )}
                </div>
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <button onClick={() => setPage(0)} disabled={page === 0} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed transition">&lt;&lt; First</button>
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed transition">Prev</button>
                        <span className="text-ps-muted text-sm px-4">Page <span className="text-white font-bold">{page + 1}</span> of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-4 py-2 rounded-lg bg-ps-card text-white text-sm font-bold hover:bg-ps-hover disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
                        <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="px-3 py-2 rounded-lg bg-ps-card text-white text-xs font-bold hover:bg-ps-hover disabled:opacity-30 disabled:cursor-not-allowed transition">Last &gt;&gt;</button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default GameListPage;