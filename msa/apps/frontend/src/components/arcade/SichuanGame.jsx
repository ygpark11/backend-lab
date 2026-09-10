import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Trophy,
    Timer,
    Sparkles,
    Lightbulb,
    Shuffle,
    RotateCcw,
    Volume2,
    VolumeX,
    Award,
    Flame,
    ArrowLeft,
    Circle,
    Triangle,
    X as CrossIcon,
    Square
} from 'lucide-react';
import SichuanBoard from '../sichuan/SichuanBoard';
import TrophyNotification from '../sichuan/TrophyNotification';
import GameStartOverlay from './GameStartOverlay';
import {
    BOARD_CONFIG,
    createGameBoard,
    findSichuanPath,
    findAvailableMatch,
    hasAvailableMoves,
    shuffleBoard,
    calculateTrophy
} from '../../utils/sichuanGame';
import { gameSound } from '../../utils/gameSound';
import { arcadeApi } from '../../api/arcadeApi';
import toast from 'react-hot-toast';

const SichuanGame = ({ user, _isAuthenticated, initialBestScore = 0, onBack, onOpenLeaderboard, openLoginModal }) => {
    // 인트로 오버레이 상태 (READY... GO! 완료 전까지 true)
    const [showOverlay, setShowOverlay] = useState(true);

    // 화면 방향(PC 가로 16x9 vs 모바일 세로 9x16) 감지용 Ref
    const isLandscapeRef = useRef(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);

    // 144개 타일 단일 보드 (PC: 16열x9행 / 모바일: 9열x16행)
    const [board, setBoard] = useState(() =>
        createGameBoard(typeof window !== 'undefined' ? window.innerWidth >= 768 : false)
    );
    const [selectedPos, setSelectedPos] = useState(null);
    const [shakingPos, setShakingPos] = useState(null);
    const [hintPair, setHintPair] = useState(null);
    const [matchedKeys, setMatchedKeys] = useState(new Set());
    const [laserPath, setLaserPath] = useState(null);
    const [laserColor, setLaserColor] = useState('#3B82F6');

    // 게임 상태 (순수 120초 타임어택)
    const [gameState, setGameState] = useState('READY'); // 'READY' | 'PLAYING' | 'GAMEOVER' | 'CLEARED'
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [hintCount, setHintCount] = useState(3);
    const [shuffleCount, setShuffleCount] = useState(3);
    const [remainingTiles, setRemainingTiles] = useState(BOARD_CONFIG.tileCount);

    // 사운드 & 트로피 팝업
    const [isMuted, setIsMuted] = useState(() => gameSound.getMuted());
    const [awardedTrophy, setAwardedTrophy] = useState(null);

    // 서버 DB 기반 최고 점수 상태
    const [highScore, setHighScore] = useState({ score: initialBestScore || 0, clearTime: 999 });

    // 로그인 회원의 경우 서버 DB의 최신 최고 기록 동기화
    useEffect(() => {
        if (user) {
            arcadeApi.getLeaderboard('sichuan', user)
                .then(data => {
                    const serverBest = data?.myRank?.score || 0;
                    if (serverBest > 0) {
                        setHighScore(prev => ({ ...prev, score: Math.max(prev.score, serverBest) }));
                    }
                })
                .catch(() => {});
        }
    }, [user]);

    const comboTimerRef = useRef(null);
    const laserTimeoutRef = useRef(null);
    const shakeTimeoutRef = useRef(null);
    const startTimeRef = useRef(0);

    const [gameSessionId, setGameSessionId] = useState(1);

    // 정합성 보장을 위한 동기화 Ref
    const scoreRef = useRef(0);
    const remainingTilesRef = useRef(BOARD_CONFIG.tileCount);
    const maxComboRef = useRef(0);
    const timeLeftRef = useRef(BOARD_CONFIG.initialTime);

    // 결과창 고정 스냅샷 (타임오버/클리어 순간의 수치를 불변으로 보존)
    const [resultSummary, setResultSummary] = useState({
        finalScore: 0,
        timeBonus: 0,
        timeLeft: 0,
        clearedTiles: 0,
        remainingTiles: BOARD_CONFIG.tileCount,
        maxCombo: 0
    });

    useEffect(() => {
        scoreRef.current = score;
    }, [score]);
    useEffect(() => {
        remainingTilesRef.current = remainingTiles;
    }, [remainingTiles]);
    useEffect(() => {
        maxComboRef.current = maxCombo;
    }, [maxCombo]);
    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    // 게임 초기화
    const initGame = useCallback(() => {
        clearTimeout(comboTimerRef.current);
        clearTimeout(laserTimeoutRef.current);
        clearTimeout(shakeTimeoutRef.current);

        const currentLandscape = typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
        isLandscapeRef.current = currentLandscape;
        const newBoard = createGameBoard(currentLandscape);

        setBoard(newBoard);
        setSelectedPos(null);
        setShakingPos(null);
        setHintPair(null);
        setMatchedKeys(new Set());
        setLaserPath(null);
        setTimeLeft(BOARD_CONFIG.initialTime);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setHintCount(3);
        setShuffleCount(3);
        setRemainingTiles(BOARD_CONFIG.tileCount);
        setGameState('PLAYING');
        setIsResultModalOpen(false);
        startTimeRef.current = Date.now();

        // Ref 초기화
        scoreRef.current = 0;
        remainingTilesRef.current = BOARD_CONFIG.tileCount;
        maxComboRef.current = 0;
        timeLeftRef.current = BOARD_CONFIG.initialTime;

        setGameSessionId(prev => prev + 1);
    }, []);

    // 인트로 카운트다운 완료 후 게임 시작
    const handleStartAfterCountdown = useCallback(() => {
        setShowOverlay(false);
        initGame();
    }, [initGame]);

    // 창 크기 변경 시 PC(가로)/모바일(세로) 자동 전환
    useEffect(() => {
        const handleResize = () => {
            const nowLandscape = window.innerWidth >= 768;
            if (isLandscapeRef.current !== nowLandscape) {
                isLandscapeRef.current = nowLandscape;
                initGame();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initGame]);

    // 마운트 시 시작 시간 기록 및 언마운트 시 타임아웃 정리
    useEffect(() => {
        return () => {
            clearTimeout(comboTimerRef.current);
            clearTimeout(laserTimeoutRef.current);
            clearTimeout(shakeTimeoutRef.current);
        };
    }, []);

    // 타이머 인터벌 (순수 120초 카운트다운)
    useEffect(() => {
        if (gameState !== 'PLAYING') {
            return;
        }

        startTimeRef.current = Date.now();
        const duration = BOARD_CONFIG.initialTime;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const remaining = Math.max(0, duration - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                setGameState('GAMEOVER');

                const currentRemaining = remainingTilesRef.current;
                const currentScore = scoreRef.current;
                const currentMaxCombo = maxComboRef.current;

                setResultSummary({
                    finalScore: currentScore,
                    timeBonus: 0,
                    timeLeft: 0,
                    clearedTiles: BOARD_CONFIG.tileCount - currentRemaining,
                    remainingTiles: currentRemaining,
                    maxCombo: currentMaxCombo
                });

                setIsResultModalOpen(true);
                gameSound.playMismatch();

                // 로그인 회원인 경우에만 리더보드 점수 등록
                if (user) {
                    arcadeApi.submitScore('sichuan', {
                        score: currentScore,
                        clearTimeSec: 120,
                        user
                    });
                }
            }
        }, 500);

        return () => clearInterval(interval);
    }, [gameState, gameSessionId, user]);

    // 사운드 토글
    const handleToggleSound = useCallback(() => {
        const muted = gameSound.toggleMute();
        setIsMuted(muted);
    }, []);

    // 게임 클리어 처리 (정확한 점수 및 타일 정합성 보장)
    const handleGameClear = useCallback((currentTotalScore, currentMaxCombo) => {
        clearTimeout(comboTimerRef.current);
        setGameState('CLEARED');

        const currentTimeLeft = timeLeftRef.current;
        const timeBonus = currentTimeLeft * 30;
        const finalScore = currentTotalScore + timeBonus;
        setScore(finalScore);

        // 클리어 결과 스냅샷
        setResultSummary({
            finalScore,
            timeBonus,
            timeLeft: currentTimeLeft,
            clearedTiles: BOARD_CONFIG.tileCount,
            remainingTiles: 0,
            maxCombo: currentMaxCombo
        });

        setIsResultModalOpen(true);

        // 트로피 산정 (144개 타일 기준)
        const trophy = calculateTrophy(finalScore, currentTimeLeft, currentMaxCombo);
        setAwardedTrophy(trophy);
        gameSound.playTrophy();

        // 최고 기록 갱신 및 저장
        const clearTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        const isNewScore = finalScore > highScore.score;

        // 로그인 회원인 경우에만 최고 기록 갱신 및 리더보드 점수 등록
        if (user) {
            if (isNewScore) {
                setHighScore(prev => ({
                    ...prev,
                    score: finalScore,
                    clearTime: Math.min(prev.clearTime, clearTimeSec)
                }));
                if (highScore.score > 0) {
                    toast.success('최고 점수를 갱신했습니다!');
                }
            }

            arcadeApi.submitScore('sichuan', {
                score: finalScore,
                clearTimeSec,
                user
            }).catch(err => console.error('[SichuanGame] 점수 등록 실패:', err));
        }
    }, [highScore, user]);

    // 타일 클릭 처리
    const handleTileClick = useCallback((r, c) => {
        if (gameState !== 'PLAYING' || !board) return;
        const clickedTile = board[r]?.[c];
        if (!clickedTile) return;

        // 같은 타일 다시 클릭 -> 깔끔하게 선택 해제
        if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
            setSelectedPos(null);
            return;
        }

        // 첫 번째 타일 선택
        if (!selectedPos) {
            setSelectedPos({ r, c });
            setHintPair(null);
            gameSound.playSelect();
            if (navigator.vibrate) navigator.vibrate(12);
            return;
        }

        // 두 번째 타일 선택 -> 사천성 매칭 검사
        const startPos = selectedPos;
        const endPos = { r, c };
        const path = findSichuanPath(board, startPos, endPos);

        if (path) {
            // 매칭 성공!
            const matchedTile = clickedTile;
            const newCombo = combo + 1;
            const newMaxCombo = Math.max(maxCombo, newCombo);
            setCombo(newCombo);
            setMaxCombo(newMaxCombo);
            maxComboRef.current = newMaxCombo;

            // 점수 계산: 기본 100점 + 콤보 보너스
            const addedScore = 100 + (newCombo - 1) * 50;
            const currentTotalScore = score + addedScore;
            setScore(currentTotalScore);
            scoreRef.current = currentTotalScore;

            // 효과음 및 햅틱 피드백
            gameSound.playMatch(newCombo);
            if (navigator.vibrate) navigator.vibrate([15, 25, 15]);

            // 레이저 선 표시
            setLaserColor(matchedTile.color || '#3B82F6');
            setLaserPath(path);
            clearTimeout(laserTimeoutRef.current);
            laserTimeoutRef.current = setTimeout(() => {
                setLaserPath(null);
            }, 220);

            // 타일 소멸 처리
            const key1 = `${startPos.r}_${startPos.c}`;
            const key2 = `${endPos.r}_${endPos.c}`;
            setMatchedKeys(prev => new Set([...prev, key1, key2]));

            const newBoard = board.map(row => [...row]);
            newBoard[startPos.r][startPos.c] = null;
            newBoard[endPos.r][endPos.c] = null;
            setBoard(newBoard);
            setSelectedPos(null);
            setHintPair(null);

            // 실제 보드에 남아있는 타일 수 계산
            const newRemaining = newBoard.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
            setRemainingTiles(newRemaining);
            remainingTilesRef.current = newRemaining;

            // 콤보 타이머 갱신 (3초 이내 다음 매칭 없으면 리셋)
            clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => {
                setCombo(0);
            }, 3000);

            // 전부 클리어했는지 검사
            if (newRemaining <= 0) {
                handleGameClear(currentTotalScore, newMaxCombo);
            } else {
                setTimeout(() => {
                    if (!hasAvailableMoves(newBoard)) {
                        toast('더 이상 맞출 수 있는 패가 없어 보드를 자동으로 섞습니다.', {
                            style: {
                                borderRadius: '12px',
                                background: '#1e293b',
                                color: '#fff'
                            }
                        });
                        gameSound.playShuffle();
                        setBoard(shuffleBoard(newBoard));
                    }
                }, 250);
            }
        } else {
            // 오답 처리
            gameSound.playMismatch();
            if (navigator.vibrate) navigator.vibrate(40);
            setShakingPos({ r, c });
            clearTimeout(shakeTimeoutRef.current);
            shakeTimeoutRef.current = setTimeout(() => {
                setShakingPos(null);
            }, 300);

            setSelectedPos(null);
        }
    }, [board, combo, gameState, handleGameClear, maxCombo, score, selectedPos]);

    // 셔플 사용
    const handleShuffleBoard = useCallback(() => {
        if (gameState !== 'PLAYING' || shuffleCount <= 0 || !board) return;
        setShuffleCount(prev => prev - 1);
        setSelectedPos(null);
        setHintPair(null);
        gameSound.playShuffle();
        const shuffled = shuffleBoard(board);
        setBoard(shuffled);
        toast.success('보드를 새롭게 섞었습니다!', { duration: 1200 });
    }, [board, gameState, shuffleCount]);

    // 힌트 사용
    const handleUseHint = useCallback(() => {
        if (gameState !== 'PLAYING' || hintCount <= 0 || !board) return;
        const match = findAvailableMatch(board);
        if (match) {
            setHintCount(prev => prev - 1);
            setHintPair(match);
            gameSound.playHint();
            toast.success('매칭 가능한 한 쌍을 찾았습니다!', { duration: 1500 });
        } else {
            toast('맞출 수 있는 패가 없어 보드를 섞습니다.');
            handleShuffleBoard();
        }
    }, [board, gameState, handleShuffleBoard, hintCount]);

    return (
        <div className="relative w-full h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] mt-16 bg-base text-primary px-2 py-1 sm:py-2 flex flex-col items-center justify-between select-none overflow-hidden touch-manipulation">
            {/* 시작 전 READY... GO! 오버레이 */}
            {showOverlay && (
                <GameStartOverlay
                    title="PS 트로피 사천성"
                    subtitle="144개의 PlayStation 상징 타일을 2회 꺾임 경로로 맞추는 타임어택 챌린지"
                    badgeText="120s 타임어택"
                    badgeColor="bg-ps-blue"
                    timeLimit={120}
                    highScore={highScore.score}
                    instructions={[
                        "2번 이하로 꺾이는 선으로 연결 가능한 동일 모양의 타일 2개를 짝지으세요.",
                        "연속 매칭 시 콤보 배수가 증가하여 높은 추가 점수를 얻습니다.",
                        "패가 막히면 힌트(3회)나 셔플(3회)을 활용하고, 트로피 최고 등급에 도전하세요!"
                    ]}
                    onStart={handleStartAfterCountdown}
                    onBack={onBack}
                />
            )}

            {/* PlayStation 배경 워터마크 */}
            <div className="absolute top-8 right-6 pointer-events-none flex gap-6 rotate-12 scale-110 opacity-[0.02] dark:opacity-[0.03] text-primary">
                <Triangle className="w-32 h-32 stroke-[2px]" />
                <Circle className="w-32 h-32 stroke-[2px]" />
                <CrossIcon className="w-32 h-32 stroke-[2px]" />
                <Square className="w-32 h-32 stroke-[2px]" />
            </div>

            {/* 트로피 팝업 알림 */}
            <TrophyNotification trophy={awardedTrophy} onClose={() => setAwardedTrophy(null)} />

            {/* 상단 헤더 & 대시보드 */}
            <header className="w-full max-w-md md:max-w-4xl lg:max-w-5xl shrink-0 flex flex-col gap-1.5 z-10">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-hover mr-1"
                            title="아케이드 홈으로"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">홈</span>
                        </button>

                        <span className="p-1.5 rounded-lg bg-ps-blue text-white shadow-sm">
                            <Trophy className="w-4 h-4" />
                        </span>
                        <h1 className="text-sm sm:text-base font-black italic tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-ps-blue">
                            PS 트로피 사천성 <span className="text-xs font-normal not-italic text-secondary">({remainingTiles}개 남음)</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleToggleSound}
                            className="p-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary transition-colors touch-manipulation"
                            title={isMuted ? '음소거 해제' : '음소거'}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-ps-blue" />}
                        </button>
                        <button
                            onClick={initGame}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary transition-colors text-xs font-bold touch-manipulation"
                            title="다시하기"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">다시하기</span>
                        </button>
                    </div>
                </div>

                {/* 대시보드 (시간, 점수, 콤보 + 힌트/셔플) */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-surface/90 backdrop-blur-md border border-divider p-1.5 sm:p-2 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        {/* 타이머 */}
                        <div className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 sm:px-3 py-1 rounded-xl border transition-all whitespace-nowrap ${
                            timeLeft <= 20
                                ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse font-black'
                                : 'bg-base border-divider text-primary'
                        }`}>
                            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-secondary font-bold whitespace-nowrap">
                                <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-ps-blue shrink-0" />
                                <span>시간</span>
                            </div>
                            <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap">{timeLeft}s</span>
                        </div>

                        {/* 점수 */}
                        <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-1 sm:px-3 py-1 rounded-xl bg-base border border-divider whitespace-nowrap">
                            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-secondary font-bold whitespace-nowrap">
                                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 shrink-0" />
                                <span>점수</span>
                            </div>
                            <span className="text-xs sm:text-sm font-black text-primary tracking-tight whitespace-nowrap">
                                {score.toLocaleString()}
                            </span>
                        </div>

                        {/* 콤보 */}
                        <div className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 sm:px-3 py-1 rounded-xl border transition-all whitespace-nowrap ${
                            combo >= 2
                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 font-black'
                                : 'bg-base border-divider text-secondary'
                        }`}>
                            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                                <Flame className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${combo >= 2 ? 'text-amber-500 animate-bounce' : 'text-secondary'}`} />
                                <span>콤보</span>
                            </div>
                            <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap">
                                {combo > 0 ? `x${combo}!` : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* 힌트 버튼 */}
                        <button
                            onClick={handleUseHint}
                            disabled={hintCount <= 0 || gameState !== 'PLAYING'}
                            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-bold text-xs sm:text-sm transition-all active:scale-95 touch-manipulation shadow-sm whitespace-nowrap ${
                                hintCount > 0
                                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25'
                                    : 'opacity-40 border-divider text-muted cursor-not-allowed'
                            }`}
                        >
                            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 shrink-0" />
                            <span>힌트</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-[10px] sm:text-[11px] font-black text-yellow-600 dark:text-yellow-400">
                                {hintCount}
                            </span>
                        </button>

                        {/* 셔플 버튼 */}
                        <button
                            onClick={handleShuffleBoard}
                            disabled={shuffleCount <= 0 || gameState !== 'PLAYING'}
                            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-bold text-xs sm:text-sm transition-all active:scale-95 touch-manipulation shadow-sm whitespace-nowrap ${
                                shuffleCount > 0
                                    ? 'bg-blue-500/15 border-blue-500/40 text-ps-blue hover:bg-blue-500/25'
                                    : 'opacity-40 border-divider text-muted cursor-not-allowed'
                            }`}
                        >
                            <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ps-blue shrink-0" />
                            <span>셔플</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[10px] sm:text-[11px] font-black text-ps-blue">
                                {shuffleCount}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 게이지 바 */}
                <div className="w-full h-1 bg-divider rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                            timeLeft <= 20
                                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                                : 'bg-gradient-to-r from-ps-blue to-cyan-400'
                        }`}
                        style={{ width: `${(timeLeft / 120) * 100}%` }}
                    />
                </div>
            </header>

            {/* 메인 게임 보드 */}
            <main className="w-full flex-1 flex items-center justify-center min-h-0 my-0.5 sm:my-1 overflow-hidden">
                <SichuanBoard
                    board={board}
                    selectedPos={selectedPos}
                    shakingPos={shakingPos}
                    hintPair={hintPair}
                    matchedKeys={matchedKeys}
                    laserPath={laserPath}
                    laserColor={laserColor}
                    onTileClick={handleTileClick}
                />
            </main>

            {/* 하단 푸터 */}
            <footer className="w-full max-w-md md:max-w-4xl lg:max-w-5xl shrink-0 px-2 py-0.5 flex items-center justify-between text-[11px] text-secondary whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Award className="w-3.5 h-3.5 text-ps-blue shrink-0" />
                    <span>최고 기록: <strong className="text-primary font-bold">{highScore.score.toLocaleString()}P</strong></span>
                </div>
                <button
                    onClick={() => onOpenLeaderboard && onOpenLeaderboard('sichuan')}
                    className="hover:text-primary underline cursor-pointer font-bold text-ps-blue whitespace-nowrap"
                >
                    명예의 전당 보기
                </button>
            </footer>

            {/* 결과 모달 */}
            {isResultModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-surface border border-divider rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-ps-blue/20 border border-ps-blue/40 flex items-center justify-center text-ps-blue mb-4">
                            <Trophy className="w-9 h-9" />
                        </div>

                        <h3 className="text-2xl font-black text-primary mb-1 whitespace-nowrap">
                            {gameState === 'CLEARED' ? '보드 올 클리어!' : '타임오버!'}
                        </h3>
                        <p className="text-xs text-secondary mb-6 whitespace-nowrap">
                            {gameState === 'CLEARED'
                                ? '축하합니다! 모든 패를 성공적으로 맞췄습니다.'
                                : '120초의 제한 시간이 종료되었습니다.'}
                        </p>

                        <div className="w-full bg-base border border-divider rounded-2xl p-4 mb-4 flex flex-col gap-2.5 text-xs">
                            <div className="flex items-center justify-between whitespace-nowrap">
                                <span className="text-secondary font-bold">최종 점수</span>
                                <span className="text-lg font-black text-ps-blue">
                                    {resultSummary.finalScore.toLocaleString()}P
                                </span>
                            </div>
                            <div className="flex items-center justify-between whitespace-nowrap">
                                <span className="text-secondary font-bold">제거한 패</span>
                                <span className="text-sm font-bold text-primary">
                                    {resultSummary.clearedTiles} / {BOARD_CONFIG.tileCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between whitespace-nowrap">
                                <span className="text-secondary font-bold">최대 콤보</span>
                                <span className="text-sm font-bold text-amber-500">
                                    {resultSummary.maxCombo} 콤보
                                </span>
                            </div>
                        </div>

                        {/* 로그인 상태별 리더보드 안내 배너 */}
                        {user ? (
                            <div className="w-full py-2.5 px-3.5 mb-5 rounded-2xl bg-ps-blue/10 border border-ps-blue/25 text-xs text-ps-blue font-bold flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <Trophy className="w-4 h-4 text-ps-blue shrink-0" />
                                <span>명예의 전당에 점수가 자동 등록되었습니다!</span>
                            </div>
                        ) : (
                            <div className="w-full p-3.5 mb-5 rounded-2xl bg-surface-hover/80 border border-divider text-left flex flex-col gap-2.5">
                                <div className="flex items-start gap-2">
                                    <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-secondary leading-relaxed">
                                        <strong className="text-primary block font-bold mb-0.5">기록을 영구 보존하시겠습니까?</strong>
                                        로그인하시면 지금 달성한 {resultSummary.finalScore.toLocaleString()}점을 명예의 전당에 영구 기록할 수 있습니다.
                                    </div>
                                </div>
                                {openLoginModal && (
                                    <button
                                        onClick={() => {
                                            setIsResultModalOpen(false);
                                            openLoginModal();
                                        }}
                                        className="w-full py-2.5 rounded-xl bg-ps-blue hover:bg-blue-600 text-white font-bold text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-1"
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
                                    setIsResultModalOpen(false);
                                    if (onOpenLeaderboard) onOpenLeaderboard('sichuan');
                                }}
                                className="flex-1 py-3 rounded-xl bg-surface border border-divider text-primary font-bold text-xs hover:bg-surface-hover transition-colors"
                            >
                                랭킹 보기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SichuanGame);
