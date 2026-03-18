import React, { useState, useEffect, useCallback } from 'react';
import { ServerCrash, RefreshCw, CheckCircle2 } from 'lucide-react';
import PSLoader from './PSLoader';
import { BASE_URL } from '../api/client';

const BootingScreen = ({ onResolved }) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isChecking, setIsChecking] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const messages = [
        "시스템 리소스를 초기화하고 있습니다...",
        "최신 게임 데이터를 동기화 중입니다...",
        "점검이 끝났는지 확인해보겠습니다."
    ];

    const checkServerHealth = useCallback(async () => {
        if (isChecking) return;
        setIsChecking(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${BASE_URL}/api/v1/members/me`, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            clearTimeout(timeoutId);

            if ([200, 401, 403].includes(response.status)) {
                setIsSuccess(true);
                setTimeout(() => {
                    onResolved();
                }, 1000);
                return;
            }

            setTimeLeft(60);

        } catch (error) {
            setTimeLeft(60);
        } finally {
            setIsChecking(false);
        }
    }, [isChecking, onResolved]);

    // 텍스트 롤링 (마지막 문구에서 정지)
    useEffect(() => {
        const messageInterval = setInterval(() => {
            setMessageIndex((prev) => {
                if (prev === messages.length - 1) return prev;
                return prev + 1;
            });
        }, 4000);
        return () => clearInterval(messageInterval);
    }, [messages.length]);

    // 카운트다운 타이머
    useEffect(() => {
        if (isChecking || isSuccess) return;

        const timerInterval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerInterval);
                    checkServerHealth();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [isChecking, isSuccess, checkServerHealth]);

    const progressWidth = `${(timeLeft / 60) * 100}%`;

    return (
        <div className="fixed inset-0 z-[9999] bg-ps-black flex flex-col items-center justify-center p-6 animate-fadeIn">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-ps-blue/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-500">

                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border mb-6 shadow-lg transition-colors duration-500 ${isSuccess ? 'bg-green-500/10 border-green-500/20 shadow-green-500/20' : 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/20'}`}>
                    {isSuccess ? (
                        <CheckCircle2 className="w-8 h-8 text-green-400 animate-in zoom-in" />
                    ) : (
                        <ServerCrash className="w-8 h-8 text-ps-blue animate-pulse" />
                    )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    {isSuccess ? '시스템 복구 완료' : '시스템 업데이트 중'}
                </h1>

                <div className="h-6 mb-8 mt-2">
                    <p className={`text-sm font-bold ${isSuccess ? 'text-green-400' : 'text-gray-400'} animate-pulse-slow transition-colors`}>
                        {isSuccess ? '서버가 정상적으로 기동되었습니다.' : messages[messageIndex]}
                    </p>
                </div>

                <div className={`transform scale-75 -my-8 transition-opacity duration-500 ${isSuccess ? 'opacity-0 h-0' : 'opacity-100'}`}>
                    <PSLoader />
                </div>

                <p className={`text-xs text-gray-500 mt-8 mb-8 leading-relaxed transition-opacity ${isSuccess ? 'opacity-0' : 'opacity-100'}`}>
                    새로운 기능 적용 또는 서버 기동으로 인해<br/>
                    일시적으로 연결이 지연되고 있습니다.<br/>
                    <strong className="text-gray-300">잠시 후 자동으로 서버 상태를 확인합니다.</strong>
                </p>

                <div className={`w-full flex flex-col gap-3 transition-opacity duration-500 ${isSuccess ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="w-full mb-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 mb-1.5 px-1 tracking-wider">
                            <span>{isChecking ? 'CHECKING_STATUS...' : 'AUTO_RECOVERY'}</span>
                            <span className="text-ps-blue font-mono">00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)] ${isChecking ? 'bg-yellow-400 w-full animate-pulse' : 'bg-ps-blue'}`}
                                style={{ width: isChecking ? '100%' : progressWidth }}
                            ></div>
                        </div>
                    </div>

                    <button
                        onClick={checkServerHealth}
                        disabled={isChecking}
                        className="group w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-500 group-hover:text-white transition-all ${isChecking ? 'animate-spin text-white' : 'group-hover:rotate-180 duration-500'}`} />
                        <span>{isChecking ? '서버 응답 대기 중...' : '지금 바로 확인하기'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BootingScreen;