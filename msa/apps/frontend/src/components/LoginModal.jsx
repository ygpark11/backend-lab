import React from 'react';
import { X, Gamepad2, Info, Shield } from 'lucide-react';

const LoginModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleGoogleLogin = () => {
        window.location.href = '/oauth2/authorization/google';
    };

    // 모달 바깥쪽(어두운 배경) 클릭 시 닫히도록 처리
    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackgroundClick} // 배경 클릭 이벤트 연결
        >
            <div className="bg-ps-card border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20 p-2"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 pb-6 relative z-10 flex flex-col items-center">
                    {/* 로고 영역 */}
                    <div className="inline-block bg-ps-blue p-3 rounded-2xl shadow-lg shadow-ps-blue/20 mb-4 transform transition-transform hover:rotate-12 cursor-default">
                        <Gamepad2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter mb-2 text-white">
                        PS <span className="text-ps-blue">Tracker</span>
                    </h2>
                    <p className="text-gray-400 text-xs font-medium mb-8 text-center">
                        로그인하고 실시간 최저가 알림을 받아보세요
                    </p>

                    {/* 로그인 버튼 */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all transform hover:-translate-y-1 shadow-lg active:scale-95"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-sm">Google 계정으로 시작하기</span>
                    </button>

                    {/* 법적 동의 안내 */}
                    <div className="mt-6 p-3 bg-white/5 rounded-xl border border-white/5 flex items-start gap-2 w-full">
                        <Info className="w-4 h-4 text-ps-blue shrink-0 mt-0.5" />
                        <p className="text-[10px] text-gray-400 leading-relaxed break-keep">
                            로그인 시 우측 상단의 <Shield className="w-3 h-3 inline text-gray-400 mx-0.5"/> 메뉴에 있는 <strong>이용약관</strong> 및 <strong>개인정보처리방침</strong>에 동의하는 것으로 간주합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;