import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Heart, Search } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 현재 경로가 찜 목록인지 확인 (활성화 표시용)
    const isWishlist = location.pathname === '/wishlist';

    return (
        <nav className="w-full bg-ps-card/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* 1. 로고 영역 (브랜딩) */}
                <div
                    onClick={() => navigate('/games')}
                    className="flex items-center gap-2 cursor-pointer group"
                >
                    <div className="bg-ps-blue p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                        <Gamepad2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-white">
                        PS <span className="text-ps-blue">Tracker</span>
                    </span>
                </div>

                {/* 2. 우측 메뉴 영역 */}
                <div className="flex items-center gap-4">
                    {/* 찜 목록 버튼 */}
                    <button
                        onClick={() => navigate('/wishlist')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                            isWishlist
                                ? 'bg-red-500/20 text-red-500 border border-red-500/50'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${isWishlist ? 'fill-current' : ''}`} />
                        <span className="hidden md:inline">My Wishlist</span>
                    </button>

                    {/* (추후 로그인 유저 프로필이 여기 들어갈 수 있음) */}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;