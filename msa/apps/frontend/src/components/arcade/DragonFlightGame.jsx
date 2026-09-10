import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Trophy,
    Heart,
    Shield,
    Volume2,
    VolumeX,
    RotateCcw,
    Home,
    Bomb,
    Sparkles,
    Zap,
    Flame,
    Crown,
    LogIn,
    CheckCircle2
} from 'lucide-react';
import GameStartOverlay from './GameStartOverlay';
import { gameSound } from '../../utils/gameSound';
import { arcadeApi } from '../../api/arcadeApi';
import { useAuth } from '../../contexts/AuthContext';

// 5개 레인 기반 X 좌표 계산 유틸 (게임 내부 가상 해상도: 450 x 750)
const GAME_WIDTH = 450;
const GAME_HEIGHT = 750;
const LANES = [45, 135, 225, 315, 405];

const DragonFlightGame = ({ onBack, onOpenLeaderboard }) => {
    const { isAuthenticated, user, openLoginModal } = useAuth();

    // 게임 상태: 'IDLE' | 'PLAYING' | 'GAMEOVER'
    const [gameState, setGameState] = useState('IDLE');
    const [isMuted, setIsMuted] = useState(gameSound.getMuted());

    // 실시간 HUD 표시용 상태 (60fps Canvas와 별도로 React 렌더링용)
    const [hudData, setHudData] = useState({
        score: 0,
        distance: 0,
        lives: 2,
        hasShield: true,
        bombs: 1,
        powerLevel: 1,
        hyperActive: false
    });

    // 최고 기록 상태
    const [bestScore, setBestScore] = useState(0);

    // 최종 결과 상태
    const [gameOverStats, setGameOverStats] = useState({
        score: 0,
        distance: 0,
        kills: 0,
        gems: 0,
        isNewRecord: false,
        isSubmitting: false,
        submitSuccess: false
    });

    // Canvas 및 게임 루프 Ref
    const canvasRef = useRef(null);
    const animFrameIdRef = useRef(null);
    const gameEngineRef = useRef(null);

    // 내 최고 기록 서버 조회
    useEffect(() => {
        const fetchRecord = async () => {
            if (isAuthenticated && user) {
                try {
                    const data = await arcadeApi.getLeaderboard('flight', user);
                    if (data?.myRank?.score) {
                        setBestScore(data.myRank.score);
                    }
                } catch {
                    // 무시
                }
            }
        };
        fetchRecord();
    }, [isAuthenticated, user]);

    // 사운드 음소거 토글
    const handleToggleMute = () => {
        const muted = gameSound.toggleMute();
        setIsMuted(muted);
    };

    // 폭탄 사용 트리거 (외부 버튼 or 단축키)
    const triggerBomb = useCallback(() => {
        if (gameEngineRef.current && gameState === 'PLAYING') {
            gameEngineRef.current.useBomb();
        }
    }, [gameState]);

    // 게임 시작 핸들러
    const handleStartGame = () => {
        setGameState('PLAYING');
    };

    // 게임 초기화 및 Canvas 루프 기동
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // 게임 내부 물리 및 인스턴스 데이터
        const engine = {
            running: true,
            score: 0,
            distance: 0, // 미터 단위
            lives: 2,
            hasShield: true,
            bombs: 1,
            powerLevel: 1, // 1: 싱글, 2: 듀얼, 3: 트리플
            powerTime: 0,
            hyperTime: 0, // 초고속 무적 비행 잔여 시간 (ms)
            magnetTime: 0,
            kills: 0,
            gemsCollected: 0,

            // 플레이어 기체
            player: {
                x: 225,
                y: 650,
                width: 44,
                height: 52,
                targetX: 225,
                speed: 9,
                invincibleTime: 0, // 피격 후 무적 시간 (ms)
                lastShotTime: 0,
                shootInterval: 140 // 발사 주기 (ms)
            },

            // 엔티티 컬렉션
            bullets: [],
            enemies: [],
            items: [],
            particles: [],
            floatingTexts: [],
            stars: [],

            // 웨이브 및 기습 운석 스폰 타이머
            waveCount: 0,
            lastSpawnTime: 0,
            lastStrayMeteorTime: 0,
            meteorWarnings: [],
            spawnInterval: 1300,
            gameStartTime: Date.now(),
            lastFrameTime: performance.now(),

            // 폭탄 사용 함수
            useBomb() {
                if (this.bombs <= 0 || !this.running) return;
                this.bombs -= 1;
                gameSound.playBomb();

                // 화면 전체 적 파괴 및 보석 변환
                this.enemies.forEach(enemy => {
                    this.kills += 1;
                    this.score += enemy.score;
                    this.createExplosion(enemy.x, enemy.y, '#3b82f6', 20);
                    // 폭탄으로 처치 시 무조건 보석 드랍
                    this.spawnGem(enemy.x, enemy.y, 'gold');
                });
                this.enemies = [];

                // 화면 충격파 파티클
                this.createShockwave(225, 375);
                this.addFloatingText('BOMB CLEAR!', 225, 350, '#60a5fa', 32);
                this.syncHud();
            },

            // 부가 유틸
            createExplosion(x, y, color = '#f59e0b', count = 12) {
                // 모바일 GPU/메모리 부하 및 발열 방지를 위한 파티클 상한 제어
                if (this.particles.length > 50) {
                    this.particles.splice(0, this.particles.length - 50);
                }
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1.5 + Math.random() * 4.5;
                    this.particles.push({
                        x,
                        y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        color,
                        radius: 2 + Math.random() * 3,
                        alpha: 1,
                        decay: 0.02 + Math.random() * 0.03
                    });
                }
            },

            createShockwave(x, y) {
                this.particles.push({
                    x,
                    y,
                    isWave: true,
                    radius: 10,
                    maxRadius: 280,
                    alpha: 1,
                    decay: 0.03
                });
            },

            addFloatingText(text, x, y, color = '#fbbf24', size = 18) {
                this.floatingTexts.push({
                    text,
                    x,
                    y,
                    color,
                    size,
                    alpha: 1,
                    vy: -1.4
                });
            },

            spawnGem(x, y, forcedType = null) {
                let type = forcedType;
                if (!type) {
                    const roll = Math.random();
                    if (roll < 0.6) type = 'blue';
                    else if (roll < 0.9) type = 'red';
                    else type = 'gold';
                }
                this.items.push({
                    x,
                    y,
                    type: 'gem',
                    gemType: type,
                    radius: 12,
                    vy: 2.2,
                    score: type === 'gold' ? 500 : type === 'red' ? 300 : 100
                });
            },

            spawnPowerup(x, y) {
                const types = ['power', 'magnet', 'hyper', 'bomb'];
                const weights = [0.40, 0.25, 0.18, 0.17];
                const r = Math.random();
                let acc = 0;
                let chosen = types[0];
                for (let i = 0; i < types.length; i++) {
                    acc += weights[i];
                    if (r <= acc) {
                        chosen = types[i];
                        break;
                    }
                }
                this.items.push({
                    x,
                    y,
                    type: 'powerup',
                    powerType: chosen,
                    radius: 16,
                    vy: 1.8
                });
            },

            syncHud() {
                setHudData({
                    score: Math.floor(this.score),
                    distance: Math.floor(this.distance),
                    lives: this.lives,
                    hasShield: this.hasShield,
                    bombs: this.bombs,
                    powerLevel: this.powerLevel,
                    hyperActive: this.hyperTime > 0
                });
            }
        };

        // 별빛 배경 초기화 (다중 레이어)
        for (let i = 0; i < 70; i++) {
            engine.stars.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * GAME_HEIGHT,
                speed: 0.8 + Math.random() * 2.5,
                radius: Math.random() > 0.85 ? 1.8 : 1.0,
                alpha: 0.3 + Math.random() * 0.7
            });
        }

        gameEngineRef.current = engine;

        // 키보드 조작 리스너
        const keysDown = {};
        const handleKeyDown = (e) => {
            keysDown[e.code] = true;
            if (e.code === 'Space' || e.code === 'KeyZ') {
                e.preventDefault();
                engine.useBomb();
            }
        };
        const handleKeyUp = (e) => {
            keysDown[e.code] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // 마우스 / 터치 조작 리스너 (Canvas 기준 상대 좌표 계산 & 레이아웃 쓰레싱/발열 방지 캐싱)
        let cachedRect = null;
        let lastRectTime = 0;
        const getCanvasRect = () => {
            const now = performance.now();
            if (!cachedRect || now - lastRectTime > 500) {
                cachedRect = canvas.getBoundingClientRect();
                lastRectTime = now;
            }
            return cachedRect;
        };

        const updatePlayerTargetX = (clientX) => {
            const rect = getCanvasRect();
            if (!rect || rect.width === 0) return;
            const scaleX = GAME_WIDTH / rect.width;
            const relativeX = (clientX - rect.left) * scaleX;
            engine.player.targetX = Math.max(30, Math.min(GAME_WIDTH - 30, relativeX));
        };

        const handleMouseMove = (e) => {
            if (e.buttons === 1 || e.type === 'mousemove') {
                updatePlayerTargetX(e.clientX);
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                updatePlayerTargetX(e.touches[0].clientX);
            }
        };

        const handleTouchStart = (e) => {
            // 터치 시작 시 화면 위치 갱신
            cachedRect = canvas.getBoundingClientRect();
            lastRectTime = performance.now();
            if (e.touches.length > 0) {
                updatePlayerTargetX(e.touches[0].clientX);
            }
        };

        const handleResize = () => {
            cachedRect = null;
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
        canvas.addEventListener('touchstart', handleTouchStart, { passive: true });

        // 메인 애니메이션 루프 (가변 주사율 60Hz/120Hz 완벽 대응 Delta Time 정규화)
        let lastTime = performance.now();

        const loop = (currentTime) => {
            if (!engine.running) return;

            const delta = Math.min(currentTime - lastTime, 50); // 비정상 지연(탭 비활성화 등) 캡
            lastTime = currentTime;

            // 60FPS(약 16.667ms) 기준 1.0 정규화 계수
            // 120Hz에서는 0.5가 되어 2배 프레임에서도 동일한 초당 물리 이동 거리 보장!
            const timeScale = Math.min(2.0, Math.max(0.2, delta / 16.667));

            // 1. 키보드 입력 처리 (timeScale 보정)
            const keySpeed = 9 * timeScale;
            if (keysDown['ArrowLeft'] || keysDown['KeyA']) {
                engine.player.targetX = Math.max(30, engine.player.targetX - keySpeed);
            }
            if (keysDown['ArrowRight'] || keysDown['KeyD']) {
                engine.player.targetX = Math.min(GAME_WIDTH - 30, engine.player.targetX + keySpeed);
            }

            // 플레이어 부드러운 이동 (지수 감쇠 보간 - 120Hz/60Hz 균등 보정)
            const lerpFactor = Math.min(1.0, 0.28 * timeScale);
            engine.player.x += (engine.player.targetX - engine.player.x) * lerpFactor;

            // 2. 비행 거리 & 난이도 계산
            const speedMultiplier = engine.hyperTime > 0 ? 3.5 : 1.0;
            const distanceIncrement = (delta / 1000) * 35 * speedMultiplier;
            engine.distance += distanceIncrement;
            engine.score += distanceIncrement * 1.5; // 비행 거리 기본 점수 가산

            // 버프 타이머 갱신 (하이퍼, 자석, 피격 무적)
            if (engine.hyperTime > 0) engine.hyperTime = Math.max(0, engine.hyperTime - delta);
            if (engine.magnetTime > 0) engine.magnetTime = Math.max(0, engine.magnetTime - delta);
            if (engine.player.invincibleTime > 0) {
                engine.player.invincibleTime = Math.max(0, engine.player.invincibleTime - delta);
            }

            // 3. 탄환 자동 발사 (하이퍼 모드 중에는 발사 생략 및 직접 충돌 격파)
            if (engine.hyperTime <= 0 && currentTime - engine.player.lastShotTime > engine.player.shootInterval) {
                engine.player.lastShotTime = currentTime;
                gameSound.playLaser();

                const px = engine.player.x;
                const py = engine.player.y - 20;

                if (engine.powerLevel === 1) {
                    engine.bullets.push({ x: px, y: py, vx: 0, vy: -15, damage: 1 });
                } else if (engine.powerLevel === 2) {
                    engine.bullets.push({ x: px - 12, y: py, vx: 0, vy: -15, damage: 1 });
                    engine.bullets.push({ x: px + 12, y: py, vx: 0, vy: -15, damage: 1 });
                } else {
                    engine.bullets.push({ x: px, y: py, vx: 0, vy: -16, damage: 1 });
                    engine.bullets.push({ x: px - 14, y: py, vx: -2.2, vy: -15, damage: 1 });
                    engine.bullets.push({ x: px + 14, y: py, vx: 2.2, vy: -15, damage: 1 });
                }
            }

            // 탄환 이동 및 정리 (timeScale 보정)
            for (let i = engine.bullets.length - 1; i >= 0; i--) {
                const b = engine.bullets[i];
                b.x += b.vx * timeScale;
                b.y += b.vy * timeScale;
                if (b.y < -30 || b.x < -20 || b.x > GAME_WIDTH + 20) {
                    engine.bullets.splice(i, 1);
                }
            }

            // 4. 난이도 및 적 웨이브 / 기습 운석 스케일링
            // 거리(km)와 점수(score) 기반 부드러운 로그형 성장곡선 (30만점 이상에서도 지속적인 긴장감 제공)
            // 단, 플레이어 탄환 화력(최대 3열)을 고려하여 적 HP는 엄격히 제한(크루저 최대 4 HP)하고 난이도는 속도와 운석/회피 기믹으로 부여
            const distKm = engine.distance / 1000;
            const scoreProgression = Math.log10(Math.max(1, engine.score / 10000) + 1); // 0 at 0, ~0.6 at 30k, ~1.5 at 300k
            const difficultyFactor = Math.min(4.2, 1 + Math.log2(1 + distKm * 0.7) * 0.75 + scoreProgression * 0.35);
            const currentSpawnInterval = Math.max(580, 1350 / (1 + (difficultyFactor - 1) * 0.6));

            if (currentTime - engine.lastSpawnTime > currentSpawnInterval) {
                engine.lastSpawnTime = currentTime;
                engine.waveCount = (engine.waveCount || 0) + 1;

                // 300m 이후 5웨이브마다 '전열 장벽 웨이브(Wall Wave)' 발동 (5개 레인 전체 스폰)
                const isWallWave = engine.distance > 300 && (engine.waveCount % 5 === 0);

                if (isWallWave) {
                    // 전열 장벽: 5개 레인 전체에 스폰하되, 무조건 1개 레인은 탈출구(1-HP 스카우트 or 골드)로 보장
                    const escapeLaneIdx = Math.floor(Math.random() * LANES.length);
                    engine.addFloatingText('WALL WAVE ALERT!', 225, 120, '#ef4444', 22);

                    // 고거리/고득점일수록 장벽 내 파괴 불가 운석 비중 조절 (최대 2개 레인까지만 배치하여 탈출로 보장)
                    const meteorLanes = new Set();
                    if (engine.distance > 1500 || engine.score > 40000) {
                        const nonEscapeLanes = [0, 1, 2, 3, 4].filter(idx => idx !== escapeLaneIdx);
                        // 1500m 이상: 운석 1개, 5000m or 150,000점 이상: 운석 2개
                        const targetMCount = (engine.distance > 5000 || engine.score > 150000) ? 2 : 1;
                        nonEscapeLanes.sort(() => 0.5 - Math.random());
                        for (let m = 0; m < targetMCount && m < nonEscapeLanes.length; m++) {
                            meteorLanes.add(nonEscapeLanes[m]);
                        }
                    }

                    for (let i = 0; i < LANES.length; i++) {
                        const laneX = LANES[i];
                        const isEscape = (i === escapeLaneIdx);
                        const isMeteorWall = meteorLanes.has(i);

                        let type = 'scout';
                        let hp = 1;
                        let speed = Math.min(6.5, 2.4 * (1 + (difficultyFactor - 1) * 0.45));
                        let score = 150;
                        let color = '#ef4444';
                        let pattern = 'straight';

                        if (isEscape) {
                            // 탈출구: 1 HP 스카우트 혹은 행운의 골드
                            if (Math.random() < 0.35) {
                                type = 'gold';
                                hp = 2;
                                speed = Math.min(7.0, 2.8 * (1 + (difficultyFactor - 1) * 0.45));
                                score = 600;
                                color = '#f59e0b';
                            }
                        } else if (isMeteorWall) {
                            type = 'meteor';
                            hp = 999;
                            speed = Math.min(6.0, 2.2 * (1 + (difficultyFactor - 1) * 0.4));
                            score = 0;
                            color = '#475569';
                        } else {
                            // 일반 벽: 크루저 (절대 HP 과도 팽창 금지 - 최대 4 HP 상한)
                            type = 'cruiser';
                            hp = Math.min(4, Math.floor(2.0 + (difficultyFactor - 1) * 0.45));
                            speed = Math.min(5.5, 1.8 * (1 + (difficultyFactor - 1) * 0.4));
                            score = 420;
                            color = '#9333ea';
                        }

                        engine.enemies.push({
                            x: laneX,
                            y: -40,
                            baseX: laneX,
                            width: type === 'cruiser' ? 54 : type === 'meteor' ? 44 : 38,
                            height: type === 'cruiser' ? 50 : type === 'meteor' ? 44 : 38,
                            type,
                            hp,
                            maxHp: hp,
                            speed,
                            score,
                            color,
                            pattern,
                            phase: 0,
                            rotation: 0
                        });
                    }
                } else {
                    // 일반 웨이브: 거리 & 점수 비례 2~4개 레인에 적 동시 생성
                    const numEnemies = Math.min(4, Math.floor(1.8 + Math.random() * 1.5 + distKm * 0.25));
                    const availableLanes = [...LANES].sort(() => 0.5 - Math.random());

                    for (let i = 0; i < numEnemies; i++) {
                        const laneX = availableLanes[i];
                        const roll = Math.random();

                        let type = 'scout'; // 1 HP 날렵한 정찰기
                        let hp = 1;
                        let speed = Math.min(7.2, (2.5 + Math.random() * 1.2) * (1 + (difficultyFactor - 1) * 0.45));
                        let score = 150;
                        let color = '#ef4444';
                        let pattern = 'straight';

                        // 거리 기반 지그재그 및 급강하 패턴
                        if (engine.distance > 450 && Math.random() < Math.min(0.45, 0.25 + distKm * 0.04)) {
                            pattern = 'zigzag';
                        } else if (engine.distance > 600 && Math.random() < Math.min(0.40, 0.22 + distKm * 0.03)) {
                            pattern = 'dive';
                        }

                        // 운석 등장 확률: 거리 & 점수에 비례해 상승
                        const meteorChance = Math.min(0.35, 0.10 + (distKm * 0.02) + (scoreProgression * 0.04));

                        if (roll < 0.22) {
                            type = 'cruiser'; // 중장갑 탱크함 (최대 4 HP 상한)
                            hp = Math.min(4, Math.floor(2.0 + (difficultyFactor - 1) * 0.45));
                            speed = Math.min(5.5, (1.6 + Math.random() * 0.6) * (1 + (difficultyFactor - 1) * 0.4));
                            score = 420;
                            color = '#9333ea';
                            pattern = 'straight';
                        } else if (roll < 0.32) {
                            type = 'gold'; // 보너스 황금 적
                            hp = 2;
                            speed = Math.min(7.5, 3.0 * (1 + (difficultyFactor - 1) * 0.45));
                            score = 600;
                            color = '#f59e0b';
                            pattern = 'straight';
                        } else if (engine.distance > 650 && roll < 0.32 + meteorChance) {
                            type = 'meteor'; // 파괴 불가 운석
                            hp = 999;
                            speed = Math.min(6.5, (2.0 + Math.random() * 0.8) * (1 + (difficultyFactor - 1) * 0.4));
                            score = 0;
                            color = '#475569';
                            pattern = (engine.distance > 2000 && Math.random() < 0.45) ? 'diagonal' : 'straight';
                        }

                        engine.enemies.push({
                            x: laneX,
                            y: -40,
                            baseX: laneX,
                            width: type === 'cruiser' ? 54 : type === 'meteor' ? 44 : 38,
                            height: type === 'cruiser' ? 50 : type === 'meteor' ? 44 : 38,
                            type,
                            hp,
                            maxHp: hp,
                            speed,
                            score,
                            color,
                            pattern,
                            phase: Math.random() * Math.PI * 2,
                            freq: 0.035,
                            amp: 26,
                            vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8),
                            rotation: 0,
                            rotSpeed: (Math.random() - 0.5) * 0.06,
                            diving: false
                        });
                    }
                }
            }

            // 4-B. 비정기 불규칙 기습 운석 난입 (Stray Meteor Hazard)
            // 거리와 점수에 비례하여 웨이브 주기와 독립적으로 낙하하며 긴장감 극대화
            if (engine.distance > 600 || engine.score > 15000) {
                const strayBaseInterval = Math.max(1600, 4800 / (1 + distKm * 0.32 + scoreProgression * 0.38));
                if (currentTime - engine.lastStrayMeteorTime > strayBaseInterval) {
                    engine.lastStrayMeteorTime = currentTime + (Math.random() * 600 - 300); // ±300ms 불규칙 지터

                    // 경고를 표시할 타겟 레인 선정
                    const chosenLaneIdx = Math.floor(Math.random() * LANES.length);
                    const targetLaneX = LANES[chosenLaneIdx];
                    const isDiagonal = (engine.distance > 3000 || engine.score > 80000) && Math.random() < 0.45;
                    const meteorSpeed = Math.min(7.0, (2.6 + Math.random() * 1.0) * (1 + (difficultyFactor - 1) * 0.35));

                    // 480ms 전 사전 시각 경고 등록
                    engine.meteorWarnings.push({
                        laneX: targetLaneX,
                        dropTime: currentTime + 480,
                        speed: meteorSpeed,
                        pattern: isDiagonal ? 'diagonal' : 'straight'
                    });

                    // 7000m or 20만점 이상 극후반부: 30% 확률로 다른 레인에 2중 기습 운석 추가 등록
                    if ((engine.distance > 7000 || engine.score > 200000) && Math.random() < 0.30) {
                        const secondLaneCandidates = LANES.filter(lx => lx !== targetLaneX);
                        const secondLaneX = secondLaneCandidates[Math.floor(Math.random() * secondLaneCandidates.length)];
                        engine.meteorWarnings.push({
                            laneX: secondLaneX,
                            dropTime: currentTime + 680,
                            speed: meteorSpeed * 1.08,
                            pattern: 'straight'
                        });
                    }
                }
            }

            // 사전 경고 시간이 도달한 기습 운석 실제 생성
            if (engine.meteorWarnings && engine.meteorWarnings.length > 0) {
                for (let wIdx = engine.meteorWarnings.length - 1; wIdx >= 0; wIdx--) {
                    const w = engine.meteorWarnings[wIdx];
                    if (currentTime >= w.dropTime) {
                        engine.enemies.push({
                            x: w.laneX,
                            y: -44,
                            baseX: w.laneX,
                            width: 44,
                            height: 44,
                            type: 'meteor',
                            hp: 999,
                            maxHp: 999,
                            speed: w.speed,
                            score: 0,
                            color: '#475569',
                            pattern: w.pattern,
                            phase: Math.random() * Math.PI * 2,
                            freq: 0.035,
                            amp: 26,
                            vx: (Math.random() > 0.5 ? 1 : -1) * (1.6 + Math.random() * 1.0),
                            rotation: 0,
                            rotSpeed: (Math.random() - 0.5) * 0.08,
                            diving: false
                        });
                        engine.meteorWarnings.splice(wIdx, 1);
                    }
                }
            }

            // 적 이동 & 행동 패턴 & 탄환 충돌 & 플레이어 충돌 판정
            const enemySpeedBoost = engine.hyperTime > 0 ? 5.0 : 1.0;

            for (let eIdx = engine.enemies.length - 1; eIdx >= 0; eIdx--) {
                const enemy = engine.enemies[eIdx];

                // 행동 패턴별 좌표 이동 (timeScale 보정)
                enemy.y += enemy.speed * enemySpeedBoost * timeScale;

                if (enemy.pattern === 'zigzag') {
                    enemy.x = enemy.baseX + Math.sin(enemy.y * (enemy.freq || 0.035) + enemy.phase) * (enemy.amp || 26);
                    enemy.x = Math.max(30, Math.min(GAME_WIDTH - 30, enemy.x));
                } else if (enemy.pattern === 'dive') {
                    if (!enemy.diving && enemy.y > 160 && Math.abs(enemy.x - engine.player.x) < 75) {
                        enemy.diving = true;
                        enemy.speed *= 1.75;
                        engine.addFloatingText('!', enemy.x, enemy.y - 25, '#ef4444', 28);
                    }
                } else if (enemy.pattern === 'diagonal') {
                    enemy.x += (enemy.vx || 1.2) * enemySpeedBoost * timeScale;
                    if (enemy.x < 30) {
                        enemy.x = 30;
                        enemy.vx = Math.abs(enemy.vx);
                    } else if (enemy.x > GAME_WIDTH - 30) {
                        enemy.x = GAME_WIDTH - 30;
                        enemy.vx = -Math.abs(enemy.vx);
                    }
                    enemy.rotation = (enemy.rotation || 0) + (enemy.rotSpeed || 0.04) * timeScale;
                }

                // 탄환과 충돌 판정
                const hitRadius = enemy.type === 'cruiser' ? 30 : enemy.type === 'meteor' ? 24 : 22;
                for (let bIdx = engine.bullets.length - 1; bIdx >= 0; bIdx--) {
                    const bullet = engine.bullets[bIdx];
                    const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
                    if (dist < hitRadius + 4) {
                        if (enemy.type === 'meteor') {
                            // 운석 피격 - 도탄 이펙트 (파괴 불가 피드백)
                            engine.bullets.splice(bIdx, 1);
                            engine.createExplosion(bullet.x, bullet.y, '#f97316', 3);
                            break;
                        }

                        // 적 피격
                        enemy.hp -= bullet.damage;
                        engine.bullets.splice(bIdx, 1);
                        engine.createExplosion(bullet.x, bullet.y, '#60a5fa', 4);

                        if (enemy.hp <= 0) {
                            // 적 처치
                            engine.kills += 1;
                            engine.score += enemy.score;
                            gameSound.playExplosion();
                            engine.createExplosion(enemy.x, enemy.y, enemy.color, 16);

                            // 아이템 or 보석 드랍 (골드 적은 100% 파워업, 일반 적은 9% 파워업 / 48% 보석)
                            if (enemy.type === 'gold') {
                                engine.spawnPowerup(enemy.x, enemy.y);
                            } else if (Math.random() < 0.09) {
                                engine.spawnPowerup(enemy.x, enemy.y);
                            } else if (Math.random() < 0.48) {
                                engine.spawnGem(enemy.x, enemy.y);
                            }

                            engine.enemies.splice(eIdx, 1);
                            break;
                        }
                    }
                }

                // 하이퍼 모드 충돌 (무적 분쇄)
                if (engine.hyperTime > 0 && eIdx < engine.enemies.length) {
                    const distToPlayer = Math.hypot(enemy.x - engine.player.x, enemy.y - engine.player.y);
                    if (distToPlayer < 45) {
                        engine.kills += 1;
                        engine.score += enemy.score * 2;
                        gameSound.playExplosion();
                        engine.createExplosion(enemy.x, enemy.y, '#ec4899', 20);
                        engine.spawnGem(enemy.x, enemy.y, 'gold');
                        engine.enemies.splice(eIdx, 1);
                        continue;
                    }
                }

                // 일반 모드 플레이어 충돌 판정
                if (engine.hyperTime <= 0 && engine.player.invincibleTime <= 0 && eIdx < engine.enemies.length) {
                    const distToPlayer = Math.hypot(enemy.x - engine.player.x, enemy.y - engine.player.y);
                    if (distToPlayer < 32) {
                        // 피격 처리
                        if (engine.hasShield) {
                            // 쉴드 깨짐
                            engine.hasShield = false;
                            engine.player.invincibleTime = 2200;
                            gameSound.playExplosion();
                            engine.createShockwave(engine.player.x, engine.player.y);
                            engine.addFloatingText('SHIELD BREAK!', engine.player.x, engine.player.y - 30, '#38bdf8', 20);

                            // 피격 페널티: 파워 1단계 감소 (최소 1단계)
                            if (engine.powerLevel > 1) {
                                engine.powerLevel -= 1;
                                engine.addFloatingText('POWER DOWN', engine.player.x, engine.player.y - 55, '#f59e0b', 16);
                            }
                        } else {
                            // 라이프 차감
                            engine.lives -= 1;
                            engine.player.invincibleTime = 2500;
                            gameSound.playExplosion();
                            engine.createShockwave(engine.player.x, engine.player.y);
                            engine.addFloatingText('LIFE LOST!', engine.player.x, engine.player.y - 30, '#ef4444', 22);

                            // 피격 페널티: 파워 1단계 감소 (최소 1단계)
                            if (engine.powerLevel > 1) {
                                engine.powerLevel -= 1;
                                engine.addFloatingText('POWER DOWN', engine.player.x, engine.player.y - 55, '#f59e0b', 16);
                            }

                            if (engine.lives <= 0) {
                                // 게임 오버!
                                engine.running = false;
                                triggerGameOver(engine);
                                return;
                            }
                        }
                        // 충돌한 적 파괴
                        engine.enemies.splice(eIdx, 1);
                        continue;
                    }
                }

                // 화면 하단 이탈
                if (enemy.y > GAME_HEIGHT + 60) {
                    engine.enemies.splice(eIdx, 1);
                }
            }

            // 5. 아이템 & 보석 업데이트
            const magnetActive = engine.magnetTime > 0 || engine.hyperTime > 0;

            for (let i = engine.items.length - 1; i >= 0; i--) {
                const item = engine.items[i];

                if (magnetActive) {
                    const dx = engine.player.x - item.x;
                    const dy = engine.player.y - item.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 1) {
                        item.x += (dx / dist) * 11 * timeScale;
                        item.y += (dy / dist) * 11 * timeScale;
                    }
                } else {
                    item.y += item.vy * (engine.hyperTime > 0 ? 3.0 : 1.0) * timeScale;
                }

                // 플레이어 획득 판정
                const distToPlayer = Math.hypot(item.x - engine.player.x, item.y - engine.player.y);
                if (distToPlayer < 36) {
                    if (item.type === 'gem') {
                        engine.score += item.score;
                        engine.gemsCollected += 1;
                        gameSound.playGem();
                        engine.addFloatingText(`+${item.score}`, item.x, item.y, '#fde047', 15);
                    } else if (item.type === 'powerup') {
                        gameSound.playPowerup();
                        if (item.powerType === 'power') {
                            if (engine.powerLevel < 3) {
                                engine.powerLevel += 1;
                                const powerMsg = engine.powerLevel === 3 ? 'MAX POWER!!' : 'POWER UP!';
                                engine.addFloatingText(powerMsg, item.x, item.y, '#3b82f6', 22);
                            } else {
                                // 이미 3단계(최대 파워) 상태에서 획득 시 보너스 1,000점 부여
                                engine.score += 1000;
                                engine.addFloatingText('MAX POWER +1000', item.x, item.y, '#60a5fa', 20);
                            }
                        } else if (item.powerType === 'magnet') {
                            engine.magnetTime = 8000; // 8초 자석
                            engine.addFloatingText('MAGNET!', item.x, item.y, '#a855f7', 22);
                        } else if (item.powerType === 'hyper') {
                            engine.hyperTime = 3500; // 3.5초 하이퍼 플라이트
                            engine.addFloatingText('HYPER FLIGHT!!', item.x, item.y, '#ec4899', 24);
                        } else if (item.powerType === 'bomb') {
                            engine.bombs = Math.min(3, engine.bombs + 1);
                            engine.addFloatingText('+1 BOMB', item.x, item.y, '#ef4444', 22);
                        }
                    }
                    engine.items.splice(i, 1);
                    continue;
                }

                if (item.y > GAME_HEIGHT + 30) {
                    engine.items.splice(i, 1);
                }
            }

            // 6. 파티클 및 텍스트 업데이트 (timeScale 보정)
            for (let i = engine.particles.length - 1; i >= 0; i--) {
                const p = engine.particles[i];
                if (p.isWave) {
                    p.radius += 12 * timeScale;
                    p.alpha -= p.decay * timeScale;
                } else {
                    p.x += p.vx * timeScale;
                    p.y += p.vy * timeScale;
                    p.alpha -= p.decay * timeScale;
                }
                if (p.alpha <= 0) {
                    engine.particles.splice(i, 1);
                }
            }

            for (let i = engine.floatingTexts.length - 1; i >= 0; i--) {
                const ft = engine.floatingTexts[i];
                ft.y += ft.vy * timeScale;
                ft.alpha -= 0.025 * timeScale;
                if (ft.alpha <= 0) {
                    engine.floatingTexts.splice(i, 1);
                }
            }

            // 7. 렌더링 (Canvas 2D)
            ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            // [우주 배경 그라데이션]
            const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
            bgGrad.addColorStop(0, engine.hyperTime > 0 ? '#1e1035' : '#030712');
            bgGrad.addColorStop(1, engine.hyperTime > 0 ? '#3b0764' : '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            // [별빛 렌더링 (timeScale 보정)]
            const starSpeed = engine.hyperTime > 0 ? 12 : 1;
            ctx.fillStyle = '#ffffff';
            engine.stars.forEach(star => {
                star.y += star.speed * starSpeed * timeScale;
                if (star.y > GAME_HEIGHT) star.y = 0;
                ctx.globalAlpha = star.alpha;
                ctx.beginPath();
                if (engine.hyperTime > 0) {
                    // 워프 스트릭 효과
                    ctx.strokeStyle = '#c084fc';
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(star.x, star.y);
                    ctx.lineTo(star.x, star.y + 25);
                    ctx.stroke();
                } else {
                    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1.0;

            // [레인 가이드 점선 (은은한 PS 무드)]
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            LANES.forEach(lx => {
                ctx.beginPath();
                ctx.setLineDash([8, 12]);
                ctx.moveTo(lx, 0);
                ctx.lineTo(lx, GAME_HEIGHT);
                ctx.stroke();
            });
            ctx.setLineDash([]);

            // [기습 운석 경고 인디케이터 (Hazard Warning)]
            if (engine.meteorWarnings && engine.meteorWarnings.length > 0) {
                engine.meteorWarnings.forEach(w => {
                    const pulse = (Math.sin(currentTime * 0.024) + 1) * 0.5;
                    const alpha = 0.3 + pulse * 0.5;

                    // 해당 레인 반투명 붉은색 경고 빔
                    ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.22})`;
                    ctx.fillRect(w.laneX - 25, 0, 50, 160);

                    // 레인 상단 경고 비콘 및 아이콘
                    ctx.save();
                    ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                    ctx.font = 'bold 15px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('▲ ! ▲', w.laneX, 24);

                    // 경고 테두리 박스
                    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.75})`;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(w.laneX - 24, 6, 48, 36);
                    ctx.restore();
                });
            }

            // [충격파 및 파티클 렌더링]
            engine.particles.forEach(p => {
                ctx.globalAlpha = Math.max(0, p.alpha);
                if (p.isWave) {
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1.0;

            // [탄환 렌더링 (모바일 GPU 발열/부하 방지 최적화)]
            if (engine.bullets.length > 0) {
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 6;
                ctx.fillStyle = '#67e8f9';
                engine.bullets.forEach(b => {
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
                    ctx.fill();

                    // 탄환 꼬리
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2);
                    ctx.stroke();
                });
                ctx.shadowBlur = 0;
            }

            // [아이템 / 보석 렌더링]
            engine.items.forEach(item => {
                if (item.type === 'gem') {
                    ctx.save();
                    ctx.translate(item.x, item.y);
                    const color = item.gemType === 'gold' ? '#fbbf24' : item.gemType === 'red' ? '#f43f5e' : '#38bdf8';
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = color;
                    // 다이아몬드 보석 형상
                    ctx.beginPath();
                    ctx.moveTo(0, -11);
                    ctx.lineTo(10, 0);
                    ctx.lineTo(0, 11);
                    ctx.lineTo(-10, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                } else if (item.type === 'powerup') {
                    ctx.save();
                    ctx.translate(item.x, item.y);
                    ctx.shadowColor = '#ec4899';
                    ctx.shadowBlur = 14;
                    ctx.fillStyle = '#0f172a';
                    ctx.strokeStyle = '#ec4899';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 아이콘 심볼 텍스트
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const label = item.powerType === 'power' ? 'P' : item.powerType === 'magnet' ? 'M' : item.powerType === 'hyper' ? 'H' : 'B';
                    ctx.fillText(label, 0, 1);
                    ctx.restore();
                }
            });
            ctx.shadowBlur = 0;

            // [적 렌더링 (PS 정찰기 / 순양함 / 골드 / 운석)]
            engine.enemies.forEach(enemy => {
                ctx.save();
                ctx.translate(enemy.x, enemy.y);

                if (enemy.type === 'scout') {
                    // 1. 스카우트 (Scout): 날렵한 빨간색 삼각 스텔스기 (38x38)
                    // 후방 제트 불꽃
                    ctx.fillStyle = '#f97316';
                    ctx.beginPath();
                    ctx.moveTo(-6, -14);
                    ctx.lineTo(0, -22 - Math.random() * 6);
                    ctx.lineTo(6, -14);
                    ctx.closePath();
                    ctx.fill();

                    // 다이브 돌진 중일 때 강렬한 붉은 오라 경고
                    ctx.shadowColor = enemy.diving ? '#ff0000' : '#ef4444';
                    ctx.shadowBlur = enemy.diving ? 18 : 8;

                    // 본체 (날카로운 델타 윙)
                    ctx.fillStyle = '#dc2626';
                    ctx.strokeStyle = '#fca5a5';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 18);          // 노즈(하단)
                    ctx.lineTo(17, -12);        // 우측 날개 끝
                    ctx.lineTo(6, -8);          // 우측 날개 안쪽
                    ctx.lineTo(0, -14);         // 후방 중앙
                    ctx.lineTo(-6, -8);         // 좌측 날개 안쪽
                    ctx.lineTo(-17, -12);       // 좌측 날개 끝
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // 조종석 콕핏 (PS 십자 X 심볼)
                    ctx.fillStyle = '#450a0a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fca5a5';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(-2.5, -2.5);
                    ctx.lineTo(2.5, 2.5);
                    ctx.moveTo(2.5, -2.5);
                    ctx.lineTo(-2.5, 2.5);
                    ctx.stroke();

                } else if (enemy.type === 'cruiser') {
                    // 2. 크루저 (Cruiser): 웅장한 보라빛 육각형 중장갑 드레드노트 (54x50)
                    ctx.shadowColor = '#a855f7';
                    ctx.shadowBlur = 12;

                    // 좌우 중장갑 날개
                    ctx.fillStyle = '#3b0764';
                    ctx.strokeStyle = '#c084fc';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 24);          // 전면 장갑
                    ctx.lineTo(25, 6);          // 우측 전방 날개
                    ctx.lineTo(22, -18);        // 우측 후방
                    ctx.lineTo(10, -14);
                    ctx.lineTo(0, -20);         // 후면 중앙
                    ctx.lineTo(-10, -14);
                    ctx.lineTo(-22, -18);       // 좌측 후방
                    ctx.lineTo(-25, 6);         // 좌측 전방 날개
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // 사이드 사이언 에너지 라인 (PS 콘딧)
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-16, -6);
                    ctx.lineTo(-18, 4);
                    ctx.moveTo(16, -6);
                    ctx.lineTo(18, 4);
                    ctx.stroke();

                    // 중앙 코어: PS 네모(■) 심볼
                    ctx.fillStyle = '#6b21a8';
                    ctx.fillRect(-7, -7, 14, 14);
                    ctx.strokeStyle = '#e9d5ff';
                    ctx.lineWidth = 1.8;
                    ctx.strokeRect(-5, -5, 10, 10);

                    // 상단 와이드 체력바 (체력에 따라 녹색->주황->빨강 전환)
                    const barW = 44;
                    const barH = 5;
                    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                    ctx.fillRect(-barW / 2, -28, barW, barH);
                    ctx.fillStyle = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#f59e0b' : '#ef4444';
                    ctx.fillRect(-barW / 2, -28, barW * hpPct, barH);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-barW / 2, -28, barW, barH);

                } else if (enemy.type === 'gold') {
                    // 3. 골드 플라이트 (Gold Flight): 황금빛 다이아몬드 별 (40x40, 100% 파워업 드롭)
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 20;

                    // 황금빛 회전 프리즘 스타
                    ctx.fillStyle = '#f59e0b';
                    ctx.strokeStyle = '#fef08a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 20);
                    ctx.lineTo(14, 10);
                    ctx.lineTo(20, 0);
                    ctx.lineTo(14, -10);
                    ctx.lineTo(0, -20);
                    ctx.lineTo(-14, -10);
                    ctx.lineTo(-20, 0);
                    ctx.lineTo(-14, 10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // 내부 골드 젬 코어
                    ctx.fillStyle = '#fef08a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#b45309';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                    ctx.stroke();

                    // 체력 바 (2 HP)
                    const barW = 32;
                    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(-barW / 2, -26, barW, 4);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(-barW / 2, -26, barW * hpPct, 4);

                } else if (enemy.type === 'meteor') {
                    // 4. 메테오 (Meteor): 파괴 불가 암석 운석 (44x44)
                    if (enemy.rotation) ctx.rotate(enemy.rotation);

                    // 타오르는 화염 꼬리 / 열기
                    ctx.shadowColor = '#ea580c';
                    ctx.shadowBlur = 14;

                    // 울퉁불퉁 암석 다각형
                    ctx.fillStyle = '#334155';
                    ctx.strokeStyle = '#ea580c';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 19);
                    ctx.lineTo(14, 14);
                    ctx.lineTo(20, -2);
                    ctx.lineTo(12, -18);
                    ctx.lineTo(-4, -20);
                    ctx.lineTo(-18, -10);
                    ctx.lineTo(-19, 8);
                    ctx.lineTo(-10, 18);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // 크레이터 음영
                    ctx.fillStyle = '#1e293b';
                    ctx.beginPath();
                    ctx.arc(-5, -4, 4.5, 0, Math.PI * 2);
                    ctx.arc(7, 5, 3.5, 0, Math.PI * 2);
                    ctx.arc(-4, 9, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });
            ctx.shadowBlur = 0;

            // [플레이어 기체 렌더링 (PS 듀얼센스 스타파이터)]
            const isBlinking = engine.player.invincibleTime > 0 && Math.floor(currentTime / 100) % 2 === 0;
            if (!isBlinking) {
                ctx.save();
                ctx.translate(engine.player.x, engine.player.y);

                // 부스터 불꽃
                const thrusterH = 15 + Math.random() * 12 + (engine.hyperTime > 0 ? 30 : 0);
                ctx.fillStyle = engine.hyperTime > 0 ? '#ec4899' : '#38bdf8';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(-9, 22);
                ctx.lineTo(0, 22 + thrusterH);
                ctx.lineTo(9, 22);
                ctx.closePath();
                ctx.fill();

                // 쉴드 오라
                if (engine.hasShield) {
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 32, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // 하이퍼 무적 무지개 잔상
                if (engine.hyperTime > 0) {
                    ctx.strokeStyle = '#f43f5e';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, 36, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // 기체 본체 (PlayStation 화이트 & 블루)
                ctx.fillStyle = '#f8fafc';
                ctx.strokeStyle = '#0070d1';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, -26); // 노즈
                ctx.lineTo(22, 18);  // 우측 날개
                ctx.lineTo(10, 16);  // 우측 안쪽
                ctx.lineTo(0, 22);   // 후방 중앙
                ctx.lineTo(-10, 16); // 좌측 안쪽
                ctx.lineTo(-22, 18); // 좌측 날개
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 조종석 캐노피 (PS 블루 네온)
                ctx.fillStyle = '#0070d1';
                ctx.beginPath();
                ctx.ellipse(0, -4, 5, 11, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            // [부유 텍스트 렌더링]
            engine.floatingTexts.forEach(ft => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, ft.alpha);
                ctx.font = `black ${ft.size}px sans-serif`;
                ctx.fillStyle = ft.color;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 6;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
            });

            // 주기적 HUD 동기화 (100ms 쓰로틀링 - 불필요한 리액트 리렌더링 및 모바일 발열/배터리 소모 방지)
            if (currentTime - (engine.lastHudSync || 0) > 100) {
                engine.lastHudSync = currentTime;
                engine.syncHud();
            }

            animFrameIdRef.current = requestAnimationFrame(loop);
        };

        animFrameIdRef.current = requestAnimationFrame(loop);

        return () => {
            engine.running = false;
            cancelAnimationFrame(animFrameIdRef.current);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchstart', handleTouchStart);
        };
    }, [gameState]);

    // 게임 오버 처리 및 점수 등록
    const triggerGameOver = async (engine) => {
        setGameState('GAMEOVER');
        gameSound.playExplosion();

        const finalScore = Math.floor(engine.score);
        const flightDistance = Math.floor(engine.distance);
        const playTimeSec = Math.max(1, Math.floor((Date.now() - engine.gameStartTime) / 1000));
        const isNew = finalScore > bestScore;

        if (isNew) {
            setBestScore(finalScore);
            gameSound.playTrophy();
        }

        setGameOverStats({
            score: finalScore,
            distance: flightDistance,
            kills: engine.kills,
            gems: engine.gemsCollected,
            isNewRecord: isNew,
            isSubmitting: isAuthenticated,
            submitSuccess: false
        });

        // 로그인된 경우 백엔드 리더보드 등록
        if (isAuthenticated && user) {
            try {
                const res = await arcadeApi.submitScore('flight', {
                    score: finalScore,
                    clearTimeSec: playTimeSec,
                    user
                });
                setGameOverStats(prev => ({
                    ...prev,
                    isSubmitting: false,
                    submitSuccess: res.success !== false
                }));
            } catch (err) {
                console.error('[DragonFlight] 점수 등록 실패:', err);
                setGameOverStats(prev => ({ ...prev, isSubmitting: false }));
            }
        }
    };

    return (
        <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-base p-2 sm:p-4 select-none overflow-hidden">
            {/* 상단 네비게이션 & 빠른 컨트롤 바 */}
            <div className="w-full max-w-[450px] flex items-center justify-between mb-2 px-2 shrink-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-divider hover:border-primary text-secondary hover:text-primary text-xs font-bold transition-all"
                >
                    <Home className="w-3.5 h-3.5" />
                    <span>아케이드 허브</span>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onOpenLeaderboard('flight')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-divider hover:border-yellow-500/50 text-yellow-500 text-xs font-bold transition-all"
                        title="순위표"
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>TOP 10</span>
                    </button>

                    <button
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary transition-all"
                    >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-ps-blue" />}
                    </button>
                </div>
            </div>

            {/* 메인 게임 캐비닛 컨테이너 */}
            <div className="relative w-full max-w-[450px] h-[650px] sm:h-[720px] bg-black rounded-3xl border-2 border-divider shadow-2xl overflow-hidden flex flex-col">
                {/* 상단 HUD 오버레이 (게임 플레이 중 상시 노출) */}
                {gameState === 'PLAYING' && (
                    <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
                        {/* 거리 & 점수 */}
                        <div className="whitespace-nowrap shrink-0">
                            <div className="flex items-baseline gap-1 whitespace-nowrap">
                                <span className="text-xl sm:text-2xl font-black italic tracking-tighter text-white font-mono">
                                    {hudData.distance.toLocaleString()}
                                </span>
                                <span className="text-xs font-bold text-ps-blue">M</span>
                            </div>
                            <div className="text-[11px] font-bold text-secondary font-mono whitespace-nowrap">
                                {hudData.score.toLocaleString()} PTS
                            </div>
                        </div>

                        {/* 상태 아이콘 (라이프, 쉴드, 파워레벨, 폭탄) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0 whitespace-nowrap">
                            {/* 라이프 & 쉴드 */}
                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10">
                                {[...Array(2)].map((_, i) => (
                                    <Heart
                                        key={i}
                                        className={`w-3.5 h-3.5 ${
                                            i < hudData.lives ? 'text-red-500 fill-current' : 'text-zinc-600'
                                        }`}
                                    />
                                ))}
                                <Shield
                                    className={`w-3.5 h-3.5 ml-0.5 ${
                                        hudData.hasShield ? 'text-cyan-400 fill-cyan-400/40' : 'text-zinc-600'
                                    }`}
                                />
                            </div>

                            {/* 파워 레벨 (Lv.1, Lv.2, MAX) */}
                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 text-[11px] font-mono font-bold">
                                <span className="text-zinc-400">PWR</span>
                                <span className={hudData.powerLevel === 3 ? 'text-yellow-400 font-black' : 'text-blue-400'}>
                                    {hudData.powerLevel === 3 ? 'MAX' : `Lv.${hudData.powerLevel}`}
                                </span>
                            </div>

                            {/* 폭탄 발사 버튼 */}
                            <button
                                onClick={triggerBomb}
                                disabled={hudData.bombs <= 0}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-black transition-all ${
                                    hudData.bombs > 0
                                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 active:scale-90'
                                        : 'bg-zinc-800/40 border-zinc-700/30 text-zinc-600'
                                }`}
                                title="폭탄 발사 (Spacebar)"
                            >
                                <Bomb className="w-3.5 h-3.5" />
                                <span>{hudData.bombs}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* HTML5 Canvas 화면 */}
                <canvas
                    ref={canvasRef}
                    width={GAME_WIDTH}
                    height={GAME_HEIGHT}
                    className="w-full h-full object-cover touch-none cursor-crosshair"
                />

                {/* 게임 시작 브리핑 & 카운트다운 오버레이 */}
                {gameState === 'IDLE' && (
                    <GameStartOverlay
                        title="PS 드래곤 플라이트"
                        subtitle="무한 우주를 질주하며 적을 격추하고 최고 거리에 도달하세요!"
                        badgeText="ARCADE FLIGHT"
                        badgeColor="bg-ps-blue"
                        instructions={[
                            'PC는 방향키/마우스, 모바일은 화면을 좌우로 터치 & 드래그하여 조작합니다.',
                            '적 격추 시 드랍되는 파워샷(P), 자석(M), 하이퍼 플라이트(H)를 획득하세요.',
                            '위험할 땐 폭탄(스페이스바 / 우측 상단 버튼)을 눌러 화면을 전멸시키세요!',
                            '적과 충돌 시 쉴드/라이프가 차감되며, 0이 되면 게임이 종료됩니다.'
                        ]}
                        highScore={bestScore}
                        onStart={handleStartGame}
                        onBack={onBack}
                    />
                )}

                {/* 게임 오버 결과 모달 */}
                {gameState === 'GAMEOVER' && (
                    <div
                        onClick={() => setGameState('IDLE')}
                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md p-5 animate-in fade-in duration-300 cursor-pointer"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-surface border border-divider rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center cursor-default"
                        >
                            {/* 트로피 / 신기록 뱃지 */}
                            {gameOverStats.isNewRecord ? (
                                <div className="p-3.5 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 mb-3 animate-bounce">
                                    <Crown className="w-8 h-8" />
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-ps-blue/15 border border-ps-blue/30 text-ps-blue mb-3">
                                    <Trophy className="w-8 h-8" />
                                </div>
                            )}

                            <h2 className="text-xl font-black text-primary mb-1 flex items-center justify-center gap-1.5 whitespace-nowrap">
                                {gameOverStats.isNewRecord && <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse shrink-0" />}
                                <span>{gameOverStats.isNewRecord ? '새로운 최고 기록 경신!' : 'GAME OVER'}</span>
                                {gameOverStats.isNewRecord && <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse shrink-0" />}
                            </h2>
                            <p className="text-xs text-secondary mb-5 font-medium whitespace-nowrap">
                                격추와 회피로 달성한 비행 결과입니다.
                            </p>

                            {/* 점수 요약 카드 */}
                            <div className="w-full bg-base rounded-2xl p-4 border border-divider space-y-2.5 mb-5">
                                <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                    <span className="text-secondary font-bold">최종 점수</span>
                                    <span className="text-lg font-black text-ps-blue font-mono">
                                        {gameOverStats.score.toLocaleString()}P
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                    <span className="text-secondary font-bold">비행 거리</span>
                                    <span className="font-black text-primary font-mono">
                                        {gameOverStats.distance.toLocaleString()} M
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                    <span className="text-secondary font-bold">적 격추 수</span>
                                    <span className="font-black text-primary font-mono">
                                        {gameOverStats.kills}기
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs whitespace-nowrap">
                                    <span className="text-secondary font-bold">보석 획득</span>
                                    <span className="font-black text-amber-500 font-mono">
                                        {gameOverStats.gems}개
                                    </span>
                                </div>
                            </div>

                            {/* 로그인 / 랭킹 등록 상태 */}
                            {!isAuthenticated ? (
                                <div className="w-full mb-5 p-3 rounded-2xl bg-ps-blue/10 border border-ps-blue/20 text-center">
                                    <p className="text-xs text-primary font-bold mb-2">
                                        로그인하고 글로벌 리더보드에 이름을 등록하세요!
                                    </p>
                                    <button
                                        onClick={openLoginModal}
                                        className="w-full py-2 rounded-xl bg-ps-blue text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md hover:bg-blue-600 transition-all whitespace-nowrap"
                                    >
                                        <LogIn className="w-3.5 h-3.5" />
                                        <span>로그인하기</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full mb-4 text-xs font-bold text-secondary">
                                    {gameOverStats.isSubmitting ? (
                                        <span className="text-ps-blue animate-pulse">리더보드에 점수를 등록하는 중...</span>
                                    ) : gameOverStats.submitSuccess ? (
                                        <span className="text-emerald-500 flex items-center justify-center gap-1.5 whitespace-nowrap">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span>리더보드에 점수가 안전하게 등록되었습니다!</span>
                                        </span>
                                    ) : null}
                                </div>
                            )}

                            {/* 하단 액션 버튼 */}
                            <div className="w-full flex items-center gap-2">
                                <button
                                    onClick={handleStartGame}
                                    className="flex-1 py-3 rounded-2xl bg-ps-blue hover:bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>다시 도전</span>
                                </button>
                                <button
                                    onClick={() => onOpenLeaderboard('flight')}
                                    className="py-3 px-3.5 rounded-2xl bg-base hover:bg-surface-hover border border-divider text-yellow-500 font-bold transition-all"
                                    title="순위표 확인"
                                >
                                    <Trophy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 하단 단축키 & 모바일 터치 가이드 */}
            <div className="mt-3 text-[11px] text-secondary font-medium text-center hidden sm:block">
                좌우 이동: <kbd className="px-1.5 py-0.5 rounded bg-surface border border-divider font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-surface border border-divider font-mono">→</kbd> 또는 마우스 드래그 | 폭탄: <kbd className="px-1.5 py-0.5 rounded bg-surface border border-divider font-mono">Space</kbd>
            </div>
        </div>
    );
};

export default DragonFlightGame;
