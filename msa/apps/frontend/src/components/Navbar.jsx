import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';

import {
    AlertTriangle, Bell, BellOff, Gamepad2, Heart, HelpCircle, LogOut, Shield, X, UserCircle, Megaphone, Menu,
    Sparkles, Activity, Sun, Moon
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import GuideModal from './GuideModal';
import LegalModal from './LegalModal';
import NoticeModal from './NoticeModal';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const notiRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const { isAuthenticated, openLoginModal } = useAuth();

    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [hasNewNotice, setHasNewNotice] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('ps-theme') === 'ps5');

    useEffect(() => {
        if (isLightMode) {
            document.documentElement.setAttribute('data-theme', 'ps5');
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ps-theme', 'ps5');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.classList.add('dark');
            localStorage.setItem('ps-theme', 'ps4');
        }
    }, [isLightMode]);

    const checkNewNotice = async () => {
        try {
            const res = await client.get('/api/v1/notices', { params: { page: 0, size: 1 } });
            if (res.data.content && res.data.content.length > 0) {
                const latestId = res.data.content[0].id;
                const lastViewedId = localStorage.getItem('ps_last_notice_id');
                if (!lastViewedId || latestId > parseInt(lastViewedId)) setHasNewNotice(true);
            }
        } catch (err) { console.error("공지사항 체크 실패", err); }
    };

    useEffect(() => { checkNewNotice(); }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollYRef.current && currentScrollY > 50) {
                setIsNavVisible(false); setIsNotiOpen(false); setIsMobileMenuOpen(false);
            } else { setIsNavVisible(true); }
            lastScrollYRef.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsNotiOpen(false);
        if (isAuthenticated) fetchUnreadCount();

        const handleRealtimeMessage = (event) => {
            const payload = event.detail || {};
            const title = payload.notification?.title || payload.title || payload.data?.title || '새로운 알림';
            const body = payload.notification?.body || payload.body || payload.data?.body || '';
            const pushGameId = payload.data?.gameId || payload.gameId;

            const toastStyle = "w-[340px] sm:w-[380px] max-w-[90vw] mx-auto bg-base shadow-2xl rounded-2xl pointer-events-auto flex flex-col gap-2 p-4 transition-all hover:bg-surface cursor-pointer border";

            if (title.includes('[공지]')) {
                setHasNewNotice(true);
                toast.custom((t) => (
                    <div className={`${toastStyle} border-blue-600 dark:border-blue-500/50 ${t.visible ? 'animate-fadeIn' : 'animate-fadeOut'}`}
                         onClick={() => { toast.dismiss(t.id); setIsNoticeOpen(true); setHasNewNotice(false); }}>
                        <span className="font-black text-sm sm:text-base text-blue-600 dark:text-blue-500 flex items-center gap-2">
                            <Megaphone className="w-5 h-5"/> {title}
                        </span>
                        <span className="text-xs sm:text-sm text-secondary line-clamp-2 leading-relaxed pl-7">{body}</span>
                    </div>
                ), { duration: 5000, position: 'top-center' });
            } else {
                if (isAuthenticated) fetchUnreadCount();
                toast.custom((t) => (
                    <div className={`${toastStyle} border-green-600 dark:border-green-500/50 ${t.visible ? 'animate-fadeIn' : 'animate-fadeOut'}`}
                         onClick={() => {
                             toast.dismiss(t.id);
                             if (pushGameId) {
                                 const currentBackground = location.state?.background || location;
                                 navigate(`/games/${pushGameId}`, { state: { background: currentBackground } });
                             } else {
                                 toggleNotification();
                             }
                         }}>
                        <span className="font-black text-sm sm:text-base text-green-600 dark:text-green-500 flex items-center gap-2">
                            <Bell className="w-5 h-5"/> {title}
                        </span>
                        <span className="text-xs sm:text-sm text-secondary line-clamp-2 leading-relaxed pl-7">{body}</span>
                    </div>
                ), { duration: 5000, position: 'top-center' });
            }
        };

        window.addEventListener('PS_NOTIFICATION_RECEIVED', handleRealtimeMessage);
        return () => window.removeEventListener('PS_NOTIFICATION_RECEIVED', handleRealtimeMessage);
    }, [location.pathname, location.state, isAuthenticated]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (notiRef.current && !notiRef.current.contains(event.target)) setIsNotiOpen(false);
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) setIsMobileMenuOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogoClick = () => { navigate('/games'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const fetchUnreadCount = async () => { try { const res = await client.get('/api/notifications/unread-count'); setUnreadCount(res.data); } catch (err) { console.error("알림 카운트 조회 실패", err); } };

    const toggleNotification = async () => {
        if (!isNotiOpen) {
            try { const res = await client.get('/api/notifications'); setNotifications(res.data); }
            catch (err) { toast.error("알림을 불러오지 못했습니다."); }
        }
        setIsNotiOpen(!isNotiOpen);
    };

    const handleNotificationClick = async (notiId, gameId) => {
        try {
            await client.patch(`/api/notifications/${notiId}/read`);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n => n.id === notiId ? { ...n, isRead: true } : n));
            setIsNotiOpen(false);

            if (gameId) {
                const currentBackground = location.state?.background || location;
                navigate(`/games/${gameId}`, { state: { background: currentBackground } });
            }
        } catch (err) {
            console.error("알림 읽음 처리 실패", err);
            toast.error("알림 이동 처리 중 문제가 발생했습니다.");
        }
    };

    const handleLogout = () => {
        toast((t) => (
            <div className="flex flex-col gap-4 min-w-[280px] bg-base border border-divider text-primary p-4 shadow-2xl rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                    <div className="flex flex-col"><span className="font-bold text-sm text-primary">로그아웃 하시겠습니까?</span><span className="text-[11px] text-secondary">안전하게 종료합니다.</span></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={async () => { toast.dismiss(t.id); try { await client.post('/api/v1/auth/logout'); } finally { localStorage.clear(); window.location.href = '/'; } }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg">네, 로그아웃</button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-base hover:bg-surface-hover text-secondary hover:text-primary py-2.5 rounded-xl text-xs font-bold transition-colors border border-divider">취소</button>
                </div>
            </div>
        ), { duration: 5000, position: 'top-center' });
    };

    return (
        <>
            <nav className={`fixed top-0 w-full z-50 bg-glass backdrop-blur-md border-b border-divider h-16 transition-transform duration-300 ease-in-out ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-full flex items-center justify-between">

                <div className="flex items-center gap-2 md:gap-8 shrink-0">
                    {/* 로고 */}
                    <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group" onClick={handleLogoClick}>
                        <div className="bg-ps-blue p-1.5 rounded-lg transition-transform duration-300 md:group-hover:rotate-12 active:scale-95 active:rotate-12 shadow-[0_0_10px_rgba(0,112,209,0.5)]">
                            <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <span className="text-[15px] sm:text-lg md:text-xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                PS <span className="text-ps-blue">Tracker</span>
                            </span>
                    </div>

                    {/* 데스크톱 메뉴 */}
                    <div className="hidden md:flex items-center gap-2">
                        <button onClick={() => { navigate('/games'); window.scrollTo(0,0); }} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1.5 ${location.pathname.includes('/games') ? 'text-primary bg-surface-hover border border-divider shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface-hover'}`}>
                            <Gamepad2 className="w-4 h-4" /> 게임 목록
                        </button>
                        <button onClick={() => { navigate('/discover'); window.scrollTo(0,0); }} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1.5 ${location.pathname.includes('/discover') ? 'text-blue-700 dark:text-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-secondary hover:text-primary hover:bg-surface-hover'}`}>
                            <Sparkles className="w-4 h-4" /> 신작 수집소
                        </button>
                        <button onClick={() => { navigate('/insights'); window.scrollTo(0,0); }} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1.5 ${location.pathname.includes('/insights') ? 'text-purple-700 dark:text-purple-500 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-secondary hover:text-primary hover:bg-surface-hover'}`}>
                            <Activity className="w-4 h-4" /> 통계 인사이트
                        </button>
                    </div>
                </div>

                {/* 우측 유틸리티 영역 */}
                <div className="flex items-center gap-0.5 sm:gap-3 shrink-0">

                    <button onClick={() => setIsLightMode(!isLightMode)} className="text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-hover" title="테마 변경">
                        {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>

                    <button onClick={() => setIsLegalOpen(true)} className="hidden sm:block text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-hover"><Shield className="w-5 h-5" /></button>
                    <button onClick={() => setIsGuideOpen(true)} className="hidden sm:block text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-hover"><HelpCircle className="w-5 h-5" /></button>

                    <button onClick={() => { setIsNoticeOpen(true); setHasNewNotice(false); }} className="relative p-2 text-secondary transition-colors group md:hover:text-blue-600 active:text-blue-600 dark:md:hover:text-blue-500 dark:active:text-blue-500 hover:bg-surface-hover rounded-full">
                        <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 transition-transform md:group-hover:scale-110 active:scale-95" />
                        {hasNewNotice && (
                            <>
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full animate-ping"></span>
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full border-2 border-base"></span>
                            </>
                        )}
                    </button>

                    {isAuthenticated ? (
                        <>
                        <div className="relative" ref={notiRef}>
                            <button onClick={toggleNotification} className="relative text-secondary transition-colors p-1.5 sm:p-2 rounded-full md:hover:text-primary md:hover:bg-surface-hover active:bg-surface-hover">
                                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                            </span>
                                )}
                            </button>
                            {isNotiOpen && (
                                <div className="fixed sm:absolute top-[72px] sm:top-full right-4 sm:right-0 left-4 sm:left-auto sm:mt-2 sm:w-80 md:w-96 bg-base border border-divider rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100] origin-top-right">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-divider bg-surface/50">
                                        <h3 className="text-sm font-bold text-primary">알림 센터</h3>
                                        <button onClick={() => setIsNotiOpen(false)} className="p-1 hover:bg-surface-hover rounded-full transition-colors">
                                            <X className="w-5 h-5 text-secondary" />
                                        </button>
                                    </div>

                                    <ul className="max-h-[60vh] sm:max-h-[350px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <li className="py-12 text-center flex flex-col items-center gap-3 text-muted">
                                                <BellOff className="w-8 h-8 opacity-50" />
                                                <span className="text-xs font-bold">새로운 알림이 없습니다.</span>
                                            </li>
                                        ) : (
                                            notifications.map((noti) => (
                                                <li key={noti.id} onClick={() => handleNotificationClick(noti.id, noti.gameId)} className={`px-4 py-3 border-b border-divider cursor-pointer hover:bg-surface-hover/80 active:bg-surface/80 transition-colors ${!noti.isRead ? 'bg-blue-500/10' : ''}`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-sm font-bold ${!noti.isRead ? 'text-blue-600 dark:text-blue-500' : 'text-primary'}`}>{noti.title}</span>
                                                        {!noti.isRead && <span className="h-1.5 w-1.5 rounded-full bg-ps-blue mt-1.5 shrink-0"></span>}
                                                    </div>
                                                    <p className="text-xs text-secondary line-clamp-2">{noti.message}</p>
                                                    <p className="text-[10px] text-muted mt-2 text-right">{new Date(noti.createdAt).toLocaleDateString()}</p>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <button onClick={() => { navigate('/profile'); window.scrollTo(0,0); }} className={`hidden md:flex items-center gap-2 text-sm font-bold p-2 rounded-lg transition-colors active:scale-95 ${location.pathname.includes('/profile') ? 'text-primary bg-surface-hover border border-divider shadow-sm' : 'text-secondary md:hover:text-primary md:hover:bg-surface-hover'}`}>
                            <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>

                        <button onClick={handleLogout} className="hidden md:flex items-center gap-2 text-sm font-bold text-secondary p-2 rounded-lg transition-colors md:hover:text-red-500 md:hover:bg-surface-hover active:text-red-500">
                            <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>

                        <button onClick={() => navigate('/wishlist')} className="relative group bg-[var(--bento-pink-from)] border border-[color:var(--bento-pink-border)] hover:border-[color:var(--bento-pink-border-hover)] hover:[box-shadow:var(--bento-pink-shadow)] text-pink-600 dark:text-pink-500 p-1.5 sm:px-4 sm:py-2 md:px-5 rounded-full transition-all duration-300 flex items-center justify-center active:scale-95 ml-0.5 sm:ml-1">
                            <Heart className="w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:fill-pink-500 transition-colors" />
                            <span className="hidden sm:inline font-bold sm:text-sm ml-2">Wishlist</span>
                        </button>
                        </>
                    ) : (
                        <button onClick={openLoginModal} className="relative group bg-[var(--bento-blue-from)] border border-[color:var(--bento-blue-border)] hover:border-[color:var(--bento-blue-border-hover)] hover:[box-shadow:var(--bento-blue-shadow)] text-ps-blue p-2 sm:px-4 sm:py-2 md:px-5 rounded-full transition-all duration-300 flex items-center justify-center gap-0 sm:gap-2 active:scale-95 ml-1 md:ml-2">
                            <UserCircle className="w-5 h-5 transition-transform md:group-hover:scale-110" />
                            <span className="hidden sm:inline font-bold sm:text-sm tracking-wide">로그인</span>
                        </button>
                    )}

                    <div className="relative md:hidden flex items-center ml-0.5 sm:ml-1" ref={mobileMenuRef}>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 rounded-xl transition-colors ${isMobileMenuOpen ? 'bg-surface-hover text-primary' : 'text-secondary hover:bg-surface-hover'}`}>
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>

                        {isMobileMenuOpen && (
                            <div className="absolute top-full right-0 mt-3 w-52 bg-base border border-divider rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 origin-top-right">
                                {/* 모바일 핵심 서비스 영역 */}
                                <div className="p-2 border-b border-divider bg-surface">
                                    <button onClick={() => { navigate('/games'); setIsMobileMenuOpen(false); window.scrollTo(0,0); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname.includes('/games') ? 'bg-surface-hover border border-divider text-primary' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                        <div className="bg-[var(--bento-blue-from)] p-1.5 rounded-lg border border-[color:var(--bento-blue-border)] shadow-sm"><Gamepad2 className="w-4 h-4 text-ps-blue" /></div> 게임 목록
                                    </button>

                                    <button onClick={() => { navigate('/discover'); setIsMobileMenuOpen(false); window.scrollTo(0,0); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold mt-1 transition-all ${location.pathname.includes('/discover') ? 'bg-surface-hover border border-divider text-primary' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                        <div className="bg-[var(--bento-purple-from)] p-1.5 rounded-lg border border-[color:var(--bento-purple-border)] shadow-sm"><Sparkles className="w-4 h-4 text-purple-500" /></div> 신작 수집소
                                    </button>

                                    <button onClick={() => { navigate('/insights'); setIsMobileMenuOpen(false); window.scrollTo(0,0); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold mt-1 transition-all ${location.pathname.includes('/insights') ? 'bg-surface-hover border border-divider text-primary' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}>
                                        <div className="bg-[var(--bento-amber-from)] p-1.5 rounded-lg border border-[color:var(--bento-amber-border)] shadow-sm"><Activity className="w-4 h-4 text-amber-500" /></div> 통계 인사이트
                                    </button>
                                </div>

                                {/* 모바일 유틸리티 영역 */}
                                <div className="p-2 bg-surface">
                                    {isAuthenticated && (
                                        <button onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); window.scrollTo(0,0); }} className={`w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl text-sm font-bold transition-all ${location.pathname.includes('/profile') ? 'bg-surface-hover text-primary' : 'text-secondary hover:text-primary hover:bg-surface-hover active:bg-surface'}`}>
                                            <UserCircle className="w-4 h-4 opacity-70" /> 마이페이지
                                        </button>
                                    )}

                                    <button onClick={() => { setIsGuideOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface-hover active:bg-surface transition-colors">
                                        <HelpCircle className="w-4 h-4 opacity-70" /> 초보자 가이드
                                    </button>
                                    <button onClick={() => { setIsLegalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface-hover active:bg-surface transition-colors">
                                        <Shield className="w-4 h-4 opacity-70" /> 법적 고지
                                    </button>

                                    {isAuthenticated && (
                                        <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-bold text-red-600 dark:text-red-500 border border-transparent hover:bg-[var(--bento-red-from)] hover:border-[color:var(--bento-red-border)] transition-colors">
                                    <LogOut className="w-4 h-4 opacity-80" /> 안전하게 로그아웃
                                </button>
                                )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </nav>

            <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
            <NoticeModal isOpen={isNoticeOpen} onClose={() => setIsNoticeOpen(false)} />
        </>
    );
};

export default Navbar;
