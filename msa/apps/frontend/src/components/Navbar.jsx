import React, {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertTriangle, Bell, Gamepad2, Heart, HelpCircle, LogOut, Shield, X} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import GuideModal from './GuideModal';
import LegalModal from './LegalModal';

const Navbar = () => {
    const navigate = useNavigate();
    const notiRef = useRef(null); // 드롭다운 외부 클릭 감지용

    // 모달 상태
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isLegalOpen, setIsLegalOpen] = useState(false);

    // 알림 관련 상태
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);

    const [totalWishlistCount, setTotalWishlistCount] = useState(0);

    // 1. 초기 로딩 시 안 읽은 알림 개수 가져오기
    useEffect(() => {
        fetchUnreadCount();
        fetchWishlistCount();

        // 외부 클릭 시 알림창 닫기 로직
        function handleClickOutside(event) {
            if (notiRef.current && !notiRef.current.contains(event.target)) {
                setIsNotiOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ✅ API: 안 읽은 개수 조회 (client 사용)
    const fetchUnreadCount = async () => {
        try {
            // 토큰 확인은 client.js 인터셉터가 하겠지만,
            // 로그인이 안 된 상태에서 불필요한 호출을 막기 위해 체크
            if (!localStorage.getItem('accessToken')) return;

            // client.get이 알아서 Base URL 붙이고, 헤더에 토큰 넣어서 보냄
            const response = await client.get('/api/notifications/unread-count');
            setUnreadCount(response.data);
        } catch (err) {
            // 401(비로그인) 에러 등은 조용히 무시하거나 필요 시 처리
            console.error("알림 카운트 조회 실패", err);
        }
    };

    // ✅ API: 찜 개수 조회
    const fetchWishlistCount = async () => {
        try {
            // 토큰이 없으면(비로그인) 호출 안 함
            if (!localStorage.getItem('accessToken')) return;

            // 찜 목록 가져오기
            const response = await client.get('/api/v1/wishlists');

            // 데이터가 배열(리스트)이면 그 개수를 셈
            if (Array.isArray(response.data)) {
                setTotalWishlistCount(response.data.length);
            }
        } catch (err) {
            console.error("찜 개수 조회 실패(무시해도 됨):", err);
        }
    };

    // ✅ API: 알림 목록 조회 (종 눌렀을 때)
    const toggleNotification = async () => {
        if (!isNotiOpen) {
            // 팝업 열 때 최신 목록 가져오기
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

    // ✅ API: 알림 읽음 처리 및 이동
    const handleNotificationClick = async (notiId, gameId) => {
        try {
            // 1. 읽음 처리 요청 (PATCH)
            await client.patch(`/api/notifications/${notiId}/read`);

            // 2. 로컬 상태 업데이트 (뱃지 감소, 읽음 표시 변경)
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n =>
                n.id === notiId ? { ...n, isRead: true } : n
            ));

            // 3. 팝업 닫고 페이지 이동
            setIsNotiOpen(false);
            if (gameId) {
                navigate(`/games/${gameId}`);
            }
        } catch (err) {
            console.error("알림 읽음 처리 실패", err);
            toast.error("알림 확인 중 오류가 발생했습니다.");
        }
    };

    // 로그아웃 핸들러
    const handleLogout = () => {
        toast((t) => (
            <div className="flex flex-col gap-2 min-w-[250px]">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>로그아웃 하시겠습니까?</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">로그인 화면으로 이동합니다.</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            window.location.href = '/';
                        }}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition"
                    >
                        네, 로그아웃
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition"
                    >
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 5000, position: 'top-center' });
    };

    return (
        <>
            <nav className="sticky top-0 z-50 bg-ps-black/80 backdrop-blur-md border-b border-white/10 h-16">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    {/* 1. 로고 영역 */}
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/games')}>
                        <div className="bg-ps-blue p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                            <Gamepad2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            PS <span className="text-ps-blue">Tracker</span>
                        </span>
                    </div>

                    {/* 2. 우측 메뉴 영역 */}
                    <div className="flex items-center gap-2 md:gap-4">

                        {/* A. 이용약관 */}
                        <button onClick={() => setIsLegalOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                            <Shield className="w-5 h-5" />
                        </button>

                        {/* B. 가이드 */}
                        <button onClick={() => setIsGuideOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                            <HelpCircle className="w-5 h-5" />
                        </button>

                        {/* C. 알림 센터 */}
                        <div className="relative" ref={notiRef}>
                            <button
                                onClick={toggleNotification}
                                className="relative text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            >
                                <Bell className="w-5 h-5" />
                                {/* 뱃지 (안 읽은 게 있을 때만) */}
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                )}
                            </button>

                            {/* 알림 드롭다운 팝업 */}
                            {isNotiOpen && (
                                <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                                        <h3 className="text-sm font-bold text-white">알림 센터</h3>
                                        <button onClick={() => setIsNotiOpen(false)} className="text-gray-400 hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <ul className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <li className="py-8 text-center text-gray-500 text-sm">
                                                새로운 알림이 없습니다. 📭
                                            </li>
                                        ) : (
                                            notifications.map((noti) => (
                                                <li
                                                    key={noti.id}
                                                    onClick={() => handleNotificationClick(noti.id, noti.gameId)}
                                                    className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!noti.isRead ? 'bg-ps-blue/10' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-sm font-bold ${!noti.isRead ? 'text-ps-blue' : 'text-gray-300'}`}>
                                                            {noti.title}
                                                        </span>
                                                        {!noti.isRead && <span className="h-1.5 w-1.5 rounded-full bg-ps-blue mt-1.5"></span>}
                                                    </div>
                                                    <p className="text-xs text-gray-400 line-clamp-2">{noti.message}</p>
                                                    <p className="text-[10px] text-gray-500 mt-2 text-right">
                                                        {new Date(noti.createdAt).toLocaleDateString()}
                                                    </p>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* D. 로그아웃 */}
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:inline">Logout</span>
                        </button>

                        {/* 찜 목록 */}
                        <button
                            onClick={() => navigate('/wishlist')}
                            className="relative group bg-gradient-to-r from-pink-600/20 to-red-600/20 hover:from-pink-600 hover:to-red-600 border border-pink-500/30 hover:border-pink-500 text-pink-500 hover:text-white px-3 md:px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)]"
                        >
                            {/* 아이콘은 항상 보임 */}
                            <Heart className={`w-4 h-4 md:w-5 md:h-5 ${totalWishlistCount > 0 ? 'fill-current animate-pulse' : ''}`} />

                            {/* 👇 [수정] 텍스트는 모바일에서 숨기고(hidden), PC에서만 보임(md:inline) */}
                            <span className="hidden md:inline font-bold text-sm">My Wishlist</span>

                            {/* 카운트 뱃지 */}
                            {totalWishlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 md:h-5 md:w-5 bg-red-500 text-white text-[10px] md:text-xs font-bold items-center justify-center">
                                        {totalWishlistCount > 9 ? '9+' : totalWishlistCount}
                                    </span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
        </>
    );
};

export default Navbar;