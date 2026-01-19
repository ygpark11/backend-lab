import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import LegalModal from '../components/LegalModal';
import client from '../api/client';
import SEO from '../components/common/SEO';

const BG_IMAGE = "https://image.api.playstation.com/vulcan/ap/rnd/202010/0222/niMUu8FxdDS2s8cMKfrg6s2Q.png";

const LoginPage = () => {
    const GOOGLE_LOGIN_URL = `/oauth2/authorization/google`;

    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('terms');

    const handleGoogleLogin = () => {
        window.location.href = GOOGLE_LOGIN_URL;
    };

    const handleOpenLegal = (e, tab) => {
        e.preventDefault();
        setActiveTab(tab);
        setIsLegalOpen(true);
    };

    const handleContact = (e) => {
        e.preventDefault();
        toast.success('준비 중인 기능입니다. 이메일로 문의해주세요!', {
            icon: '✉️',
            style: {
                borderRadius: '12px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
            },
        });
    };

    return (
        <div className="min-h-screen bg-ps-black text-white relative flex flex-col items-center justify-center overflow-hidden">
            <SEO title="로그인 - PS Tracker" description="PlayStation Game 최저가 정보 & 할인 정보 플랫폼에 로그인하세요." />
            {/* Background Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src={BG_IMAGE}
                    alt="Background"
                    className="w-full h-full object-cover opacity-20 scale-110 blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ps-black via-ps-black/80 to-transparent" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md p-8 animate-fadeIn">
                <div className="text-center mb-10">
                    <div className="inline-block bg-ps-blue p-4 rounded-2xl shadow-2xl shadow-ps-blue/20 mb-6 rotate-3 transform transition-transform hover:rotate-6">
                        <Gamepad2 className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">
                        PS <span className="text-ps-blue">Tracker</span>
                    </h1>
                    <p className="text-gray-400 text-lg font-medium">
                        PlayStation 최저가 추적 & AI 추천 플랫폼
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl hover:border-white/20 transition-colors">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-lg"
                    >
                        <img
                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                            alt="Google"
                            className="w-6 h-6"
                        />
                        Google 계정으로 시작하기
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-6">
                        로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                    </p>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-gray-500 bg-white/5 py-3 px-4 rounded-xl border border-white/5">
                    <Info className="w-4 h-4 text-ps-blue" />
                    <p className="text-xs font-medium">실시간 가격 변동 알림 서비스를 이용해보세요</p>
                </div>
            </div>

            {/* Footer Links */}
            <div className="absolute bottom-6 text-center z-10">
                <div className="flex gap-4 text-xs text-gray-500 justify-center">
                    <a href="#" onClick={(e) => handleOpenLegal(e, 'terms')} className="hover:text-white transition-colors">이용약관</a>
                    <span className="text-gray-700">|</span>
                    <a href="#" onClick={(e) => handleOpenLegal(e, 'privacy')} className="hover:text-white transition-colors">개인정보처리방침</a>
                    <span className="text-gray-700">|</span>
                    <a href="#" onClick={handleContact} className="hover:text-white transition-colors">문의하기</a>
                </div>
                <p className="text-[10px] text-gray-700 mt-2">
                    © 2026 PS Tracker. Not affiliated with Sony Interactive Entertainment.
                </p>
            </div>

            <LegalModal
                isOpen={isLegalOpen}
                onClose={() => setIsLegalOpen(false)}
                defaultTab={activeTab}
            />
        </div>
    );
};

export default LoginPage;