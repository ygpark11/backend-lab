import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Gamepad2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import LegalModal from '../components/LegalModal';

const BG_IMAGE = "https://image.api.playstation.com/vulcan/ap/rnd/202010/0222/niMUu8FxdDS2s8cMKfrg6s2Q.png";

const LoginPage = () => {
    const GOOGLE_LOGIN_URL = `/oauth2/authorization/google`;
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('terms');

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            // [Deleted] "환영합니다" 토스트 삭제 -> 바로 깔끔하게 이동!

            navigate('/games', { replace: true });
        }
    }, [searchParams, navigate]);

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
        toast('문의하기 기능은 준비 중입니다! 📧', {
            icon: <Info className="text-yellow-400 w-5 h-5" />,
            style: { borderRadius: '10px', background: '#333', color: '#fff' },
        });
    };

    return (
        <div className="min-h-screen bg-ps-black text-white relative flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                    style={{
                        backgroundImage: `url(${BG_IMAGE})`,
                        filter: 'blur(8px) brightness(0.7)',
                        opacity: 0.6
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ps-black via-ps-black/80 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-ps-black/50 via-transparent to-transparent"></div>
            </div>

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
            </div>

            <div className="absolute bottom-6 text-center z-10">
                <div className="flex gap-4 text-xs text-gray-500 justify-center">
                    <a href="#" onClick={(e) => handleOpenLegal(e, 'terms')} className="hover:text-white transition-colors">이용약관</a>
                    <span className="text-gray-700">|</span>
                    <a href="#" onClick={(e) => handleOpenLegal(e, 'privacy')} className="hover:text-white transition-colors">개인정보처리방침</a>
                    <span className="text-gray-700">|</span>
                    <a href="#" onClick={handleContact} className="hover:text-white transition-colors">문의하기</a>
                </div>
                <p className="text-[10px] text-gray-700 mt-2">
                    © 2025 PS Tracker. Not affiliated with Sony Interactive Entertainment.
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