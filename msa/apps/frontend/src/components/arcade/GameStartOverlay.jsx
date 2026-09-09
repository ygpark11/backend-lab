import React, { useState, useEffect, useRef } from 'react';
import { Play, Trophy, Sparkles, HelpCircle, ArrowLeft, Zap, Flame } from 'lucide-react';
import { gameSound } from '../../utils/gameSound';

const GameStartOverlay = ({
    title,
    subtitle,
    badgeText = 'ARCADE',
    badgeColor = 'bg-ps-blue',
    instructions = [],
    highScore = 0,
    timeLimit = 120,
    onStart,
    onBack
}) => {
    // 상태: 'BRIEFING' (안내 & 시작 버튼) | 'COUNTDOWN' (3, 2, 1, GO!)
    const [step, setStep] = useState('BRIEFING');
    const [countdown, setCountdown] = useState(3);
    const countdownTimerRef = useRef(null);

    const handleBeginCountdown = () => {
        setStep('COUNTDOWN');
        setCountdown(3);
        gameSound.playCountdown(false);
    };

    useEffect(() => {
        if (step !== 'COUNTDOWN') return;

        countdownTimerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev === 3) {
                    gameSound.playCountdown(false);
                    return 2;
                }
                if (prev === 2) {
                    gameSound.playCountdown(false);
                    return 1;
                }
                if (prev === 1) {
                    gameSound.playCountdown(true);
                    return 'GO!';
                }
                if (prev === 'GO!') {
                    clearInterval(countdownTimerRef.current);
                    onStart();
                    return 0;
                }
                return prev;
            });
        }, 800);

        return () => clearInterval(countdownTimerRef.current);
    }, [step, onStart]);

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            {step === 'BRIEFING' ? (
                /* 1단계: 브리핑 & 시작 준비 화면 */
                <div className="relative w-full max-w-lg bg-surface/95 border border-divider/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center">
                    {/* 상단 장식 글로우 */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-ps-blue/20 blur-3xl rounded-full pointer-events-none" />

                    {/* 상단 뱃지 & 뒤로가기 버튼 */}
                    <div className="w-full flex items-center justify-between mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary transition-colors p-2 rounded-xl hover:bg-surface-hover"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>게임 선택</span>
                        </button>
                        <span className={`px-3 py-1 rounded-full text-white text-[11px] font-black uppercase tracking-wider ${badgeColor} shadow-sm`}>
                            {badgeText}
                        </span>
                    </div>

                    {/* 타이틀 및 서브타이틀 */}
                    <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight text-primary mb-1">
                        {title}
                    </h2>
                    <p className="text-xs sm:text-sm text-secondary mb-6 font-medium">
                        {subtitle}
                    </p>

                    {/* 게임 정보 카드 (최고 기록 + 제한 시간) */}
                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-base border border-divider">
                            <div className="flex items-center gap-1.5 text-xs text-secondary font-bold mb-1">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span>내 최고 기록</span>
                            </div>
                            <span className="text-lg sm:text-xl font-black text-primary">
                                {highScore.toLocaleString()}P
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-base border border-divider">
                            <div className="flex items-center gap-1.5 text-xs text-secondary font-bold mb-1">
                                <Zap className="w-4 h-4 text-ps-blue" />
                                <span>제한 시간</span>
                            </div>
                            <span className="text-lg sm:text-xl font-black text-primary">
                                {timeLimit}초
                            </span>
                        </div>
                    </div>

                    {/* 플레이 방법 가이드 목록 */}
                    <div className="w-full bg-base/60 border border-divider/60 rounded-2xl p-4 text-left mb-6 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                            <HelpCircle className="w-4 h-4 text-ps-blue" />
                            <span>조작 및 클리어 규칙</span>
                        </div>
                        {instructions.map((inst, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-secondary">
                                <span className="w-4 h-4 rounded-full bg-surface text-secondary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-divider">
                                    {idx + 1}
                                </span>
                                <span>{inst}</span>
                            </div>
                        ))}
                    </div>

                    {/* 시작 버튼 */}
                    <button
                        onClick={handleBeginCountdown}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-ps-blue to-blue-600 hover:from-blue-600 hover:to-ps-blue text-white font-black text-base shadow-[0_0_20px_rgba(0,112,209,0.4)] hover:shadow-[0_0_25px_rgba(0,112,209,0.6)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 touch-manipulation group"
                    >
                        <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                        <span>게임 시작 (Ready)</span>
                    </button>
                </div>
            ) : (
                /* 2단계: '간지' 나는 3, 2, 1, GO! 카운트다운 연출 */
                <div className="flex flex-col items-center justify-center text-center select-none">
                    <div className="text-xs sm:text-sm font-black tracking-widest text-ps-blue uppercase mb-3 animate-pulse">
                        READY...
                    </div>

                    <div
                        key={countdown}
                        className={`font-black italic tracking-tighter leading-none transition-all duration-300 transform scale-100 ${
                            countdown === 'GO!'
                                ? 'text-6xl sm:text-8xl text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.8)] animate-bounce'
                                : 'text-7xl sm:text-9xl text-white drop-shadow-[0_0_30px_rgba(0,112,209,0.8)] animate-in zoom-in-50 duration-200'
                        }`}
                    >
                        {countdown}
                    </div>

                    <div className="mt-6 flex items-center gap-3 text-secondary text-xs font-bold opacity-70">
                        <Flame className="w-4 h-4 text-amber-500 animate-spin" />
                        <span>타임어택 시작 준비 중!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameStartOverlay;
