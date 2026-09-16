import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Heart,
    Trophy,
    Sparkles,
    RotateCcw,
    ArrowLeft,
    Volume2,
    VolumeX,
    Play,
    Pause,
    Shield,
    Flame,
    Zap,
    Crown
} from 'lucide-react';
import GameStartOverlay from './GameStartOverlay';
import { gameSound } from '../../utils/gameSound';
import { arcadeApi } from '../../api/arcadeApi';

// 4대 심볼 정의 및 구간 설정 (500m 단위 최적 밸런스)
const EVOLUTION_STAGES = [
    {
        form: 'SQUARE',
        name: 'PS 스퀘어',
        symbol: '■',
        minDistance: 0,
        maxDistance: 500, // 500m까지
        color: '#00d4ff', // PS Cyan
        bgGradient: 'from-blue-950/40 via-slate-900 to-black',
        jumpStrength: -12.5,
        gravity: 0.65,
        maxJumps: 1,
        desc: '기본 1단 점프 / 안정 주행'
    },
    {
        form: 'CIRCLE',
        name: 'PS 서클',
        symbol: '●',
        minDistance: 500,
        maxDistance: 1000, // 1,000m까지
        color: '#ff2a85', // PS Magenta
        bgGradient: 'from-pink-950/40 via-slate-900 to-black',
        jumpStrength: -12.2,
        gravity: 0.58,
        maxJumps: 1,
        desc: '부드러운 구르기 & 체공 안정성'
    },
    {
        form: 'TRIANGLE',
        name: 'PS 트라이앵글',
        symbol: '▲',
        minDistance: 1000,
        maxDistance: 1500, // 1,500m까지
        color: '#ffd700', // Gold Yellow
        bgGradient: 'from-amber-950/40 via-slate-900 to-black',
        jumpStrength: -11.8,
        gravity: 0.62,
        maxJumps: 2, // 2단 점프 활성화
        desc: '2단 점프(Double Jump) 해금'
    },
    {
        form: 'CROSS',
        name: 'PS 크로스 피버',
        symbol: '✖',
        minDistance: 1500,
        maxDistance: Infinity, // 1,500m 이상
        color: '#a855f7', // Purple Fever
        bgGradient: 'from-purple-950/50 via-slate-900 to-black',
        jumpStrength: -12.2,
        gravity: 0.62,
        maxJumps: 2,
        desc: '코인 자석 흡수 + 1회 보호 쉴드'
    }
];

