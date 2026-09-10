import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Timer,
    Sparkles,
    Flame,
    Trophy,
    RotateCcw,
    Volume2,
    VolumeX,
    ArrowLeft,
    Zap,
    Award,
    Lightbulb,
    CheckCircle2
} from 'lucide-react';
import {
    REFLEX_SYMBOLS,
    REFLEX_CONFIG,
    generateNextSymbol,
    calculateReflexTrophy
} from '../../utils/reflexGame';
import { gameSound } from '../../utils/gameSound';
import { arcadeApi } from '../../api/arcadeApi';
import TrophyNotification from '../sichuan/TrophyNotification';
import GameStartOverlay from './GameStartOverlay';
import toast from 'react-hot-toast';

const QuickReflexGame = ({ user, _isAuthenticated, initialBestScore = 0, onBack, onOpenLeaderboard, openLoginModal }) => {
    const [showOverlay, setShowOverlay] = useState(true);
    const [timeLeft, setTimeLeft] = useState(REFLEX_CONFIG.duration);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [currentQueue, setCurrentQueue] = useState(() => {
        const s1 = generateNextSymbol(null);
        const s2 = generateNextSymbol(s1.id);
        const s3 = generateNextSymbol(s2.id);
        return [s1, s2, s3];
    });
    const [lastJudgment, setLastJudgment] = useState(null); // 'PERFECT' | 'GREAT' | 'MISS'
    const [isMuted, setIsMuted] = useState(() => gameSound.getMuted());

    const [gameState, setGameState] = useState('READY');
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [awardedTrophy, setAwardedTrophy] = useState(null);
    const [gameSessionId, setGameSessionId] = useState(1);

    // 서버 DB 기반 최고 점수 상태
    const [highScore, setHighScore] = useState({ score: initialBestScore || 0, maxCombo: 0 });

    // 로그인 회원의 경우 서버 DB의 최신 최고 기록 동기화
    useEffect(() => {
        if (user) {
            arcadeApi.getLeaderboard('reflex', user)
                .then(data => {
                    const serverBest = data?.myRank?.score || 0;
                    if (serverBest > 0) {
                        setHighScore(prev => ({ ...prev, score: Math.max(prev.score, serverBest) }));
                    }
                })
                .catch(() => {});
        }
    }, [user]);

    const [resultSummary, setResultSummary] = useState({
        finalScore: 0,
        maxCombo: 0,
        perfectCount: 0,
        missCount: 0
    });

    const startTimeRef = useRef(0);
    const scoreRef = useRef(0);
    const maxComboRef = useRef(0);
    const perfectCountRef = useRef(0);
    const missCountRef = useRef(0);
    const judgmentTimeoutRef = useRef(null);

    // 큐 초기화 (3개 큐잉)
    const initQueue = useCallback(() => {
        const s1 = generateNextSymbol(null);
        const s2 = generateNextSymbol(s1.id);
        const s3 = generateNextSymbol(s2.id);
        setCurrentQueue([s1, s2, s3]);
    }, []);

    // 게임 시작 및 리셋
    const initGame = useCallback(() => {
        setTimeLeft(REFLEX_CONFIG.duration);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setGameState('PLAYING');
        setIsResultOpen(false);
        setLastJudgment(null);

        scoreRef.current = 0;
        maxComboRef.current = 0;
        perfectCountRef.current = 0;
        missCountRef.current = 0;

        initQueue();
        setGameSessionId(prev => prev + 1);
    }, [initQueue]);

    // 카운트다운 완료 후 게임 정식 시작
    const handleStartAfterCountdown = useCallback(() => {
        setShowOverlay(false);
        initGame();
    }, [initGame]);


    // 타이머 인터벌
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        startTimeRef.current = Date.now();
        const duration = REFLEX_CONFIG.duration;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const remaining = Math.max(0, duration - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                setGameState('GAMEOVER');

                const finalScore = scoreRef.current;
                const finalMaxCombo = maxComboRef.current;

                setResultSummary({
                    finalScore,
                    maxCombo: finalMaxCombo,
                    perfectCount: perfectCountRef.current,
                    missCount: missCountRef.current
                });

                setIsResultOpen(true);

                // 트로피 산정
                const trophy = calculateReflexTrophy(finalScore, finalMaxCombo);
                setAwardedTrophy(trophy);
                gameSound.playTrophy();

                // 로그인 회원인 경우에만 최고 점수 갱신 및 리더보드 점수 등록
                if (user) {
                    const isNewScore = finalScore > highScore.score;
                    if (isNewScore) {
                        setHighScore(prev => ({
                            ...prev,
                            score: finalScore,
                            maxCombo: Math.max(prev.maxCombo, finalMaxCombo)
                        }));
                        if (highScore.score > 0) {
                            toast.success('최고 기록을 경신했습니다!');
                        }
                    }

                    arcadeApi.submitScore('reflex', {
                        score: finalScore,
                        clearTimeSec: 45,
                        user
                    }).catch(err => console.error('[QuickReflexGame] 점수 등록 실패:', err));
                }
            }
        }, 500);

        return () => clearInterval(interval);
    }, [gameState, gameSessionId, highScore, user]);

    // 입력 처리 (키보드 또는 터치 버튼)
    const handleInput = useCallback((symbolId) => {
        if (gameState !== 'PLAYING' || currentQueue.length === 0) return;

        const target = currentQueue[0];
        const isMatch = target.id === symbolId;

        if (isMatch) {
            // 성공
            const newCombo = combo + 1;
            const newMaxCombo = Math.max(maxCombo, newCombo);
            setCombo(newCombo);
            setMaxCombo(newMaxCombo);
            maxComboRef.current = newMaxCombo;

            const isFever = newCombo >= REFLEX_CONFIG.feverThreshold;
            const feverBonus = isFever ? 2 : 1;
            const gained = (REFLEX_CONFIG.baseScore + (newCombo - 1) * REFLEX_CONFIG.comboMultiplier) * feverBonus;

            const newTotalScore = score + gained;
            setScore(newTotalScore);
            scoreRef.current = newTotalScore;
            perfectCountRef.current += 1;

            gameSound.playReflexHit(newCombo);
            if (navigator.vibrate) navigator.vibrate(10);

            setLastJudgment({ type: isFever ? 'FEVER HIT' : 'PERFECT', color: target.color });

            // 다음 심볼 큐 갱신
            setCurrentQueue(prev => {
                const nextQueue = prev.slice(1);
                const lastItem = nextQueue[nextQueue.length - 1];
                nextQueue.push(generateNextSymbol(lastItem?.id));
                return nextQueue;
            });
        } else {
            // 미스
            setCombo(0);
            missCountRef.current += 1;
            gameSound.playMismatch();
            if (navigator.vibrate) navigator.vibrate(30);

            setLastJudgment({ type: 'MISS', color: '#EF4444' });

            // 감점 (최소 0점 보장)
            const penalized = Math.max(0, score - 80);
            setScore(penalized);
            scoreRef.current = penalized;
        }

        clearTimeout(judgmentTimeoutRef.current);
        judgmentTimeoutRef.current = setTimeout(() => {
            setLastJudgment(null);
        }, 350);
    }, [combo, currentQueue, gameState, maxCombo, score]);

    // 키보드 이벤트 리스너 등록
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;
            const pressedKey = e.code || e.key;

            for (const sym of REFLEX_SYMBOLS) {
                if (sym.keys.includes(pressedKey)) {
                    e.preventDefault();
                    handleInput(sym.id);
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInput]);

    const activeTarget = currentQueue[0];
    const isFeverActive = combo >= REFLEX_CONFIG.feverThreshold;

    return (
        <div className={`relative w-full h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] mt-16 bg-base text-primary px-3 py-2 flex flex-col items-center justify-between select-none overflow-hidden touch-manipulation transition-colors duration-500 ${isFeverActive ? 'bg-gradient-to-b from-indigo-950/20 via-base to-base' : ''}`}>
            {/* 시작 전 READY... GO! 오버레이 */}
            {showOverlay && (
                <GameStartOverlay
                    title="PS 퀵 리액션 (QTE)"
                    subtitle="중앙 링에 나타나는 심볼을 신속하게 터치하거나 키보드로 맞추는 45초 스피드런"
                    badgeText="45s 스피드런"
                    badgeColor="bg-amber-500"
                    timeLimit={45}
                    highScore={highScore.score}
                    instructions={[
                        "중앙 타겟 링에 표시되는 심볼과 일치하는 버튼을 빠르게 누르세요.",
                        "모바일에서는 하단의 큼직한 심볼 버튼을 바로 터치하세요.",
                        "10콤보 이상 달성 시 2배 점수의 FEVER MODE가 발동됩니다!"
                    ]}
                    onStart={handleStartAfterCountdown}
                    onBack={onBack}
                />
            )}

            {/* 트로피 팝업 */}
            <TrophyNotification trophy={awardedTrophy} onClose={() => setAwardedTrophy(null)} />

            {/* 상단 네비게이션 & 스탯 대시보드 */}
            <header className="w-full max-w-lg shrink-0 flex flex-col gap-2 z-10">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors p-2 rounded-xl hover:bg-surface-hover"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>아케이드 홈</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => {
                                const m = gameSound.toggleMute();
                                setIsMuted(m);
                            }}
                            className="p-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary transition-colors"
                        >
                            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-ps-blue" />}
                        </button>
                        <button
                            onClick={initGame}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary transition-colors text-xs font-bold"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>다시하기</span>
                        </button>
                    </div>
                </div>

                {/* 정보 바 (시간, 점수, 콤보) */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-surface/90 backdrop-blur-md border border-divider p-1.5 sm:p-2 rounded-2xl overflow-hidden">
                    <div className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 sm:px-3 py-1 rounded-xl border transition-all whitespace-nowrap ${timeLeft <= 10 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-base border-divider text-primary'}`}>
                        <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-secondary font-bold whitespace-nowrap">
                            <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-ps-blue shrink-0" />
                            <span>시간</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black whitespace-nowrap">{timeLeft}s</span>
                    </div>

                    <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-1 sm:px-4 py-1 rounded-xl bg-base border border-divider whitespace-nowrap">
                        <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-secondary font-bold whitespace-nowrap">
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 shrink-0" />
                            <span>점수</span>
                        </div>
                        <span className="text-xs sm:text-base font-black text-primary whitespace-nowrap">
                            {score.toLocaleString()}
                        </span>
                    </div>

                    <div className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 sm:px-3 py-1 rounded-xl border transition-all whitespace-nowrap ${isFeverActive ? 'bg-amber-500/20 border-amber-500 text-amber-500 animate-bounce' : 'bg-base border-divider text-secondary'}`}>
                        <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                            <Flame className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${isFeverActive ? 'text-amber-500' : 'text-secondary'}`} />
                            <span>콤보</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                            {combo > 0 ? `x${combo}` : '-'}
                        </span>
                    </div>
                </div>

                {/* 45초 게이지 */}
                <div className="w-full h-1 bg-divider rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-linear rounded-full ${isFeverActive ? 'bg-gradient-to-r from-amber-400 to-red-500 shadow-[0_0_10px_#f59e0b]' : 'bg-ps-blue'}`}
                        style={{ width: `${(timeLeft / REFLEX_CONFIG.duration) * 100}%` }}
                    />
                </div>
            </header>

            {/* 메인 챌린지 영역 (큐잉 및 중앙 타겟) */}
            <main className="w-full max-w-lg flex-1 flex flex-col items-center justify-center my-2 relative">
                {/* 피버 모드 인디케이터 */}
                {isFeverActive && (
                    <div className="absolute top-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-black text-xs tracking-wider shadow-lg animate-pulse flex items-center gap-1.5 z-20">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>FEVER MODE (2X BOOST)</span>
                    </div>
                )}

                {/* 판정 텍스트 (PERFECT / MISS) */}
                <div className="h-8 flex items-center justify-center mb-2">
                    {lastJudgment && (
                        <span
                            className="font-black italic text-lg sm:text-xl animate-in zoom-in-75 duration-150 tracking-wider"
                            style={{ color: lastJudgment.color }}
                        >
                            {lastJudgment.type}!
                        </span>
                    )}
                </div>

                {/* 중앙 타겟 심볼 링 */}
                <div className="relative flex items-center justify-center mb-4">
                    {/* 외곽 회전 글로우 링 */}
                    <div
                        className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-dashed border-divider flex items-center justify-center transition-all duration-300"
                        style={{
                            borderColor: activeTarget ? activeTarget.borderColor : undefined,
                            boxShadow: activeTarget ? `0 0 30px ${activeTarget.bgGlow}` : undefined
                        }}
                    >
                        {/* 현재 눌러야 할 메인 타겟 심볼 (불필요한 s/↓ 문구 제거하고 큼직하게 중앙 정렬) */}
                        {activeTarget && (
                            <div
                                key={activeTarget.uid}
                                className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-surface/95 border-2 flex items-center justify-center shadow-2xl animate-in zoom-in-90 duration-150"
                                style={{
                                    borderColor: activeTarget.color,
                                    boxShadow: `0 0 25px ${activeTarget.bgGlow}`
                                }}
                            >
                                <span
                                    className="text-6xl sm:text-7xl font-black leading-none drop-shadow-lg"
                                    style={{ color: activeTarget.color }}
                                >
                                    {activeTarget.label}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 다음에 올 큐 심볼들 (미리보기 - 더 또렷하고 직관적인 크기) */}
                <div className="flex items-center gap-2.5 bg-surface/80 backdrop-blur-md border border-divider px-4 py-2 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-black text-secondary uppercase tracking-wider">NEXT</span>
                    {currentQueue.slice(1, 3).map((sym, idx) => (
                        <div
                            key={sym.uid || idx}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-base border-2 flex items-center justify-center text-lg sm:text-xl font-black transition-all"
                            style={{ borderColor: sym.borderColor, color: sym.color }}
                        >
                            {sym.label}
                        </div>
                    ))}
                </div>
            </main>

            {/* 하단 DualSense 액션 패드 컨트롤러 (모바일 터치 최적화: 시인성 극대화 및 불필요한 화살표/문구 완전 제거) */}
            <footer className="w-full max-w-sm shrink-0 flex flex-col items-center pb-3 z-10">
                <div className="relative w-64 h-52 flex items-center justify-center">
                    {/* 상단: 세모 (Triangle - 신호등 노란불 GOOD_OFFER) */}
                    <button
                        onClick={() => handleInput('triangle')}
                        className="absolute top-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-surface/90 border-2 border-[#F59E0B] active:scale-90 hover:bg-[#F59E0B]/15 shadow-[0_0_12px_rgba(245,158,11,0.25)] active:shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center transition-all touch-manipulation cursor-pointer"
                        aria-label="세모"
                    >
                        <span className="text-3xl sm:text-4xl font-black text-[#F59E0B] leading-none">△</span>
                    </button>

                    {/* 좌측: 네모 (Square - 신호등 파란불 TRACKING) */}
                    <button
                        onClick={() => handleInput('square')}
                        className="absolute left-1 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-surface/90 border-2 border-[#3B82F6] active:scale-90 hover:bg-[#3B82F6]/15 shadow-[0_0_12px_rgba(59,130,246,0.25)] active:shadow-[0_0_20px_rgba(59,130,246,0.6)] flex items-center justify-center transition-all touch-manipulation cursor-pointer"
                        aria-label="네모"
                    >
                        <span className="text-3xl sm:text-4xl font-black text-[#3B82F6] leading-none">□</span>
                    </button>

                    {/* 우측: 동그라미 (Circle - 신호등 초록불 BUY_NOW) */}
                    <button
                        onClick={() => handleInput('circle')}
                        className="absolute right-1 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-surface/90 border-2 border-[#22C55E] active:scale-90 hover:bg-[#22C55E]/15 shadow-[0_0_12px_rgba(34,197,94,0.25)] active:shadow-[0_0_20px_rgba(34,197,94,0.6)] flex items-center justify-center transition-all touch-manipulation cursor-pointer"
                        aria-label="동그라미"
                    >
                        <span className="text-3xl sm:text-4xl font-black text-[#22C55E] leading-none">○</span>
                    </button>

                    {/* 하단: 엑스 (Cross - 신호등 빨간불 WAIT) */}
                    <button
                        onClick={() => handleInput('cross')}
                        className="absolute bottom-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-surface/90 border-2 border-[#EF4444] active:scale-90 hover:bg-[#EF4444]/15 shadow-[0_0_12px_rgba(239,68,68,0.25)] active:shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center justify-center transition-all touch-manipulation cursor-pointer"
                        aria-label="엑스"
                    >
                        <span className="text-3xl sm:text-4xl font-black text-[#EF4444] leading-none">×</span>
                    </button>
                </div>

                {/* PC 환경 전용 키 가이드 (모바일에서는 완전히 숨김) */}
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-secondary font-medium mt-2 opacity-60">
                    <span>PC 키보드 조작: W(상) • A(좌) • S(하) • D(우) 또는 방향키</span>
                </div>
            </footer>

            {/* 게임 결과 모달 */}
            {isResultOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-divider rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-ps-blue/20 border border-ps-blue/40 flex items-center justify-center text-ps-blue mb-3">
                            <Trophy className="w-8 h-8" />
                        </div>

                        <h3 className="text-xl font-black text-primary mb-1 whitespace-nowrap">
                            타임오버! 챌린지 완료
                        </h3>
                        <p className="text-xs text-secondary mb-4 whitespace-nowrap">
                            45초간 듀얼센스 퀵 리액션을 완수했습니다.
                        </p>

                        <div className="w-full bg-base border border-divider rounded-2xl p-4 mb-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                <span className="text-secondary font-bold">최종 점수</span>
                                <span className="text-base font-black text-ps-blue font-mono">
                                    {resultSummary.finalScore.toLocaleString()}P
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                <span className="text-secondary font-bold">최대 콤보</span>
                                <span className="text-sm font-black text-amber-500 font-mono">
                                    {resultSummary.maxCombo} 콤보
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                <span className="text-secondary font-bold">퍼펙트 판정</span>
                                <span className="text-sm font-bold text-emerald-500 font-mono">
                                    {resultSummary.perfectCount}회
                                </span>
                            </div>
                        </div>

                        {/* 로그인 상태별 리더보드 안내 배너 */}
                        {user ? (
                            <div className="w-full py-2 px-3 mb-4 rounded-xl bg-ps-blue/10 border border-ps-blue/25 text-[11px] text-ps-blue font-bold flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <Trophy className="w-3.5 h-3.5 text-ps-blue shrink-0" />
                                <span>명예의 전당에 점수가 자동 등록되었습니다!</span>
                            </div>
                        ) : (
                            <div className="w-full p-3 mb-4 rounded-2xl bg-surface-hover/80 border border-divider text-left flex flex-col gap-2">
                                <div className="flex items-start gap-1.5">
                                    <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-secondary leading-relaxed">
                                        <strong className="text-primary block font-bold mb-0.5">기록을 영구 보존하시겠습니까?</strong>
                                        로그인하시면 지금 달성한 {resultSummary.finalScore.toLocaleString()}점을 명예의 전당에 영구 등록할 수 있습니다.
                                    </div>
                                </div>
                                {openLoginModal && (
                                    <button
                                        onClick={() => {
                                            setIsResultOpen(false);
                                            openLoginModal();
                                        }}
                                        className="w-full py-2 rounded-xl bg-ps-blue hover:bg-blue-600 text-white font-bold text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-1"
                                    >
                                        로그인하고 다음 플레이부터 기록 저장하기
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 w-full">
                            <button
                                onClick={initGame}
                                className="flex-1 py-3 rounded-xl bg-ps-blue text-white font-bold text-xs hover:bg-blue-600 transition-colors"
                            >
                                다시 도전
                            </button>
                            <button
                                onClick={() => {
                                    setIsResultOpen(false);
                                    if (onOpenLeaderboard) onOpenLeaderboard('reflex');
                                }}
                                className="flex-1 py-3 rounded-xl bg-surface border border-divider text-primary font-bold text-xs hover:bg-surface-hover transition-colors"
                            >
                                랭킹 확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(QuickReflexGame);
