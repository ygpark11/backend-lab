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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm animate-fadeIn"
            onClick={handleBackgroundClick} // 배경 클릭 이벤트 연결
        >
            <div className="bg-base border border-divider rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="absolute -top-20 -right-20 w-48 h-48 bg-[var(--bento-blue-from)] rounded-full blur-3xl pointer-events-none opacity-50"></div>
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[var(--bento-purple-from)] rounded-full blur-3xl pointer-events-none opacity-50"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors z-20 p-2 bg-surface hover:bg-surface-hover rounded-full border border-transparent hover:border-divider"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 pb-6 relative z-10 flex flex-col items-center">
                    {/* 로고 영역 */}
                    <div className="inline-block bg-[var(--bento-blue-from)] border border-[color:var(--bento-blue-border)] p-3 rounded-2xl shadow-sm mb-4 transform transition-transform hover:rotate-12 cursor-default">
                        <Gamepad2 className="w-10 h-10 text-blue-800 dark:text-ps-blue drop-shadow-sm" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter mb-2 text-primary">
                        PS <span className="text-blue-800 dark:text-ps-blue">Tracker</span>
                    </h2>
                    <p className="text-secondary text-xs font-medium mb-8 text-center">
                        로그인하고 실시간 최저가 알림을 받아보세요
                    </p>

                    {/* 로그인 버튼 */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-surface border border-divider text-primary font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-surface-hover hover:border-ps-blue transition-all transform hover:-translate-y-1 shadow-sm active:scale-95"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-sm">Google 계정으로 시작하기</span>
                    </button>

                    {/* 법적 동의 안내 */}
                    <div className="mt-6 p-3 bg-surface rounded-xl border border-divider flex items-start gap-2 w-full shadow-inner">
                        <Info className="w-4 h-4 text-blue-700 dark:text-ps-blue shrink-0 mt-0.5" />
                        <p className="text-[10px] text-secondary leading-relaxed break-keep">
                            로그인 시 우측 상단의 <Shield className="w-3 h-3 inline text-secondary mx-0.5"/> 메뉴에 있는 <strong className="text-primary">이용약관</strong> 및 <strong className="text-primary">개인정보처리방침</strong>에 동의하는 것으로 간주합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;