const NeonRunGame = ({
    user = null,
    isAuthenticated = false,
    initialBestScore = 0,
    onBack,
    onOpenLeaderboard,
    openLoginModal
}) => {
    // 게임 캔버스 및 루프 참조
    const canvasRef = useRef(null);
    const animFrameIdRef = useRef(null);

    // 사운드 음소거 상태
    const [isMuted, setIsMuted] = useState(() => gameSound.getMuted());

    // 인트로 브리핑 오버레이 상태 (GameStartOverlay 연동)
    const [showOverlay, setShowOverlay] = useState(true);

    // 게임 상태: 'READY' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    const [gameState, setGameState] = useState('READY');

    // 실시간 HUD 표시용 React 상태 (0.1초마다 동기화)
    const [hudData, setHudData] = useState({
        distance: 0,
        score: 0,
        hearts: 3,
        combo: 1,
        stageIndex: 0,
        form: 'SQUARE',
        hasShield: false
    });

    // 최고 기록
    const [bestScore, setBestScore] = useState(initialBestScore);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [myRank, setMyRank] = useState(null);

    // 게임 종료 통계
    const [gameOverStats, setGameOverStats] = useState({
        score: 0,
        distance: 0,
        coins: 0,
        trophies: 0,
        clearTimeSec: 0
    });

    // 팝업 알림 (진화, 구출 등 대형 이벤트 전용)
    const [bannerAlert, setBannerAlert] = useState(null);
    const bannerTimeoutRef = useRef(null);

    const showBanner = (text, color = '#00d4ff') => {
        setBannerAlert({ text, color });
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = setTimeout(() => {
            setBannerAlert(null);
        }, 1400);
    };

    // 음소거 토글
    const handleToggleMute = () => {
        const next = gameSound.toggleMute();
        setIsMuted(next);
        if (next) {
            gameSound.stopNeonBeat();
        } else if (gameState === 'PLAYING') {
            gameSound.startNeonBeat(116);
        }
    };

    // =========================================================================
    // 🕹️ 순수 캔버스 물리 & 게임플레이 엔진 (React 렌더링 사이클과 분리)
    // =========================================================================
    const worldRef = useRef({
        canvasWidth: 960,
        canvasHeight: 540,
        scrollX: 0,
        baseSpeed: 7.2,
        speed: 7.2,
        maxSpeed: 14.5,
        distanceMeters: 0,
        score: 0,
        combo: 1,
        hearts: 3,
        maxHearts: 3,
        startTime: 0,
        coinsCollected: 0,
        trophiesCollected: 0,
        hasShield: false,
        stageIndex: 0,
        isGameOver: false,
        gameOverTime: 0, // 게임오버 발생 시각 (재시작 쿨다운용)
        jumpBuffer: 0, // 점프 선입력 버퍼 (착지 직전 선입력 허용)
        hudTimer: 0,
        hitFlash: 0, // 피격 시 화면 붉은 점멸 타이머

        // 플레이어 캐릭터 (정방형 34x34)
        player: {
            x: 140,
            y: 400,
            size: 34,
            vy: 0,
            isGrounded: false,
            rotation: 0,
            jumpCount: 0,
            maxJumps: 1,
            invincibleTimer: 0,
            trail: []
        },

        // 지형 플랫폼들: [{ x, y, w, h }]
        platforms: [],
        // 장애물들: [{ x, y, w, h, type: 'SPIKE' }]
        obstacles: [],
        // 수집 아이템: [{ x, y, type: 'COIN' | 'TROPHY' | 'JUMP_GEM', symbol: '▲'|'●'|'✖'|'■' }]
        items: [],
        // 파티클: [{ x, y, vx, vy, color, life, maxLife, size }]
        particles: [],
        // 텍스트 플로팅 이펙트: [{ x, y, text, color, life, maxLife }]
        floatingTexts: [],
        // 세이프티 트랙터 빔 구출 연출 활성 여부
        rescueEffect: null, // { x, y, targetY, timer, maxTimer }
        // 화면 흔들림 효과
        screenShake: 0
    });

    // 안전 지형 청크 생성 로직 (500m 단위 난이도 & 공 튀기기 점프 젬 탑재)
    const generateNextChunk = useCallback((world, startX) => {
        const stage = world.stageIndex;
        const groundY = 440;
        const platformHeight = 100;

        // 패턴 템플릿 풀
        const pool = [];

        // 1. [기본] 평지 + 정렬된 코인 행렬 (러닝 리듬감)
        const patternFlat = () => {
            const w = 460;
            world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
            for (let i = 0; i < 4; i++) {
                world.items.push({
                    x: startX + 120 + i * 60,
                    y: groundY - 45,
                    type: 'COIN',
                    symbol: ['■', '●', '▲', '✖'][i % 4]
                });
            }
            return w;
        };

        // 2. [기본] 단일 네온 스파이크 점프 (정직한 가시 1개 + 점프 유도 코인 아치)
        const patternSingleSpike = () => {
            const w = 480;
            world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
            world.obstacles.push({
                x: startX + 230,
                y: groundY - 34,
                w: 26,
                h: 34,
                type: 'SPIKE'
            });
            world.items.push({ x: startX + 170, y: groundY - 55, type: 'COIN', symbol: '▲' });
            world.items.push({ x: startX + 243, y: groundY - 105, type: 'COIN', symbol: '●' });
            world.items.push({ x: startX + 316, y: groundY - 55, type: 'COIN', symbol: '■' });
            return w;
        };

        // 3. [기본] 안전 낭떠러지 점프 (140px 갭) + 낭떠러지 위 가이드 코인
        const patternGap = () => {
            const w1 = 220;
            const gap = 140;
            const w2 = 240;
            world.platforms.push({ x: startX, y: groundY, w: w1, h: platformHeight });
            world.platforms.push({ x: startX + w1 + gap, y: groundY, w: w2, h: platformHeight });

            world.items.push({ x: startX + w1 + 35, y: groundY - 60, type: 'COIN', symbol: '■' });
            world.items.push({ x: startX + w1 + 70, y: groundY - 90, type: 'COIN', symbol: '▲' });
            world.items.push({ x: startX + w1 + 105, y: groundY - 60, type: 'COIN', symbol: '✖' });
            return w1 + gap + w2;
        };

        // 4. [선택지] 상단 공중 발판 (아래는 가시, 위는 안전 고공 발판 & 트로피)
        const patternUpperPlatform = () => {
            const w = 560;
            world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
            world.obstacles.push({
                x: startX + 270,
                y: groundY - 34,
                w: 26,
                h: 34,
                type: 'SPIKE'
            });

            world.platforms.push({
                x: startX + 180,
                y: groundY - 95,
                w: 220,
                h: 16
            });

            world.items.push({ x: startX + 130, y: groundY - 60, type: 'COIN', symbol: '▲' });

            if (Math.random() < 0.35) {
                world.items.push({
                    x: startX + 290,
                    y: groundY - 130,
                    type: 'TROPHY'
                });
            } else {
                world.items.push({ x: startX + 250, y: groundY - 125, type: 'COIN', symbol: '●' });
                world.items.push({ x: startX + 330, y: groundY - 125, type: 'COIN', symbol: '■' });
            }
            return w;
        };

        // 1단계 (0~500m): 기본 패턴들 중심
        if (stage === 0) {
            pool.push(patternFlat, patternSingleSpike, patternGap, patternUpperPlatform);
        }

        // 2단계 (500~1000m, PS 서클): 롱점프 체공 & 공중 점프 젬 도입
        if (stage >= 1) {
            // 5. 2연속 스파이크 (체공 롱점프 필수!)
            pool.push(() => {
                const w = 500;
                world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
                world.obstacles.push({ x: startX + 210, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.obstacles.push({ x: startX + 242, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.items.push({ x: startX + 150, y: groundY - 55, type: 'COIN', symbol: '●' });
                world.items.push({ x: startX + 226, y: groundY - 110, type: 'COIN', symbol: '●' });
                world.items.push({ x: startX + 300, y: groundY - 55, type: 'COIN', symbol: '●' });
                return w;
            });

            // 6. 낭떠러지 후 즉시 가시
            pool.push(() => {
                const w1 = 200;
                const gap = 150;
                const w2 = 280;
                world.platforms.push({ x: startX, y: groundY, w: w1, h: platformHeight });
                world.platforms.push({ x: startX + w1 + gap, y: groundY, w: w2, h: platformHeight });
                
                world.obstacles.push({
                    x: startX + w1 + gap + 70,
                    y: groundY - 34,
                    w: 26,
                    h: 34,
                    type: 'SPIKE'
                });

                world.items.push({ x: startX + w1 + 75, y: groundY - 80, type: 'COIN', symbol: '■' });
                world.items.push({ x: startX + w1 + gap + 83, y: groundY - 100, type: 'COIN', symbol: '▲' });
                return w1 + gap + w2;
            });

            // 7. [공 튀기기 기믹!] 180px 낭떠러지 + 중앙 공중 점프 젬 (공중 도약 학습)
            pool.push(() => {
                const w1 = 180;
                const gap = 180;
                const w2 = 240;
                world.platforms.push({ x: startX, y: groundY, w: w1, h: platformHeight });
                world.platforms.push({ x: startX + w1 + gap, y: groundY, w: w2, h: platformHeight });

                // 낭떠러지 한가운데 공중에 뜬 네온 점프 젬!
                world.items.push({
                    x: startX + w1 + 90,
                    y: groundY - 85,
                    type: 'JUMP_GEM'
                });

                world.items.push({ x: startX + w1 + 35, y: groundY - 60, type: 'COIN', symbol: '●' });
                world.items.push({ x: startX + w1 + 145, y: groundY - 60, type: 'COIN', symbol: '●' });
                return w1 + gap + w2;
            });
        }

        // 3단계 (1000~1500m, PS 트라이앵글 2단 점프 해금): 본격 고난도 피지컬
        if (stage >= 2) {
            // 8. 3연속 스파이크 (2단 점프 최고점 넘기)
            pool.push(() => {
                const w = 540;
                world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
                world.obstacles.push({ x: startX + 190, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.obstacles.push({ x: startX + 222, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.obstacles.push({ x: startX + 254, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.items.push({ x: startX + 222, y: groundY - 125, type: 'COIN', symbol: '▲' });
                return w;
            });

            // 9. 2단 점프 전용 230px 광폭 낭떠러지 + 고공 황금 트로피
            pool.push(() => {
                const w1 = 200;
                const gap = 230;
                const w2 = 260;
                world.platforms.push({ x: startX, y: groundY, w: w1, h: platformHeight });
                world.platforms.push({ x: startX + w1 + gap, y: groundY, w: w2, h: platformHeight });

                world.items.push({ x: startX + w1 + 45, y: groundY - 70, type: 'COIN', symbol: '▲' });
                world.items.push({ x: startX + w1 + 115, y: groundY - 130, type: 'TROPHY' });
                world.items.push({ x: startX + w1 + 185, y: groundY - 70, type: 'COIN', symbol: '▲' });
                return w1 + gap + w2;
            });

            // 10. 상단 공중 발판 위 점프 젬 ➔ 2단 점프로 고공 황금 트로피 낚아채기
            pool.push(() => {
                const w = 600;
                world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
                world.obstacles.push({ x: startX + 280, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.platforms.push({ x: startX + 200, y: groundY - 95, w: 220, h: 16 });

                world.items.push({ x: startX + 240, y: groundY - 135, type: 'JUMP_GEM' });
                world.items.push({ x: startX + 340, y: groundY - 170, type: 'TROPHY' });
                return w;
            });
        }

        // 4단계 (1500m+, PS 크로스 피버): 초고속 하이퍼 챌린지 (싱거운 초반 패턴 제외!)
        if (stage >= 3) {
            // 11. [익스트림] 4연속 스파이크 + 중앙 공중 점프 젬 (공 튀기기 바운스로 화려한 돌파!)
            pool.push(() => {
                const w = 580;
                world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
                world.obstacles.push({ x: startX + 180, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.obstacles.push({ x: startX + 210, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.obstacles.push({ x: startX + 240, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });
                world.obstacles.push({ x: startX + 270, y: groundY - 34, w: 26, h: 34, type: 'SPIKE' });

                // 4연속 가시 정중앙 높은 곳에 점프 젬 배치 (1단 점프 ➔ 젬 밟고 퐁-! ➔ 2단 점프로 우아하게 통과)
                world.items.push({
                    x: startX + 225,
                    y: groundY - 105,
                    type: 'JUMP_GEM'
                });
                world.items.push({ x: startX + 350, y: groundY - 60, type: 'COIN', symbol: '✖' });
                return w;
            });

            // 12. [익스트림] 3연속 낭떠러지 징검다리 (리드미컬 연속 점프)
            pool.push(() => {
                const w1 = 160;
                const gap1 = 130;
                const step1 = 140;
                const gap2 = 130;
                const w2 = 220;
                world.platforms.push({ x: startX, y: groundY, w: w1, h: platformHeight });
                world.platforms.push({ x: startX + w1 + gap1, y: groundY, w: step1, h: platformHeight });
                world.platforms.push({ x: startX + w1 + gap1 + step1 + gap2, y: groundY, w: w2, h: platformHeight });

                world.items.push({ x: startX + w1 + 65, y: groundY - 70, type: 'COIN', symbol: '✖' });
                world.items.push({ x: startX + w1 + gap1 + 70, y: groundY - 45, type: 'COIN', symbol: '✖' });
                world.items.push({ x: startX + w1 + gap1 + step1 + 65, y: groundY - 70, type: 'COIN', symbol: '✖' });
                return w1 + gap1 + step1 + gap2 + w2;
            });

            // 13. [익스트림] 상단 2층 발판 기습 가시 트랩
            pool.push(() => {
                const w = 620;
                world.platforms.push({ x: startX, y: groundY, w, h: platformHeight });
                world.platforms.push({ x: startX + 180, y: groundY - 95, w: 260, h: 16 });

                // 2층 발판 중간에 소점프 전용 가시 배치
                world.obstacles.push({
                    x: startX + 310,
                    y: groundY - 95 - 34,
                    w: 26,
                    h: 34,
                    type: 'SPIKE'
                });

                world.items.push({ x: startX + 130, y: groundY - 60, type: 'COIN', symbol: '✖' });
                world.items.push({ x: startX + 310, y: groundY - 170, type: 'TROPHY' });
                world.items.push({ x: startX + 410, y: groundY - 130, type: 'COIN', symbol: '✖' });
                return w;
            });
        }

        // 단 1개의 템플릿만 무작위 선택하여 정확히 1회 실행!
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        return chosen();
    }, []);

    // 게임 초기화
    const resetGame = useCallback(() => {
        const world = worldRef.current;
        world.distanceMeters = 0;
        world.score = 0;
        world.combo = 1;
        world.hearts = 3;
        world.speed = world.baseSpeed;
        world.coinsCollected = 0;
        world.trophiesCollected = 0;
        world.hasShield = false;
        world.stageIndex = 0;
        world.startTime = Date.now();
        world.particles = [];
        world.floatingTexts = [];
        world.rescueEffect = null;
        world.screenShake = 0;
        world.isGameOver = false;
        world.jumpBuffer = 0;
        world.hitFlash = 0;

        // 플레이어 초기화 (정방형 34x34)
        world.player = {
            x: 140,
            y: 400,
            size: 34,
            vy: 0,
            isGrounded: true,
            rotation: 0,
            jumpCount: 0,
            maxJumps: 1,
            invincibleTimer: 0,
            trail: []
        };

        // 초기 시작 발판 (처음 800px 안전 직선 구간)
        world.platforms = [
            { x: 0, y: 440, w: 900, h: 100 }
        ];
        world.obstacles = [];
        world.items = [
            { x: 350, y: 395, type: 'COIN', symbol: '■' },
            { x: 450, y: 395, type: 'COIN', symbol: '●' },
            { x: 550, y: 395, type: 'COIN', symbol: '▲' },
            { x: 650, y: 395, type: 'COIN', symbol: '✖' }
        ];

        // 앞쪽으로 2400px치 청크 사전 생성
        let currentX = 900;
        while (currentX < 2400) {
            const addedW = generateNextChunk(world, currentX);
            currentX += (addedW || 400);
        }

        setIsNewRecord(false);
        setGameState('PLAYING');
    }, [generateNextChunk]);

    // 인트로 카운트다운 완료 후 게임 시작
    const handleStartAfterCountdown = useCallback(() => {
        setShowOverlay(false);
        resetGame();
    }, [resetGame]);

    // 점프 입력 처리 (키 다운 / 터치 시작)
    const handleJump = useCallback(() => {
        if (showOverlay) return;
        const world = worldRef.current;
        if (gameState !== 'PLAYING') {
            if (gameState === 'READY') {
                resetGame();
            } else if (gameState === 'GAMEOVER') {
                // 사망 후 0.35초 쿨다운 경과 시 스페이스바/엔터로 즉시 재시작
                if (Date.now() - (world.gameOverTime || 0) > 350) {
                    resetGame();
                }
            } else if (gameState === 'PAUSED') {
                setGameState('PLAYING');
            }
            return;
        }

        const p = world.player;
        const currentStage = EVOLUTION_STAGES[world.stageIndex];

        // 1단 또는 2단 점프 가능한지 체크
        if (p.jumpCount < currentStage.maxJumps) {
            p.vy = currentStage.jumpStrength;
            p.isGrounded = false;
            p.jumpCount += 1;
            world.jumpBuffer = 0; // 버퍼 즉시 소비

            if (p.jumpCount === 1) {
                gameSound.playJump();
            } else {
                gameSound.playDoubleJump();
                // 2단 점프 발판 파티클
                for (let i = 0; i < 8; i++) {
                    world.particles.push({
                        x: p.x + p.size / 2,
                        y: p.y + p.size,
                        vx: (Math.random() - 0.5) * 6,
                        vy: Math.random() * 2 + 1,
                        color: currentStage.color,
                        life: 0.35,
                        maxLife: 0.35,
                        size: 4
                    });
                }
            }
        } else {
            // 공중에서 점프 소진 시: 착지 직전 선입력 버퍼링(약 130ms / 8프레임)
            world.jumpBuffer = 8;
        }
    }, [gameState, resetGame]);

    // 점프 키 뗐을 때 처리 (자연스러운 소점프 포물선: 천장에 쿵 부딪히는 느낌 없이 매끄럽게 정점 도달)
    const handleJumpRelease = useCallback(() => {
        const world = worldRef.current;
        if (gameState !== 'PLAYING') return;

        const p = world.player;
        // 인위적인 급감속(* 0.42) 대신 부드러운 상한 클램프(-4.8)로 매끄러운 자연 포물선 유지
        if (p.vy < -4.8) {
            p.vy = -4.8;
        }
    }, [gameState]);

    // 키보드 이벤트 리스너 (keydown: 점프 / keyup: 소점프 컷트 / Escape: 일시정지)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
                e.preventDefault();
                if (e.repeat) return; // 꾹 누르고 있을 때 브라우저 자동 연타 방지
                handleJump();
            } else if (e.code === 'Escape') {
                if (gameState === 'PLAYING') {
                    setGameState('PAUSED');
                } else if (gameState === 'PAUSED') {
                    setGameState('PLAYING');
                }
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                handleJumpRelease();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleJump, handleJumpRelease, gameState]);

    // 게임 오버 처리 & 백엔드 점수 등록
    const handleGameOver = useCallback(async () => {
        const world = worldRef.current;
        if (world.isGameOver) return; // 🔥 중복 호출 및 다중 점수 등록 방지
        world.isGameOver = true;
        world.gameOverTime = Date.now();
        setGameState('GAMEOVER');

        const finalScore = Math.floor(world.score);
        const finalDistance = Math.floor(world.distanceMeters);
        const clearTimeSec = Math.max(1, Math.floor((Date.now() - world.startTime) / 1000));

        setGameOverStats({
            score: finalScore,
            distance: finalDistance,
            coins: world.coinsCollected,
            trophies: world.trophiesCollected,
            clearTimeSec
        });

        // 최고 기록 경신 여부 확인
        if (finalScore > bestScore) {
            setBestScore(finalScore);
            setIsNewRecord(true);
            gameSound.playTrophy();
        } else {
            gameSound.playExplosion();
        }

        // 비트 사운드 정지
        gameSound.stopNeonBeat();

        // 로그인 유저의 경우 서버 DB에 점수 등록 (단 1회만 안전하게 전송)
        if (isAuthenticated && user) {
            try {
                const res = await arcadeApi.submitScore('neon_run', {
                    score: finalScore,
                    clearTimeSec,
                    user
                });
                if (res?.rank) {
                    setMyRank(res.rank);
                }
            } catch (err) {
                console.warn('[NeonRun] 점수 전송 실패:', err);
            }
        }
    }, [bestScore, isAuthenticated, user]);

    // BGM 비트 루퍼 라이프사이클 (게임 중 자동 시작 / 정지 및 언마운트 시 안전 종료)
    useEffect(() => {
        if (gameState === 'PLAYING' && !isMuted) {
            gameSound.startNeonBeat(116);
        } else {
            gameSound.stopNeonBeat();
        }
        return () => {
            gameSound.stopNeonBeat();
        };
    }, [gameState, isMuted]);

    // =========================================================================
    // 🎨 메인 60FPS 애니메이션 렌더링 루프
    // =========================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let lastTime = performance.now();

        const loop = (currentTime) => {
            animFrameIdRef.current = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
            lastTime = currentTime;

            if (gameState !== 'PLAYING' || worldRef.current.isGameOver) {
                // 일시정지나 레디, 게임오버 상태일 때 정적 렌더링
                renderScene(ctx, worldRef.current, 0);
                return;
            }

            // 1. 월드 업데이트
            updateWorld(worldRef.current, dt);

            // 2. 화면 그리기
            renderScene(ctx, worldRef.current, dt);
        };

        animFrameIdRef.current = requestAnimationFrame(loop);

        return () => {
            if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
        };
    }, [gameState]);

    // 월드 물리 & 상태 업데이트
    const updateWorld = (world, dt) => {
        if (world.isGameOver) return; // 🔥 게임오버 후 물리 연산 즉시 중단
        const p = world.player;
        const currentStage = EVOLUTION_STAGES[world.stageIndex];

        // 화면 흔들림 및 피격 플래시 감쇠
        if (world.screenShake > 0) {
            world.screenShake = Math.max(0, world.screenShake - dt * 25);
        }
        if (world.hitFlash > 0) {
            world.hitFlash = Math.max(0, world.hitFlash - dt * 2.5);
        }

        // BGM 비트 BPM 동적 연동 (러닝 속도가 빨라질수록 비트 템포도 신나게 가속!)
        gameSound.setNeonBeatBpm(114 + Math.floor((world.speed - world.baseSpeed) * 5));

        // 세이프티 트랙터 빔 구출 중인 경우 특별 처리
        if (world.rescueEffect) {
            world.rescueEffect.timer -= dt;
            // 플레이어를 안전 발판 위 공중으로 서서히 상승
            p.y += (world.rescueEffect.targetY - p.y) * 0.15;
            p.vy = 0;
            p.rotation += dt * 5;

            if (world.rescueEffect.timer <= 0) {
                world.rescueEffect = null;
                p.vy = -5; // 사뿐한 재도약
                p.isGrounded = false;
            }
            return;
        }

        // 스피드 및 거리 누적 (점진적 가속: 7.2m/s ~ 최대 13.5m/s)
        world.speed = Math.min(world.maxSpeed, world.baseSpeed + (world.distanceMeters / 250) * 1.5);
        const moveDist = world.speed * dt * 60;
        world.distanceMeters += moveDist * 0.045; // m 단위 누적
        world.score += moveDist * 0.8 * world.combo;

        // 심볼 단계 진화 체크 (300m, 600m, 900m)
        const nextStageIdx = EVOLUTION_STAGES.findIndex((st, idx) => {
            const next = EVOLUTION_STAGES[idx + 1];
            return world.distanceMeters >= st.minDistance && (!next || world.distanceMeters < next.minDistance);
        });

        if (nextStageIdx !== -1 && nextStageIdx !== world.stageIndex) {
            world.stageIndex = nextStageIdx;
            const newStage = EVOLUTION_STAGES[nextStageIdx];
            gameSound.playEvolution();
            showBanner(`FORM UPGRADE! ${newStage.name} (${newStage.symbol})`, newStage.color);
            world.screenShake = 6;

            if (newStage.form === 'CROSS') {
                world.hasShield = true;
            }

            // 진화 폭발 파티클
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 8 + 3;
                world.particles.push({
                    x: p.x + p.size / 2,
                    y: p.y + p.size / 2,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color: newStage.color,
                    life: 0.6,
                    maxLife: 0.6,
                    size: 6
                });
            }
        }

        // 중력 및 플레이어 이동
        p.vy += currentStage.gravity * dt * 60;
        p.y += p.vy * dt * 60;

        // 회전 애니메이션
        if (!p.isGrounded) {
            p.rotation += (currentStage.form === 'CIRCLE' ? 8 : 6) * dt;
        } else {
            // 바닥에서는 똑바로 정렬
            p.rotation += (0 - p.rotation) * 0.3;
        }

        // 무적 타이머 감소
        if (p.invincibleTimer > 0) {
            p.invincibleTimer -= dt;
        }

        // 잔상(Trail) 기록
        p.trail.unshift({
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            form: currentStage.form,
            color: currentStage.color
        });
        if (p.trail.length > 7) p.trail.pop();

        // 지형/장애물/아이템 좌측 스크롤
        world.platforms.forEach(pl => { pl.x -= moveDist; });
        world.obstacles.forEach(ob => { ob.x -= moveDist; });
        world.items.forEach(it => { it.x -= moveDist; });

        // 발판 충돌 판정 (위에서 착지하는 경우만)
        let groundedThisFrame = false;
        const playerBottom = p.y + p.size;
        const playerLeft = p.x;
        const playerRight = p.x + p.size;

        for (const pl of world.platforms) {
            if (playerRight > pl.x && playerLeft < pl.x + pl.w) {
                // 발판 상단과 충돌 체크 (이전 프레임 위치 고려)
                if (p.vy >= 0 && playerBottom >= pl.y && playerBottom - p.vy <= pl.y + 15) {
                    p.y = pl.y - p.size;
                    p.vy = 0;
                    p.isGrounded = true;
                    p.jumpCount = 0;
                    groundedThisFrame = true;
                    break;
                }
            }
        }

        p.isGrounded = groundedThisFrame;

        // 🌟 점프 선입력 버퍼링(Jump Buffering) 처리: 착지 직전 누른 점프 자동 실행
        if (groundedThisFrame && world.jumpBuffer > 0) {
            world.jumpBuffer = 0;
            p.vy = currentStage.jumpStrength;
            p.isGrounded = false;
            p.jumpCount = 1;
            gameSound.playJump();
        } else if (world.jumpBuffer > 0) {
            world.jumpBuffer -= 1;
        }

        // =====================================================================
        // 🚁 쿠키런식 세이프티 트랙터 빔 구출 시스템 (즉사 0% 룰!)
        // =====================================================================
        if (p.y > world.canvasHeight) {
            world.hearts -= 1;
            world.screenShake = 12;

            if (world.hearts <= 0) {
                // 하트 모두 소진 시 최종 게임오버
                handleGameOver();
                return;
            } else {
                // 하트가 남아있다면 세이프티 빔으로 구출!
                gameSound.playRescueBeam();
                world.combo = 1; // 콤보 리셋

                // 다음 안전한 지상 발판 찾기
                let safePlat = world.platforms.find(pl => pl.x + pl.w > p.x + 120 && pl.y <= 440);
                if (!safePlat) {
                    safePlat = { x: p.x + 100, y: 440, w: 600, h: 100 };
                    world.platforms.push(safePlat);
                }

                // 구출 빔 연출 활성화
                world.rescueEffect = {
                    x: safePlat.x + 80,
                    y: safePlat.y - 80,
                    targetY: safePlat.y - 65,
                    timer: 0.65,
                    maxTimer: 0.65
                };

                p.x = safePlat.x + 80;
                p.y = safePlat.y - 10;
                p.invincibleTimer = 2.0; // 2초간 무적 (착지 후 연속 피격 억까 완전 차단)

                showBanner('RESCUED! (-1 LIFE)', '#ff4444');
                return;
            }
        }

        // =====================================================================
        // 💥 장애물 충돌 판정 (하트 차감 & 무적 점멸)
        // =====================================================================
        if (p.invincibleTimer <= 0) {
            for (let i = world.obstacles.length - 1; i >= 0; i--) {
                const ob = world.obstacles[i];
                // AABB 충돌 체크 (안전 마진 6px 적용)
                if (
                    p.x + p.size - 6 > ob.x &&
                    p.x + 6 < ob.x + ob.w &&
                    p.y + p.size - 6 > ob.y &&
                    p.y + 6 < ob.y + ob.h
                ) {
                    if (world.hasShield) {
                        // 쉴드가 있으면 장애물 1회 파괴 & 쉴드 소모
                        world.hasShield = false;
                        world.obstacles.splice(i, 1);
                        p.invincibleTimer = 1.0;
                        world.screenShake = 8;
                        gameSound.playBomb();
                        showBanner('SHIELD BREAK!', '#a855f7');
                        break;
                    } else {
                        // 쉴드 없으면 하트 1개 차감
                        world.hearts -= 1;
                        world.combo = 1;
                        p.invincibleTimer = 1.6;
                        world.screenShake = 12;
                        world.hitFlash = 0.25; // 피격 시 화면 붉은 플래시 임팩트
                        gameSound.playObstacleHit();
                        if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            try { navigator.vibrate(35); } catch (_) {}
                        }

                        // 글리치 스파크 파티클
                        for (let k = 0; k < 15; k++) {
                            world.particles.push({
                                x: p.x + p.size / 2,
                                y: p.y + p.size / 2,
                                vx: (Math.random() - 0.5) * 8,
                                vy: (Math.random() - 0.5) * 8,
                                color: '#ff0055',
                                life: 0.4,
                                maxLife: 0.4,
                                size: 5
                            });
                        }

                        if (world.hearts <= 0) {
                            handleGameOver();
                            return;
                        }
                    }
                }
            }
        }

        // =====================================================================
        // ⭐ 수집 아이템 (코인 & 황금 트로피)
        // =====================================================================
        for (let i = world.items.length - 1; i >= 0; i--) {
            const it = world.items[i];

            // 크로스 모드 자석 효과 (반경 180px 내 코인 자동 흡수)
            if (currentStage.form === 'CROSS') {
                const dx = (p.x + p.size / 2) - it.x;
                const dy = (p.y + p.size / 2) - it.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 180) {
                    it.x += (dx / dist) * 12;
                    it.y += (dy / dist) * 12;
                }
            }

            // 획득 충돌 체크
            const dx = (p.x + p.size / 2) - it.x;
            const dy = (p.y + p.size / 2) - it.y;
            if (Math.hypot(dx, dy) < p.size / 2 + 18) {
                if (it.type === 'JUMP_GEM') {
                    // 공 튀기기 공중 점프 리차저: 점프 횟수 즉시 리필 + 경쾌한 에어 바운스!
                    p.jumpCount = 0;
                    p.vy = -7.8;
                    world.score += 250 * world.combo;
                    gameSound.playJumpGem();
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                        try { navigator.vibrate(20); } catch (_) {}
                    }

                    world.floatingTexts.push({
                        x: it.x,
                        y: it.y - 18,
                        text: 'AIR JUMP',
                        color: '#00ffcc',
                        life: 0.9,
                        maxLife: 0.9
                    });

                    // 에메랄드 스파크 파티클 폭발
                    for (let k = 0; k < 12; k++) {
                        const ang = Math.random() * Math.PI * 2;
                        world.particles.push({
                            x: it.x,
                            y: it.y,
                            vx: Math.cos(ang) * 6,
                            vy: Math.sin(ang) * 6,
                            color: '#00ffcc',
                            life: 0.4,
                            maxLife: 0.4,
                            size: 4
                        });
                    }

                    world.items.splice(i, 1);
                    continue;
                } else if (it.type === 'TROPHY') {
                    world.score += 500 * world.combo;
                    world.trophiesCollected += 1;
                    world.combo = Math.min(4.0, Number((world.combo + 0.5).toFixed(1)));
                    gameSound.playTrophy();
                    // 트로피 획득 시 캔버스 플로팅 텍스트 연출 (화면 가리는 전체 배너 대신 깔끔하게!)
                    world.floatingTexts.push({
                        x: it.x,
                        y: it.y - 15,
                        text: `+500P x${world.combo}`,
                        color: '#ffd700',
                        life: 1.0,
                        maxLife: 1.0
                    });
                } else {
                    world.score += 100 * world.combo;
                    world.coinsCollected += 1;
                    world.combo = Math.min(3.0, Number((world.combo + 0.1).toFixed(1)));
                    // 연속 코인 획득 시 반음씩 상승하는 아케이드 피치 사운드!
                    gameSound.playCoinPickup(world.combo);
                }

                // 획득 반짝이 파티클
                for (let k = 0; k < 8; k++) {
                    world.particles.push({
                        x: it.x,
                        y: it.y,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        color: it.type === 'TROPHY' ? '#ffd700' : currentStage.color,
                        life: 0.3,
                        maxLife: 0.3,
                        size: 3.5
                    });
                }

                world.items.splice(i, 1);
            }
        }

        // 화면 밖으로 벗어난 객체 제거
        world.platforms = world.platforms.filter(pl => pl.x + pl.w > -100);
        world.obstacles = world.obstacles.filter(ob => ob.x + ob.w > -100);
        world.items = world.items.filter(it => it.x > -100);

        // 파티클 업데이트
        for (let i = world.particles.length - 1; i >= 0; i--) {
            const pt = world.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= dt;
            if (pt.life <= 0) world.particles.splice(i, 1);
        }

        // 플로팅 텍스트 업데이트
        for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
            const ft = world.floatingTexts[i];
            ft.y -= 35 * dt;
            ft.life -= dt;
            if (ft.life <= 0) world.floatingTexts.splice(i, 1);
        }

        // 새 청크 자동 생성 (우측 여유 공간 확보)
        const lastPlatform = world.platforms[world.platforms.length - 1];
        if (lastPlatform && lastPlatform.x + lastPlatform.w < world.canvasWidth + 1200) {
            generateNextChunk(world, lastPlatform.x + lastPlatform.w);
        }

        // HUD 데이터 동기화 (0.1초 스로틀링하여 캔버스 FPS 60 유지)
        world.hudTimer = (world.hudTimer || 0) + dt;
        if (world.hudTimer >= 0.1) {
            world.hudTimer = 0;
            setHudData({
                distance: Math.floor(world.distanceMeters),
                score: Math.floor(world.score),
                hearts: world.hearts,
                combo: world.combo,
                stageIndex: world.stageIndex,
                form: currentStage.form,
                hasShield: world.hasShield
            });
        }
    };

    // =========================================================================
    // 🖌️ 캔버스 렌더링 (사이버펑크 네온 비주얼)
    // =========================================================================
    const renderScene = (ctx, world, _dt) => {
        const { canvasWidth, canvasHeight, screenShake, player: p } = world;
        const currentStage = EVOLUTION_STAGES[world.stageIndex];

        ctx.save();

        // 화면 흔들림 오프셋
        if (screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * screenShake;
            const shakeY = (Math.random() - 0.5) * screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // 1. 배경 그라데이션 및 네온 사이버 그리드
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        bgGrad.addColorStop(0, '#040612');
        bgGrad.addColorStop(0.5, '#090d22');
        bgGrad.addColorStop(1, '#020308');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 1.1 패럴랙스 사이버펑크 네온 시티 스카이라인 (원근감 0.25배 스크롤)
        const cityScroll = (world.distanceMeters * 4.2) % 720;
        const buildings = [
            { x: 0, w: 60, h: 170 }, { x: 68, w: 80, h: 230 }, { x: 156, w: 55, h: 150 },
            { x: 219, w: 95, h: 280 }, { x: 322, w: 70, h: 200 }, { x: 400, w: 85, h: 250 },
            { x: 493, w: 60, h: 160 }, { x: 561, w: 75, h: 220 }, { x: 644, w: 68, h: 180 }
        ];

        ctx.save();
        for (let repeat = -1; repeat <= 2; repeat++) {
            const offsetX = repeat * 720 - cityScroll;
            buildings.forEach(b => {
                const bx = offsetX + b.x;
                if (bx + b.w > -60 && bx < canvasWidth + 60) {
                    // 빌딩 몸체 실루엣
                    ctx.fillStyle = '#060a1d';
                    ctx.fillRect(bx, canvasHeight - b.h, b.w, b.h);

                    // 빌딩 옥상 네온 엣지 라인
                    ctx.fillStyle = `${currentStage.color}30`;
                    ctx.fillRect(bx, canvasHeight - b.h, b.w, 2);

                    // 옥상 안테나 첨탑 (일부 빌딩)
                    if (b.h > 210) {
                        ctx.strokeStyle = `${currentStage.color}40`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(bx + b.w / 2, canvasHeight - b.h);
                        ctx.lineTo(bx + b.w / 2, canvasHeight - b.h - 18);
                        ctx.stroke();

                        // 안테나 상단 점멸 네온 도트
                        ctx.fillStyle = currentStage.color;
                        ctx.beginPath();
                        ctx.arc(bx + b.w / 2, canvasHeight - b.h - 19, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 빌딩 창문 미세 불빛 도트
                    ctx.fillStyle = `${currentStage.color}18`;
                    for (let wy = canvasHeight - b.h + 16; wy < canvasHeight - 110; wy += 22) {
                        for (let wx = bx + 9; wx < bx + b.w - 9; wx += 14) {
                            ctx.fillRect(wx, wy, 4, 6);
                        }
                    }
                }
            });
        }
        ctx.restore();

        // 1.2 은은한 네온 사이버 더스트 (우주적 심도감)
        ctx.save();
        ctx.fillStyle = currentStage.color;
        for (let i = 0; i < 18; i++) {
            const dustX = ((i * 58 + world.distanceMeters * 22) % (canvasWidth + 80)) - 40;
            const dustY = 70 + Math.sin(i * 1.7 + world.distanceMeters * 0.04) * 55 + (i % 5) * 45;
            ctx.globalAlpha = 0.12 + (i % 3) * 0.08;
            ctx.fillRect(canvasWidth - dustX, dustY, (i % 2) + 1.5, (i % 2) + 1.5);
        }
        ctx.restore();

        // 네온 그리드 수평선
        ctx.strokeStyle = `${currentStage.color}15`;
        ctx.lineWidth = 1;
        for (let y = 110; y < canvasHeight; y += 45) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }

        // 네온 그리드 원근 세로선 (스크롤 효과)
        const gridOffset = (world.distanceMeters * 15) % 60;
        ctx.strokeStyle = `${currentStage.color}10`;
        for (let x = -gridOffset; x < canvasWidth; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 150);
            ctx.lineTo(x - 80, canvasHeight);
            ctx.stroke();
        }

        // 2. 발판(트랙) 렌더링
        world.platforms.forEach(pl => {
            // 발판 본체
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

            // 발판 상단 네온 엣지 라인
            ctx.shadowBlur = 12;
            ctx.shadowColor = currentStage.color;
            ctx.strokeStyle = currentStage.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pl.x, pl.y);
            ctx.lineTo(pl.x + pl.w, pl.y);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // 측면 보조 네온
            ctx.strokeStyle = `${currentStage.color}40`;
            ctx.lineWidth = 1;
            ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
        });

        // 3. 장애물 렌더링 (순수하고 날카로운 네온 스파이크로 통일)
        world.obstacles.forEach(ob => {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff0055';

            // 붉은 네온 삼각 스파이크
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(ob.x, ob.y + ob.h);
            ctx.lineTo(ob.x + ob.w / 2, ob.y);
            ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
            ctx.closePath();
            ctx.fill();

            // 내부 화이트 네온 발광 코어
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(ob.x + ob.w * 0.35, ob.y + ob.h);
            ctx.lineTo(ob.x + ob.w / 2, ob.y + ob.h * 0.35);
            ctx.lineTo(ob.x + ob.w * 0.65, ob.y + ob.h);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        // 4. 수집 아이템 (코인 & 황금 트로피 - 살아있는 상하 둥실거림 애니메이션)
        world.items.forEach(it => {
            ctx.save();
            // 살아있는 듯한 3.5px 부드러운 상하 부유 모션
            const bobY = Math.sin(Date.now() * 0.005 + it.x * 0.04) * 3.5;
            const drawY = it.y + bobY;

            if (it.type === 'JUMP_GEM') {
                // ⚡ 공 튀기기 공중 점프 젬 (에메랄드 회전 다이아몬드 & 펄스 헤일로)
                const pulse = Math.sin(Date.now() * 0.01) * 3;
                ctx.shadowBlur = 20 + pulse;
                ctx.shadowColor = '#00ffcc';

                // 외곽 펄스 링
                ctx.strokeStyle = '#00ffcc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(it.x, drawY, 17 + pulse * 0.6, 0, Math.PI * 2);
                ctx.stroke();

                // 회전 다이아몬드 코어
                ctx.save();
                ctx.translate(it.x, drawY);
                ctx.rotate(Date.now() * 0.003);

                ctx.fillStyle = '#00ffcc';
                ctx.beginPath();
                ctx.moveTo(0, -11);
                ctx.lineTo(10, 0);
                ctx.lineTo(0, 11);
                ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();

                // 내부 화이트 라이트 코어
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.lineTo(4, 0);
                ctx.lineTo(0, 5);
                ctx.lineTo(-4, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (it.type === 'TROPHY') {
                // 황금 트로피 (골드 펄스 글로우)
                const pulseBlur = 18 + Math.sin(Date.now() * 0.008) * 6;
                ctx.shadowBlur = pulseBlur;
                ctx.shadowColor = '#ffd700';
                ctx.fillStyle = '#ffd700';

                // 트로피 컵 모양 기하 렌더링
                ctx.beginPath();
                ctx.arc(it.x, drawY - 6, 12, 0, Math.PI, false);
                ctx.fill();
                // 받침대
                ctx.fillRect(it.x - 3, drawY - 6, 6, 14);
                ctx.fillRect(it.x - 10, drawY + 8, 20, 5);

                // 반짝임
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(it.x - 2, drawY - 10, 4, 4);
            } else {
                // PS 심볼 네온 코인 (원판 + 기호)
                ctx.shadowBlur = 12;
                ctx.shadowColor = currentStage.color;
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = currentStage.color;
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.arc(it.x, drawY, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 심볼 글자
                ctx.fillStyle = currentStage.color;
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(it.symbol || '■', it.x, drawY);
            }
            ctx.restore();
        });

        // 5. 파티클 렌더링
        world.particles.forEach(pt => {
            ctx.save();
            ctx.globalAlpha = pt.life / pt.maxLife;
            ctx.fillStyle = pt.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = pt.color;
            ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
            ctx.restore();
        });

        // 5.5 플로팅 텍스트 렌더링 (트로피 획득 점수 팝업)
        world.floatingTexts.forEach(ft => {
            ctx.save();
            const alpha = Math.min(1.0, ft.life / (ft.maxLife * 0.4));
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.shadowBlur = 14;
            ctx.shadowColor = ft.color;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });

        // 6. 플레이어 잔상(Trail)
        p.trail.forEach((t, idx) => {
            const alpha = ((p.trail.length - idx) / p.trail.length) * 0.25;
            drawPlayerShape(ctx, t.x, t.y, p.size, t.rotation, t.form, t.color, alpha);
        });

        // 7. 플레이어 본체 렌더링 (1:1 황금비율 완벽 유지, 무적 시 점멸)
        const isBlinking = p.invincibleTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0;
        if (!isBlinking) {
            ctx.save();
            // 보호막(Shield) 활성 시 외곽 펄스 링
            if (world.hasShield) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#a855f7';
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(p.x + p.size / 2, p.y + p.size / 2, p.size * 0.85, 0, Math.PI * 2);
                ctx.stroke();
            }

            drawPlayerShape(ctx, p.x, p.y, p.size, p.rotation, currentStage.form, currentStage.color, 1.0);
            ctx.restore();
        }

        // =====================================================================
        // 8. 세이프티 트랙터 빔 구출 연출 렌더링
        // =====================================================================
        if (world.rescueEffect) {
            const eff = world.rescueEffect;
            ctx.save();
            // 수직 네온 광선 빔 기둥
            const beamGrad = ctx.createLinearGradient(eff.x, 0, eff.x, canvasHeight);
            beamGrad.addColorStop(0, `${currentStage.color}00`);
            beamGrad.addColorStop(0.3, `${currentStage.color}60`);
            beamGrad.addColorStop(0.7, `${currentStage.color}90`);
            beamGrad.addColorStop(1, '#ffffff');

            ctx.fillStyle = beamGrad;
            ctx.shadowBlur = 25;
            ctx.shadowColor = currentStage.color;
            ctx.fillRect(eff.x - 24, 0, 48, canvasHeight);

            // 상단 구출 홀로그램 링
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(eff.x, eff.y, 40, 12, 0, 0, Math.PI * 2);
            ctx.stroke();

            // "RESCUE ACTIVE" 라벨
            ctx.fillStyle = '#ffffff';
            ctx.fillText('⚡ SAFETY RECOVERY ⚡', eff.x, eff.y - 30);
            ctx.restore();
        }

        // 9. 피격 시 붉은 비네트 플래시 (임팩트 피드백)
        if (world.hitFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 80, ${Math.min(0.45, world.hitFlash * 1.8)})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.restore();
        }

        ctx.restore();
    };

    // 도형별 플레이어 그리기 함수
    const drawPlayerShape = (ctx, x, y, size, rotation, form, color, alpha) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 16;
        ctx.shadowColor = color;
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(rotation);

        const half = size / 2;

        if (form === 'SQUARE') {
            // ■ 스퀘어: 둥근 모서리 네온 큐브
            ctx.fillStyle = color;
            ctx.fillRect(-half, -half, size, size);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-half + 4, -half + 4, size - 8, size - 8);
            // 내부 심볼
            ctx.fillStyle = color;
            ctx.fillRect(-half + 9, -half + 9, size - 18, size - 18);
        } else if (form === 'CIRCLE') {
            // ● 서클: 롤링 볼
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, half, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, half - 4, 0, Math.PI * 2);
            ctx.fill();
            // 내부 회전 표시선
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-half + 7, 0);
            ctx.lineTo(half - 7, 0);
            ctx.stroke();
        } else if (form === 'TRIANGLE') {
            // ▲ 트라이앵글: 날렵한 제트 삼각형
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -half - 2);
            ctx.lineTo(half + 2, half);
            ctx.lineTo(-half - 2, half);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(0, -half + 5);
            ctx.lineTo(half - 3, half - 4);
            ctx.lineTo(-half + 3, half - 4);
            ctx.closePath();
            ctx.fill();
        } else if (form === 'CROSS') {
            // ✖ 크로스: 엑스 심볼
            ctx.strokeStyle = color;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-half + 3, -half + 3);
            ctx.lineTo(half - 3, half - 3);
            ctx.moveTo(half - 3, -half + 3);
            ctx.lineTo(-half + 3, half - 3);
            ctx.stroke();

            // 중앙 코어 빛
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    };

    const currentStageInfo = EVOLUTION_STAGES[hudData.stageIndex];

    return (
        <div className="relative w-full h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] mt-16 bg-base text-primary px-2 py-1.5 sm:py-2 flex flex-col items-center justify-between select-none overflow-hidden touch-manipulation">
            {/* 시작 전 READY... GO! 브리핑 & 카운트다운 오버레이 (사천성, 플라이트와 통일) */}
            {showOverlay && (
                <GameStartOverlay
                    title="PS 네온 런 (Beat Jump)"
                    subtitle="PlayStation 4대 심볼과 함께 질주하는 원버튼 비트 점프 러너"
                    badgeText="BEAT JUMP"
                    badgeColor="bg-ps-blue"
                    highScore={bestScore}
                    infoLabel="생명력"
                    infoValue="3 라이프 (낙하 구출)"
                    instructions={[
                        "스페이스바(PC) 또는 화면 터치(모바일)로 장애물을 뛰어넘으세요.",
                        "길게 누르면 대점프, 살짝 누르면 소점프로 도약 높이를 조절합니다.",
                        "500m마다 스퀘어 ➔ 서클 ➔ 트라이앵글(2단점프) ➔ 크로스(피버)로 진화합니다.",
                        "공중 에메랄드 젬을 획득하면 점프 횟수가 즉시 충전되어 추가 도약이 가능합니다."
                    ]}
                    onStart={handleStartAfterCountdown}
                    onBack={onBack}
                />
            )}

            {/* 상단 네비게이션 & 사운드 컨트롤 바 */}
            <header className="w-full max-w-4xl shrink-0 flex items-center justify-between px-1 mb-1 sm:mb-2 z-10">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-hover"
                        title="라운지 복귀"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">라운지</span>
                    </button>

                    <span className="p-1.5 rounded-lg bg-ps-blue text-white shadow-sm">
                        <Zap className="w-4 h-4" />
                    </span>
                    <h1 className="text-sm sm:text-base font-black italic tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-ps-blue">
                        PS 네온 런 <span className="text-xs font-normal not-italic text-secondary hidden xs:inline">(Beat Jump)</span>
                    </h1>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onOpenLeaderboard('neon_run')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface border border-divider text-yellow-500 hover:text-yellow-400 text-xs font-bold transition-all"
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>TOP 10</span>
                    </button>

                    <button
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary transition-colors"
                        title={isMuted ? '음소거 해제' : '음소거'}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-ps-blue" />}
                    </button>

                    {gameState === 'PLAYING' && (
                        <button
                            onClick={() => setGameState('PAUSED')}
                            className="p-1.5 rounded-xl bg-surface border border-divider text-amber-400 hover:text-amber-300 transition-all"
                            title="일시 정지 (ESC)"
                        >
                            <Pause className="w-4 h-4" />
                        </button>
                    )}
                    {gameState === 'PAUSED' && (
                        <button
                            onClick={() => setGameState('PLAYING')}
                            className="p-1.5 rounded-xl bg-surface border border-divider text-emerald-400 hover:text-emerald-300 transition-all"
                            title="계속하기 (ESC)"
                        >
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                    )}
                </div>
            </header>

            {/* 메인 캔버스 뷰포트 컨테이너 (16:9 비율 유지, 화면 높이에 맞춰 유연한 스케일) */}
            <main className="relative w-full max-w-4xl flex-1 min-h-0 aspect-[16/9] max-h-[540px] bg-black rounded-2xl sm:rounded-3xl border-2 border-ps-blue/40 shadow-[0_0_30px_rgba(0,112,209,0.3)] overflow-hidden flex items-center justify-center my-auto">
                <canvas
                    ref={canvasRef}
                    width={960}
                    height={540}
                    onMouseDown={handleJump}
                    onMouseUp={handleJumpRelease}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        handleJump();
                    }}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        handleJumpRelease();
                    }}
                    className="w-full h-full object-contain cursor-pointer touch-none"
                />

                {/* 인게임 실시간 HUD 오버레이 */}
                {gameState === 'PLAYING' && (
                    <div className="absolute top-0 left-0 right-0 p-2 sm:p-5 flex items-center justify-between pointer-events-none">
                        {/* 좌측: 생명력(하트) & 현재 심볼 폼 */}
                        <div className="flex flex-col gap-1 sm:gap-2">
                            <div className="flex items-center gap-1 sm:gap-1.5 bg-black/60 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-white/10">
                                {[...Array(3)].map((_, i) => (
                                    <Heart
                                        key={i}
                                        className={`w-3.5 h-3.5 sm:w-5 sm:h-5 transition-all ${
                                            i < hudData.hearts
                                                ? 'text-red-500 fill-red-500 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                                : 'text-zinc-600 fill-zinc-800'
                                        }`}
                                    />
                                ))}
                                {hudData.hasShield && (
                                    <div className="ml-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500 text-purple-300 text-[9px] sm:text-[10px] font-black flex items-center gap-1">
                                        <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                        <span>SHIELD</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-2 sm:px-3 py-0.5 sm:py-1 rounded-2xl border border-white/10 w-fit">
                                <span
                                    className="font-mono text-xs sm:text-sm font-black"
                                    style={{ color: currentStageInfo.color }}
                                >
                                    {currentStageInfo.symbol} {currentStageInfo.name}
                                </span>
                                {currentStageInfo.maxJumps > 1 && (
                                    <span className="text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        2단 점프
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 중앙: 거리 미터계 */}
                        <div className="flex flex-col items-center bg-black/60 backdrop-blur-md px-3 sm:px-5 py-1 sm:py-2 rounded-2xl border border-white/10">
                            <span className="text-[9px] sm:text-[11px] font-bold text-zinc-400 tracking-wider">DISTANCE</span>
                            <span className="text-base sm:text-2xl font-black italic tracking-tight font-mono text-cyan-400">
                                {hudData.distance.toLocaleString()}m
                            </span>
                        </div>

                        {/* 우측: 실시간 점수 & 콤보 */}
                        <div className="flex flex-col items-end gap-1">
                            <div className="bg-black/60 backdrop-blur-md px-2.5 sm:px-4 py-1 sm:py-2 rounded-2xl border border-white/10 text-right">
                                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block tracking-wider">SCORE</span>
                                <span className="text-sm sm:text-2xl font-black font-mono text-yellow-400">
                                    {hudData.score.toLocaleString()}P
                                </span>
                            </div>
                            {hudData.combo > 1 && (
                                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black text-amber-400 animate-pulse">
                                    COMBO x{hudData.combo}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 팝업 배너 알림 (진화, 구출 등) */}
                {bannerAlert && (
                    <div className="absolute top-12 sm:top-20 pointer-events-none animate-in fade-in slide-in-from-top duration-300">
                        <div
                            className="px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full bg-black/85 backdrop-blur-md border-2 font-black text-xs sm:text-base tracking-wide shadow-2xl flex items-center gap-2"
                            style={{
                                borderColor: bannerAlert.color,
                                color: bannerAlert.color,
                                boxShadow: `0 0 25px ${bannerAlert.color}60`
                            }}
                        >
                            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                            <span>{bannerAlert.text}</span>
                        </div>
                    </div>
                )}
            </main>

            {/* 하단 진화 단계 컴팩트 가이드 바 (단일 행 4컬럼 칩) */}
            <footer className="w-full max-w-4xl shrink-0 grid grid-cols-4 gap-1 sm:gap-2 px-1 py-1 z-10">
                {EVOLUTION_STAGES.map((st, idx) => {
                    const isPassed = hudData.distance >= (st.maxDistance || Infinity);
                    const isCurrent = hudData.stageIndex === idx;

                    // 현재 단계의 0~100% 진행률 계산
                    let stageProgress = 0;
                    if (st.maxDistance === Infinity) {
                        stageProgress = isCurrent ? 100 : 0;
                    } else {
                        const range = st.maxDistance - st.minDistance;
                        const curr = Math.max(0, Math.min(range, hudData.distance - st.minDistance));
                        stageProgress = Math.floor((curr / range) * 100);
                    }

                    return (
                        <div
                            key={st.form}
                            className={`relative p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all text-center flex flex-col items-center justify-center overflow-hidden ${
                                isCurrent
                                    ? 'bg-surface border-2 shadow-md'
                                    : isPassed
                                    ? 'bg-surface/50 border-divider opacity-60'
                                    : 'bg-surface/20 border-divider opacity-30'
                            }`}
                            style={{
                                borderColor: isCurrent ? st.color : undefined,
                                boxShadow: isCurrent ? `0 0 12px ${st.color}30` : undefined
                            }}
                        >
                            {/* 내부 실시간 네온 충전 바 */}
                            <div
                                className="absolute bottom-0 left-0 h-1 transition-all duration-200"
                                style={{
                                    width: isPassed ? '100%' : `${stageProgress}%`,
                                    backgroundColor: st.color,
                                    boxShadow: isCurrent ? `0 0 6px ${st.color}` : undefined
                                }}
                            />

                            <div className="relative z-10 flex items-center gap-1 text-[11px] sm:text-xs font-black">
                                <span style={{ color: st.color }}>{st.symbol}</span>
                                <span className="truncate text-primary">{st.name.replace('PS ', '')}</span>
                            </div>
                            <div className="relative z-10 flex items-center justify-between w-full px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-mono text-secondary mt-0.5">
                                <span>{st.minDistance}m+</span>
                                <span className="font-bold" style={{ color: isCurrent ? st.color : undefined }}>
                                    {isPassed ? '완료' : isCurrent ? `${stageProgress}%` : '잠김'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </footer>

            {/* 게임 오버 결과 모달 (전체 화면 오버레이 - 모바일 최적화) */}
            {gameState === 'GAMEOVER' && (
                <div
                    onClick={() => {
                        if (Date.now() - (worldRef.current.gameOverTime || 0) > 350) {
                            resetGame();
                        }
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-surface border border-divider rounded-3xl p-5 sm:p-6 shadow-2xl text-center flex flex-col items-center cursor-default"
                    >
                        {isNewRecord ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 text-xs font-black uppercase tracking-wider mb-3 animate-pulse">
                                <Crown className="w-3.5 h-3.5" />
                                <span>NEW HIGH SCORE</span>
                            </div>
                        ) : (
                            <div className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-2">
                                SESSION FINISHED
                            </div>
                        )}

                        <h2 className="text-3xl sm:text-4xl font-black italic tracking-tight font-mono text-primary mb-3">
                            {gameOverStats.score.toLocaleString()} <span className="text-base text-ps-blue font-sans">PTS</span>
                        </h2>

                        {/* 세부 통계 그리드 */}
                        <div className="grid grid-cols-3 gap-2 w-full mb-4">
                            <div className="p-2.5 rounded-2xl bg-base border border-divider flex flex-col items-center">
                                <span className="text-[10px] text-secondary font-bold">완주 거리</span>
                                <span className="text-sm sm:text-base font-black font-mono text-cyan-500">
                                    {gameOverStats.distance.toLocaleString()}m
                                </span>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-base border border-divider flex flex-col items-center">
                                <span className="text-[10px] text-secondary font-bold">트로피</span>
                                <span className="text-sm sm:text-base font-black font-mono text-yellow-500 flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    <span>{gameOverStats.trophies}</span>
                                </span>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-base border border-divider flex flex-col items-center">
                                <span className="text-[10px] text-secondary font-bold">생존 시간</span>
                                <span className="text-sm sm:text-base font-black font-mono text-primary">
                                    {gameOverStats.clearTimeSec}s
                                </span>
                            </div>
                        </div>

                        {/* 리더보드 순위 알림 */}
                        {isAuthenticated ? (
                            <div className="w-full py-2 px-3 mb-4 rounded-xl bg-ps-blue/10 border border-ps-blue/25 text-[11px] text-ps-blue font-bold flex items-center justify-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-ps-blue shrink-0" />
                                <span>{myRank ? `글로벌 리더보드 현재 ${myRank}위 등극!` : '서버에 점수가 안전하게 동기화되었습니다.'}</span>
                            </div>
                        ) : (
                            <div className="mb-4 w-full">
                                <button
                                    onClick={openLoginModal}
                                    className="w-full py-2 px-3 rounded-xl bg-ps-blue/15 border border-ps-blue/30 text-ps-blue text-xs font-bold hover:bg-ps-blue/25 transition-all"
                                >
                                    로그인하고 명예의 전당에 점수 등록하기
                                </button>
                            </div>
                        )}

                        {/* 재도전 및 랭킹 버튼 */}
                        <div className="flex items-center gap-2.5 w-full">
                            <button
                                onClick={resetGame}
                                className="flex-1 py-3 px-4 rounded-xl bg-ps-blue hover:bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(0,112,209,0.4)] active:scale-95 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>다시 달리기</span>
                            </button>
                            <button
                                onClick={() => onOpenLeaderboard('neon_run')}
                                className="py-3 px-4 rounded-xl bg-surface-hover hover:bg-surface border border-divider text-xs sm:text-sm font-bold text-primary flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span>랭킹</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 일시정지 (PAUSED) 화면 (전체 화면 오버레이) */}
            {gameState === 'PAUSED' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-divider rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
                        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-500 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <Pause className="w-7 h-7" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-primary mb-1">
                            GAME PAUSED
                        </h2>
                        <p className="text-xs text-secondary mb-5">
                            달리기가 일시 정지되었습니다.
                        </p>
                        <div className="flex items-center gap-2.5 w-full">
                            <button
                                onClick={() => setGameState('PLAYING')}
                                className="flex-1 py-3 px-4 rounded-xl bg-ps-blue hover:bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,112,209,0.4)] active:scale-95 transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>계속 달리기</span>
                            </button>
                            <button
                                onClick={resetGame}
                                className="py-3 px-4 rounded-xl bg-surface-hover hover:bg-surface border border-divider text-xs sm:text-sm font-bold text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>재시작</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NeonRunGame;
