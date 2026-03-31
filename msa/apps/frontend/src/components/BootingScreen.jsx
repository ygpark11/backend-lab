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

    const progressScale = isChecking ? 1 : (timeLeft / 60);

    return (
        <div className="fixed inset-0 z-[9999] bg-base flex flex-col items-center justify-center p-6 animate-fadeIn transition-colors duration-500">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--bento-blue-from)] rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full bg-glass backdrop-blur-xl border border-divider p-8 sm:p-10 rounded-3xl shadow-2xl transition-all duration-500">

                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border mb-6 shadow-sm transition-colors duration-500 ${isSuccess ? 'bg-[var(--bento-green-from)] border-[color:var(--bento-green-border)]' : 'bg-[var(--bento-blue-from)] border-[color:var(--bento-blue-border)]'}`}>
                    {isSuccess ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500 animate-in zoom-in" />
                        ) : (
                        <ServerCrash className="w-8 h-8 text-ps-blue animate-pulse" />
                        )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight mb-2">
                    {isSuccess ? '시스템 복구 완료' : '시스템 업데이트 중'}
                </h1>

                <div className="h-6 mb-8 mt-2">
                    <p className={`text-sm font-bold ${isSuccess ? 'text-green-600 dark:text-green-500' : 'text-secondary'} animate-pulse-slow transition-colors`}>
                        {isSuccess ? '서버가 정상적으로 기동되었습니다.' : messages[messageIndex]}
                    </p>
                </div>

                <div className={`transform scale-75 -my-8 transition-opacity duration-500 ${isSuccess ? 'opacity-0 h-0' : 'opacity-100'}`}>
                    <PSLoader />
                </div>

                <p className={`text-xs text-muted mt-8 mb-8 leading-relaxed transition-opacity ${isSuccess ? 'opacity-0' : 'opacity-100'}`}>
                    새로운 기능 적용 또는 서버 기동으로 인해<br/>
                    일시적으로 연결이 지연되고 있습니다.<br/>
                    <strong className="text-primary">잠시 후 자동으로 서버 상태를 확인합니다.</strong>
                </p>

                <div className={`w-full flex flex-col gap-3 transition-opacity duration-500 ${isSuccess ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="w-full mb-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-secondary mb-1.5 px-1 tracking-wider">
                            <span>{isChecking ? 'CHECKING_STATUS...' : 'AUTO_RECOVERY'}</span>
                            <span className="text-ps-blue font-mono">00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                        <div className="w-full h-1 bg-divider-strong rounded-full overflow-hidden">
                            <div
                                className={`h-full w-full origin-left transition-transform duration-1000 ease-linear shadow-sm transform-gpu will-change-transform ${isChecking ? 'bg-yellow-500 animate-pulse' : 'bg-ps-blue'}`}
                                style={{ transform: `scaleX(${progressScale})` }}
                            ></div>
                        </div>
                    </div>

                    <button
                        onClick={checkServerHealth}
                        disabled={isChecking}
                        className="group w-full flex items-center justify-center gap-2 py-4 bg-surface hover:bg-surface-hover border border-divider text-secondary hover:text-primary font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-5 h-5 transition-all ${isChecking ? 'animate-spin text-primary' : 'text-secondary group-hover:text-primary group-hover:rotate-180 duration-500'}`} />
                        <span>{isChecking ? '서버 응답 대기 중...' : '지금 바로 확인하기'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BootingScreen;