import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const GOOGLE_LOGIN_URL = "http://localhost:8080/oauth2/authorization/google";

    // 1. URL에 있는 파라미터(?accessToken=...)를 읽어오는 낚싯대
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        // 2. 낚싯대 확인: 토큰이 걸려있나?
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (accessToken) {
            // 3. 월척이다! 주머니(LocalStorage)에 저장
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            // 4. 게임 목록 페이지로 이동 (URL도 깔끔하게 청소)
            navigate('/games', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-ps-black text-ps-text relative overflow-hidden">
            {/* 배경 장식 */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-ps-blue/10 to-transparent pointer-events-none" />

            <div className="z-10 bg-ps-card p-10 rounded-2xl shadow-2xl max-w-md w-full text-center border border-white/5 backdrop-blur-sm">
                <h1 className="text-4xl font-black mb-2 tracking-tighter">
                    <span className="text-white">PS</span>
                    <span className="text-ps-blue">-Tracker</span>
                </h1>
                <p className="text-ps-muted mb-10 text-sm">
                    PlayStation 최저가 추적 & AI 추천 플랫폼
                </p>

                <a
                    href={GOOGLE_LOGIN_URL}
                    className="flex items-center justify-center gap-3 w-full bg-white text-gray-800 font-bold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                >
                    {/* 구글 아이콘 */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" />
                    </svg>
                    <span>Google 계정으로 시작하기</span>
                </a>

                <p className="mt-8 text-xs text-ps-muted">
                    로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;