import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {AlertTriangle, Bell, BellOff, Gamepad2, Heart, HelpCircle, LogOut, Shield, X, UserCircle, Megaphone} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import GuideModal from './GuideModal';
import LegalModal from './LegalModal';
import NoticeModal from './NoticeModal';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const notiRef = useRef(null);
    const { isAuthenticated, openLoginModal } = useAuth();

    // 모달 상태
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);

    // 알림 및 공지 상태
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [hasNewNotice, setHasNewNotice] = useState(false); // 🚀 신규 공지 여부

    // 스마트 헤더 상태
    const [isNavVisible, setIsNavVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    const checkNewNotice = async () => {
        try {
            // 최신 공지 딱 1개만 가져와서 ID 확인
            const res = await client.get('/api/v1/notices', { params: { page: 0, size: 1 } });
            if (res.data.content && res.data.content.length > 0) {
                const latestId = res.data.content[0].id;
                const lastViewedId = localStorage.getItem('ps_last_notice_id');

                if (!lastViewedId || latestId > parseInt(lastViewedId)) {
                    setHasNewNotice(true);
                }
            }
        } catch (err) {
            console.error("공지사항 체크 실패", err);
        }
    };

    // 이제 아래의 useEffect가 정상적으로 이 함수를 인식합니다.
    useEffect(() => {
        checkNewNotice();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollYRef.current && currentScrollY > 50) {
                setIsNavVisible(false);
                setIsNotiOpen(false);
            } else {
                setIsNavVisible(true);
            }

            lastScrollYRef.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 3. 인증 상태 변경 및 위치 변경 시 처리
    useEffect(() => {
        setIsNotiOpen(false);
        if (isAuthenticated) fetchUnreadCount();

        const handleRealtimeMessage = () => { if (isAuthenticated) fetchUnreadCount(); };
        window.addEventListener('PS_NOTIFICATION_RECEIVED', handleRealtimeMessage);
        return () => window.removeEventListener('PS_NOTIFICATION_RECEIVED', handleRealtimeMessage);
    }, [location.pathname, isAuthenticated]);

    // 4. 알림창 바깥 클릭 시 닫기
    useEffect(() => {
        if (!isNotiOpen) return;
        function handleClickOutside(event) {
            if (notiRef.current && !notiRef.current.contains(event.target)) setIsNotiOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotiOpen]);

    // 5. 로직 함수들 (보존)
    const handleLogoClick = () => {
        navigate('/games');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await client.get('/api/notifications/unread-count');
            setUnreadCount(response.data);
        } catch (err) { console.error("알림 카운트 조회 실패", err); }
    };

    const toggleNotification = async () => {
        if (!isNotiOpen) {
            try {
                const response = await client.get('/api/notifications');
                setNotifications(response.data);
            } catch (err) {
                console.error("알림 목록 조회 실패", err);
                toast.error("알림을 불러오지 못했습니다.");
            }
        }
        setIsNotiOpen(!isNotiOpen);
    };

    const handleNotificationClick = async (notiId, gameId) => {
        try {
            await client.patch(`/api/notifications/${notiId}/read`);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n => n.id === notiId ? { ...n, isRead: true } : n));
            setIsNotiOpen(false);
            if (gameId) navigate(`/games/${gameId}`, { state: null });
        } catch (err) { console.error("알림 읽음 처리 실패", err); }
    };

    const handleLogout = () => {
        toast((t) => (
            <div className="flex flex-col gap-4 min-w-[280px] bg-[#1a1a1a] text-white p-1">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-gray-100">로그아웃 하시겠습니까?</span>
                        <span className="text-[11px] text-gray-500">안전하게 종료합니다.</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={async () => {
                        toast.dismiss(t.id);
                        try { await client.post('/api/v1/auth/logout'); }
                        finally { localStorage.clear(); window.location.href = '/'; }
                    }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20">네, 로그아웃</button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 rounded-xl text-xs font-bold transition-colors border border-white/10">취소</button>
                </div>
            </div>
        ), { duration: 5000, position: 'top-center', style: { background: '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '20px', padding: '16px' } });
    };

    return (
        <>
            <nav className={`fixed top-0 w-full z-50 bg-ps-black/80 backdrop-blur-md border-b border-white/10 h-16 transition-transform duration-300 ease-in-out ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={handleLogoClick}>
                        <div className="bg-ps-blue p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                            <Gamepad2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            PS <span className="text-ps-blue">Tracker</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setIsLegalOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><Shield className="w-5 h-5" /></button>
                        <button onClick={() => setIsGuideOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><HelpCircle className="w-5 h-5" /></button>

                        {/* 🚀 공지사항 버튼 (알림 점 통합) */}
                        <button onClick={() => { setIsNoticeOpen(true); setHasNewNotice(false); }} className="relative p-2 text-gray-300 hover:text-blue-400 transition-colors group">
                            <Megaphone className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                            {hasNewNotice && (
                                <>
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></span>
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-ps-black"></span>
                                </>
                            )}
                        </button>

                        {isAuthenticated ? (
                            <>
                                <div className="relative" ref={notiRef}>
                                    <button onClick={toggleNotification} className="relative text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                            </span>
                                        )}
                                    </button>
                                    {isNotiOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                                                <h3 className="text-sm font-bold text-white">알림 센터</h3>
                                                <button onClick={() => setIsNotiOpen(false)}><X className="w-4 h-4" /></button>
                                            </div>
                                            <ul className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <li className="py-12 text-center flex flex-col items-center gap-3 text-gray-500"><BellOff className="w-8 h-8 opacity-50" /><span className="text-xs font-bold">새로운 알림이 없습니다.</span></li>
                                                ) : (
                                                    notifications.map((noti) => (
                                                        <li key={noti.id} onClick={() => handleNotificationClick(noti.id, noti.gameId)} className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!noti.isRead ? 'bg-ps-blue/10' : ''}`}>
                                                            <div className="flex justify-between items-start mb-1"><span className={`text-sm font-bold ${!noti.isRead ? 'text-ps-blue' : 'text-gray-300'}`}>{noti.title}</span>{!noti.isRead && <span className="h-1.5 w-1.5 rounded-full bg-ps-blue mt-1.5"></span>}</div>
                                                            <p className="text-xs text-gray-400 line-clamp-2">{noti.message}</p>
                                                            <p className="text-[10px] text-gray-500 mt-2 text-right">{new Date(noti.createdAt).toLocaleDateString()}</p>
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"><LogOut className="w-4 h-4" /><span className="hidden md:inline">Logout</span></button>
                                <button onClick={() => navigate('/wishlist')} className="relative group bg-gradient-to-r from-pink-600/10 to-purple-600/10 hover:from-pink-600 hover:to-purple-600 border border-pink-500/30 hover:border-pink-400 text-pink-400 hover:text-white px-3 md:px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 shadow-[0_0_10px_rgba(236,72,153,0.1)] hover:shadow-[0_0_20px_rgba(236,72,153,0.6)]"><Heart className="w-4 h-4 md:w-5 md:h-5" /><span className="hidden md:inline font-bold text-sm">My Wishlist</span></button>
                            </>
                        ) : (
                            <button onClick={openLoginModal} className="relative group bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600 hover:to-indigo-600 border border-blue-500/30 hover:border-blue-400 text-blue-400 hover:text-white p-2 md:px-5 md:py-2 rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] ml-1 md:ml-2">
                                <UserCircle className="w-5 h-5 group-hover:animate-pulse" /><span className="hidden md:block text-sm font-bold tracking-wide">로그인 / 시작하기</span>
                            </button>
                        )}
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