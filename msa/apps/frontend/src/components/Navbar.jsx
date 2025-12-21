import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, LogOut, HelpCircle, AlertTriangle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import GuideModal from './GuideModal';
import LegalModal from './LegalModal'; // [New] 약관 모달 임포트

const Navbar = () => {
    const navigate = useNavigate();

    // 모달 상태 관리
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isLegalOpen, setIsLegalOpen] = useState(false);

    // 로그아웃 핸들러 (커스텀 토스트)
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
                            performLogout();
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
        ), {
            duration: 5000,
            position: 'top-center',
            style: { background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }
        });
    };

    // 실제 로그아웃 로직
    const performLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
    };

    return (
        <>
            <nav className="sticky top-0 z-50 bg-ps-black/80 backdrop-blur-md border-b border-white/10 h-16">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    {/* 1. 로고 영역 */}
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate('/games')}
                    >
                        <div className="bg-ps-blue p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                            <Gamepad2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            PS <span className="text-ps-blue">Tracker</span>
                        </span>
                    </div>

                    {/* 2. 우측 메뉴 영역 */}
                    <div className="flex items-center gap-2 md:gap-4">

                        {/* A. 이용약관 (Shield) */}
                        <button
                            onClick={() => setIsLegalOpen(true)}
                            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            title="이용약관 및 정책"
                        >
                            <Shield className="w-5 h-5" />
                        </button>

                        {/* B. 가이드 (Help) */}
                        <button
                            onClick={() => setIsGuideOpen(true)}
                            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            title="가이드 보기"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>

                        {/* C. 로그아웃 */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:inline">Logout</span>
                        </button>

                        {/* D. 찜 목록 버튼 */}
                        <button
                            onClick={() => navigate('/wishlist')}
                            className="ml-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/5 hover:border-white/20 shadow-lg"
                        >
                            My Wishlist ❤️
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- 모달 컴포넌트들 --- */}

            {/* 1. 가이드 모달 */}
            <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

            {/* 2. 약관 모달 */}
            <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
        </>
    );
};

export default Navbar;