import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Circle,
    Triangle,
    X as CrossIcon,
    Square,
    ArrowLeft,
    Trophy,
    Volume2,
    VolumeX,
    Sparkles,
    Shield,
    Zap,
    Flame,
    Crown,
    ShoppingBag,
    Coins,
    Hammer,
    HelpCircle,
    CheckCircle2,
    AlertTriangle,
    LogIn,
    Award
} from 'lucide-react';
import { gameSound } from '../../utils/gameSound';
import { arcadeApi } from '../../api/arcadeApi';
import { useAuth } from '../../contexts/AuthContext';
import { SymbolVisualCore } from './SymbolVisualCore';
import { SymbolSatellites } from './SymbolSatellites';

// 4대 심볼 고유 메타데이터 & 우주/사이버네틱 비주얼 테마 정의
export const SYMBOLS = {
    CIRCLE: {
        code: 2,
        key: 'CIRCLE',
        name: '서클',
        title: '솔라 레드 코어',
        color: '#EF4444',
        borderClass: 'border-red-500',
        bgClass: 'bg-red-500/15',
        textClass: 'text-red-500',
        glowColor: 'rgba(239, 68, 68, 0.6)',
        themeDesc: '태양 흑점 -> 중력 블랙홀 -> 초신성 코어',
        passiveName: '태양의 순환',
        passiveDesc: '성공 시 12% 확률로 +2강 크리티컬 진화 및 판매 시 골드 +15% 추가',
        icon: Circle
    },
    TRIANGLE: {
        code: 1,
        key: 'TRIANGLE',
        name: '트라이앵글',
        title: '에메랄드 프리즘',
        color: '#10B981',
        borderClass: 'border-emerald-500',
        bgClass: 'bg-emerald-500/15',
        textClass: 'text-emerald-500',
        glowColor: 'rgba(16, 185, 129, 0.6)',
        themeDesc: '에메랄드 원석 -> 차원 프리즘 -> 고대 피라미드',
        passiveName: '견고한 구조',
        passiveDesc: '실패 시 레벨 하락(-1, -2) 확률 25% 경감 (레벨 유지 확률 대폭 증가)',
        icon: Triangle
    },
    CROSS: {
        code: 3,
        key: 'CROSS',
        name: '크로스',
        title: '볼테이지 썬더',
        color: '#0070D1',
        borderClass: 'border-blue-500',
        bgClass: 'bg-blue-500/15',
        textClass: 'text-ps-blue',
        glowColor: 'rgba(0, 112, 209, 0.6)',
        themeDesc: '고전압 테슬라 -> 네온 썬더볼트 -> 뇌신 코어',
        passiveName: '하이 볼티지',
        passiveDesc: '강화 성공 시 피버 게이지 충전량 2배 및 15강 이상 대박 보너스',
        icon: CrossIcon
    },
    SQUARE: {
        code: 4,
        key: 'SQUARE',
        name: '스퀘어',
        title: '양자 테서랙트',
        color: '#D946EF',
        borderClass: 'border-fuchsia-500',
        bgClass: 'bg-fuchsia-500/15',
        textClass: 'text-fuchsia-500',
        glowColor: 'rgba(217, 70, 239, 0.6)',
        themeDesc: '양자 격자 -> 3D 큐브 -> 4차원 하이퍼큐브',
        passiveName: '양자 압축',
        passiveDesc: '모든 강화 비용 및 상점 아이템 구매 가격 20% 영구 할인',
        icon: Square
    }
};

// 기획서 확정 강화 밸런스 테이블 (0->1 ~ 19->20)
export const FORGE_TABLE = [
    { from: 0, to: 1, success: 1.00, keep: 0.00, drop1: 0.00, drop2: 0.00, destroy: 0.00, cost: 100, sellPrice: 1200 },
    { from: 1, to: 2, success: 0.95, keep: 0.05, drop1: 0.00, drop2: 0.00, destroy: 0.00, cost: 200, sellPrice: 1600 },
    { from: 2, to: 3, success: 0.90, keep: 0.10, drop1: 0.00, drop2: 0.00, destroy: 0.00, cost: 300, sellPrice: 2300 },
    { from: 3, to: 4, success: 0.85, keep: 0.15, drop1: 0.00, drop2: 0.00, destroy: 0.00, cost: 500, sellPrice: 3500 },
    { from: 4, to: 5, success: 0.80, keep: 0.20, drop1: 0.00, drop2: 0.00, destroy: 0.00, cost: 800, sellPrice: 5500 },
    { from: 5, to: 6, success: 0.75, keep: 0.25, drop1: 0.00, drop2: 0.00, destroy: 0.00, cost: 1200, sellPrice: 9000 },
    { from: 6, to: 7, success: 0.65, keep: 0.25, drop1: 0.10, drop2: 0.00, destroy: 0.00, cost: 2000, sellPrice: 16000 },
    { from: 7, to: 8, success: 0.55, keep: 0.25, drop1: 0.20, drop2: 0.00, destroy: 0.00, cost: 3000, sellPrice: 30000 },
    { from: 8, to: 9, success: 0.45, keep: 0.25, drop1: 0.30, drop2: 0.00, destroy: 0.00, cost: 4500, sellPrice: 55000 },
    { from: 9, to: 10, success: 0.40, keep: 0.20, drop1: 0.40, drop2: 0.00, destroy: 0.00, cost: 6500, sellPrice: 100000 },
    { from: 10, to: 11, success: 0.35, keep: 0.20, drop1: 0.45, drop2: 0.00, destroy: 0.00, cost: 10000, sellPrice: 180000 },
    { from: 11, to: 12, success: 0.30, keep: 0.00, drop1: 0.60, drop2: 0.10, destroy: 0.00, cost: 15000, sellPrice: 320000 },
    { from: 12, to: 13, success: 0.25, keep: 0.00, drop1: 0.65, drop2: 0.10, destroy: 0.00, cost: 22000, sellPrice: 600000 },
    { from: 13, to: 14, success: 0.20, keep: 0.00, drop1: 0.70, drop2: 0.10, destroy: 0.00, cost: 32000, sellPrice: 1100000 },
    { from: 14, to: 15, success: 0.15, keep: 0.00, drop1: 0.75, drop2: 0.10, destroy: 0.00, cost: 45000, sellPrice: 2000000 },
    { from: 15, to: 16, success: 0.12, keep: 0.00, drop1: 0.68, drop2: 0.00, destroy: 0.20, cost: 70000, sellPrice: 4000000 },
    { from: 16, to: 17, success: 0.09, keep: 0.00, drop1: 0.66, drop2: 0.00, destroy: 0.25, cost: 100000, sellPrice: 8000000 },
    { from: 17, to: 18, success: 0.06, keep: 0.00, drop1: 0.64, drop2: 0.00, destroy: 0.30, cost: 150000, sellPrice: 18000000 },
    { from: 18, to: 19, success: 0.04, keep: 0.00, drop1: 0.61, drop2: 0.00, destroy: 0.35, cost: 220000, sellPrice: 40000000 },
    { from: 19, to: 20, success: 0.025, keep: 0.00, drop1: 0.575, drop2: 0.00, destroy: 0.40, cost: 350000, sellPrice: 100000000 }
];

const RAW_SYMBOL_COST = 1000;
const INITIAL_GOLD = 5000;
const LUCKY_RUNE_PRICE = 5000;
const AEGIS_SEAL_PRICE = 80000;

const SymbolForgeGame = ({ onBack, onOpenLeaderboard }) => {
    const { isAuthenticated, user, openLoginModal } = useAuth();

    // 상태: 'SELECT' (심볼 선택) | 'FORGE' (대장간 앤빌)
    const [gameState, setGameState] = useState('SELECT');
    const [symbolKey, setSymbolKey] = useState('CIRCLE');
    const currentSymbol = SYMBOLS[symbolKey];

    // 자원 및 인게임 인벤토리
    const [gold, setGold] = useState(INITIAL_GOLD);
    const [currentLevel, setCurrentLevel] = useState(0); // 0~20, null이면 앤빌 빈 상태
    const [sessionBestLevel, setSessionBestLevel] = useState(0);
    const [luckyRuneActive, setLuckyRuneActive] = useState(false);
    const [aegisSealCount, setAegisSealCount] = useState(0);
    const [feverGauge, setFeverGauge] = useState(0); // 0~100
    const [isFeverReady, setIsFeverReady] = useState(false);

    // 연출 및 애니메이션 상태
    const [isForging, setIsForging] = useState(false);
    const [screenShake, setScreenShake] = useState(false);
    const [hammerSwing, setHammerSwing] = useState(false);
    const [resultInfo, setResultInfo] = useState(null); // { type, text }

    // 모달 상태
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [endModal, setEndModal] = useState({ isOpen: false, type: null, finalLevel: 0, finalGold: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // 오디오 음소거 토글
    const [isMuted, setIsMuted] = useState(gameSound.getMuted());
    const startTimeRef = useRef(Date.now());

    // ─────────────────────────────────────────────────────────────
    // 고성능 무부하 Canvas 파티클 엔진 (React 리렌더링 0회, 저발열)
    // ─────────────────────────────────────────────────────────────
    const canvasRef = useRef(null);
    const sparksRef = useRef([]);
    const animFrameRef = useRef(null);

    const triggerSparks = useCallback((count = 20, color = '#ffffff') => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = canvas.width || 300;
        const height = canvas.height || 300;
        const originX = width / 2;
        const originY = height / 2;

        const newParticles = Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2.5;
            return {
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: Math.random() * 3 + 1.5,
                alpha: 1.0,
                decay: Math.random() * 0.035 + 0.02
            };
        });

        sparksRef.current = [...sparksRef.current, ...newParticles];

        if (!animFrameRef.current) {
            const loop = () => {
                const cvs = canvasRef.current;
                if (!cvs) {
                    animFrameRef.current = null;
                    return;
                }
                const ctx = cvs.getContext('2d');
                if (!ctx) {
                    animFrameRef.current = null;
                    return;
                }
                ctx.clearRect(0, 0, cvs.width, cvs.height);

                const alive = [];
                for (let i = 0; i < sparksRef.current.length; i++) {
                    const p = sparksRef.current[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.12; // 중력
                    p.alpha -= p.decay;

                    if (p.alpha > 0) {
                        ctx.save();
                        ctx.globalAlpha = Math.max(0, p.alpha);
                        ctx.fillStyle = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        alive.push(p);
                    }
                }
                sparksRef.current = alive;

                if (alive.length > 0) {
                    animFrameRef.current = requestAnimationFrame(loop);
                } else {
                    ctx.clearRect(0, 0, cvs.width, cvs.height);
                    animFrameRef.current = null;
                }
            };
            animFrameRef.current = requestAnimationFrame(loop);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);

    const toggleSound = () => {
        const next = gameSound.toggleMute();
        setIsMuted(next);
    };

    // 심볼 선택 완료
    const handleSelectSymbol = (key) => {
        setSymbolKey(key);
        setGameState('FORGE');
        setCurrentLevel(0);
        setSessionBestLevel(0);
        setGold(INITIAL_GOLD);
        setLuckyRuneActive(false);
        setAegisSealCount(0);
        setFeverGauge(0);
        setIsFeverReady(false);
        setResultInfo(null);
        startTimeRef.current = Date.now();
        gameSound.playSelect();
    };

    // 강화 비용 계산 (스퀘어 패시브: 20% 할인)
    const getDiscountedPrice = (rawCost) => {
        if (symbolKey === 'SQUARE') {
            return Math.floor(rawCost * 0.8);
        }
        return rawCost;
    };

    // 현재 단계 정보
    const currentTableEntry = currentLevel !== null && currentLevel < 20 ? FORGE_TABLE[currentLevel] : null;
    const upgradeCost = currentTableEntry ? getDiscountedPrice(currentTableEntry.cost) : 0;
    const currentSellPrice = currentLevel !== null
        ? Math.floor((currentLevel === 0 ? RAW_SYMBOL_COST : FORGE_TABLE[currentLevel - 1].sellPrice) * (symbolKey === 'CIRCLE' ? 1.15 : 1.0))
        : 0;

    // 망치질 (강화 시도)
    const handleForge = useCallback(() => {
        if (isForging || currentLevel === null || currentLevel >= 20) return;

        // 골드 체크 (피버 발동 시 0원)
        const effectiveCost = isFeverReady ? 0 : upgradeCost;
        if (gold < effectiveCost) {
            setResultInfo({
                type: 'FAIL',
                text: '골드가 부족합니다. 상점에 판매하거나 새 심볼을 거치하세요.'
            });
            gameSound.playForgeFail();
            return;
        }

        // 비용 지불
        setGold(prev => prev - effectiveCost);
        setIsForging(true);
        setHammerSwing(true);
        setScreenShake(true);
        setResultInfo(null);

        // 1) 망치 타격음 및 스파크
        gameSound.playHammerStrike();
        triggerSparks(12 + currentLevel * 2, currentSymbol.color);

        // 0.18초 후 스크린 쉐이크 해제 & 텐션 사운드
        setTimeout(() => {
            setScreenShake(false);
            setHammerSwing(false);
            gameSound.playForgeTension();
        }, 180);

        // 0.6초 후 결과 판정
        setTimeout(() => {
            const entry = currentTableEntry;
            if (!entry) {
                setIsForging(false);
                return;
            }

            // 성공 확률 보정 (행운의 룬 +5%p, 피버 +15%p)
            let successRate = entry.success;
            if (luckyRuneActive) successRate += 0.05;
            if (isFeverReady) successRate += 0.15;
            if (symbolKey === 'CROSS' && entry.success < 1.0) {
                successRate = Math.max(0.01, successRate - 0.03);
            }
            successRate = Math.min(1.0, successRate);

            // 룬 및 피버 소모 (피버 사용 시 게이지 0 리셋)
            const usedFever = isFeverReady;
            if (luckyRuneActive) setLuckyRuneActive(false);
            if (usedFever) {
                setIsFeverReady(false);
                setFeverGauge(0);
            }

            const roll = Math.random();

            // A. 성공 판정
            if (roll <= successRate) {
                const isCrit = symbolKey === 'CIRCLE' && Math.random() < 0.12 && currentLevel + 2 <= 20;
                const nextLevel = isCrit ? currentLevel + 2 : currentLevel + 1;

                setCurrentLevel(nextLevel);
                setSessionBestLevel(prev => Math.max(prev, nextLevel));
                setResultInfo({
                    type: isCrit ? 'CRIT' : 'SUCCESS',
                    text: usedFever
                        ? (isCrit ? `골든 해머 태양 크리티컬! +2단계 대성공 (+${nextLevel}강)` : `골든 해머 피버 성공! (+${nextLevel}강)`)
                        : (isCrit ? `태양 크리티컬 진화! +2단계 대성공 (+${nextLevel}강)` : `강화 성공! (+${nextLevel}강)`)
                });
                gameSound.playForgeSuccess(nextLevel);

                // 피버 일격 소모 턴이 아닐 때만 피버 게이지 충전
                if (!usedFever) {
                    const feverGain = symbolKey === 'CROSS' ? 12 : 7;
                    setFeverGauge(prev => {
                        const nextG = Math.min(100, prev + feverGain);
                        if (nextG >= 100) {
                            setIsFeverReady(true);
                            gameSound.playFeverActivate();
                        }
                        return nextG;
                    });
                }

                // 20강 완주 달성 체크
                if (nextLevel >= 20) {
                    gameSound.playForgeMythicVictory();
                    setGold(prev => prev + 100000000);
                    setEndModal({
                        isOpen: true,
                        type: 'VICTORY',
                        finalLevel: 20,
                        finalGold: gold + 100000000
                    });
                }
            } else {
                // B. 실패 판정
                const failRoll = Math.random();

                // 15강 이상: 파괴 판정
                if (entry.destroy > 0 && failRoll <= entry.destroy) {
                    if (aegisSealCount > 0) {
                        // 파괴 방지권 사용
                        setAegisSealCount(prev => prev - 1);
                        const nextLevel = Math.max(0, currentLevel - 1);
                        setCurrentLevel(nextLevel);
                        setResultInfo({
                            type: 'SHIELD',
                            text: `아이기스 쉴드가 파괴를 방어했습니다! (-1강 하락: +${nextLevel}강)`
                        });
                        gameSound.playForgeFail();
                    } else {
                        // 심볼 소멸
                        setCurrentLevel(null);
                        setResultInfo({
                            type: 'DESTROY',
                            text: '강화 실패... 심볼이 파괴되어 산산조각 났습니다.'
                        });
                        gameSound.playForgeDestroy();

                        // 파산 체크
                        if (gold - effectiveCost < RAW_SYMBOL_COST) {
                            setTimeout(() => {
                                setEndModal({
                                    isOpen: true,
                                    type: 'BANKRUPT',
                                    finalLevel: Math.max(sessionBestLevel, currentLevel),
                                    finalGold: 0
                                });
                            }, 1000);
                        }
                    }
                } else {
                    // 유지 or 하락 판정
                    const dropRate1 = symbolKey === 'TRIANGLE' ? entry.drop1 * 0.75 : entry.drop1;
                    const dropRate2 = symbolKey === 'TRIANGLE' ? entry.drop2 * 0.75 : entry.drop2;

                    if (failRoll <= dropRate1 + dropRate2) {
                        const dropAmt = failRoll <= dropRate2 ? 2 : 1;
                        const nextLevel = Math.max(0, currentLevel - dropAmt);
                        setCurrentLevel(nextLevel);
                        setResultInfo({
                            type: 'DROP',
                            text: `강화 실패... (-${dropAmt}강 하락: +${nextLevel}강)`
                        });
                        gameSound.playForgeFail();
                    } else {
                        setResultInfo({
                            type: 'KEEP',
                            text: `강화 실패! 다행히 등급이 유지되었습니다. (+${currentLevel}강)`
                        });
                        gameSound.playForgeFail();
                    }
                }

                // 피버 일격 소모 턴이 아닐 때만 실패 보너스 피버 게이지 충전
                if (!usedFever) {
                    const feverGain = symbolKey === 'CROSS' ? 18 : 10;
                    setFeverGauge(prev => {
                        const nextG = Math.min(100, prev + feverGain);
                        if (nextG >= 100) {
                            setIsFeverReady(true);
                            gameSound.playFeverActivate();
                        }
                        return nextG;
                    });
                }
            }

            setIsForging(false);
        }, 650);
    }, [isForging, currentLevel, isFeverReady, upgradeCost, gold, luckyRuneActive, symbolKey, aegisSealCount, currentTableEntry, currentSymbol.color, sessionBestLevel, triggerSparks]);

    // Spacebar 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && gameState === 'FORGE' && !isForging && !endModal.isOpen && !isShopOpen) {
                e.preventDefault();
                handleForge();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, isForging, endModal.isOpen, isShopOpen, handleForge]);

    // 심볼 판매 (수익 실현)
    const handleSell = () => {
        if (currentLevel === null || isForging) return;
        setGold(prev => prev + currentSellPrice);
        gameSound.playSellGold();
        setResultInfo({
            type: 'COIN',
            text: `상점에 +${currentLevel}강 심볼을 판매하여 ${currentSellPrice.toLocaleString()} G를 획득했습니다.`
        });
        setCurrentLevel(null);
    };

    // 원석 심볼 재구매
    const handleBuyRaw = () => {
        const cost = getDiscountedPrice(RAW_SYMBOL_COST);
        if (gold < cost || isForging) return;
        setGold(prev => prev - cost);
        setCurrentLevel(0);
        setResultInfo({
            type: 'RAW',
            text: '새로운 0강 원석 심볼을 앤빌에 거치했습니다.'
        });
        gameSound.playSelect();
    };

    // 상점 아이템 구매
    const handleBuyItem = (type) => {
        if (type === 'RUNE') {
            const cost = getDiscountedPrice(LUCKY_RUNE_PRICE);
            if (gold >= cost && !luckyRuneActive) {
                setGold(prev => prev - cost);
                setLuckyRuneActive(true);
                gameSound.playSelect();
            }
        } else if (type === 'SEAL') {
            const cost = getDiscountedPrice(AEGIS_SEAL_PRICE);
            if (gold >= cost && aegisSealCount < 3) {
                setGold(prev => prev - cost);
                setAegisSealCount(prev => prev + 1);
                gameSound.playSelect();
            }
        }
    };

    // 자진 정산 (명예의 전당 등록 / Cash Out)
    const handleCashOut = () => {
        if (isForging) return;
        const levelToSave = currentLevel !== null ? currentLevel : sessionBestLevel;
        setEndModal({
            isOpen: true,
            type: 'CASHOUT',
            finalLevel: levelToSave,
            finalGold: gold
        });
        gameSound.playSelect();
    };

    // 리더보드 점수 인코딩 및 백엔드 제출
    const handleSubmitScore = async () => {
        if (!isAuthenticated || !user) {
            openLoginModal?.();
            return;
        }

        setIsSubmitting(true);
        try {
            const durationSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
            const symbolCode = currentSymbol.code;
            const cappedGold = Math.min(endModal.finalGold, 99999);
            const encodedScore = (endModal.finalLevel * 1000000) + (symbolCode * 100000) + cappedGold;

            await arcadeApi.submitScore('forge', encodedScore, durationSec, user);
            setSubmitSuccess(true);
            gameSound.playForgeSuccess(15);
        } catch (e) {
            console.error('[SymbolForge] 점수 제출 실패:', e);
            alert('기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 새 게임 시작
    const handleRestartGame = () => {
        setEndModal({ isOpen: false, type: null, finalLevel: 0, finalGold: 0 });
        setSubmitSuccess(false);
        setGameState('SELECT');
    };

    // 1~20강 최적화 비주얼 파라미터 (GPU 과열 방지 및 하드웨어 가속)
    const getEvolutionVisuals = (lvl) => {
        if (lvl === null) return { glowRadius: 0, orbitCount: 0, isLevitating: false, hasScreenPulse: false };
        const glowRadius = Math.min(28, 6 + lvl * 1.1); // 과도한 블러 억제하여 발열 방지
        const spinSpeed = Math.max(1.2, 4.0 - lvl * 0.14);

        let orbitCount = 0;
        if (lvl >= 3 && lvl <= 5) orbitCount = 1;
        else if (lvl >= 6 && lvl <= 8) orbitCount = 2;
        else if (lvl >= 9 && lvl <= 11) orbitCount = 3;
        else if (lvl >= 12 && lvl <= 14) orbitCount = 4;
        else if (lvl >= 15 && lvl <= 17) orbitCount = 6;
        else if (lvl >= 18 && lvl <= 19) orbitCount = 8;
        else if (lvl >= 20) orbitCount = 10;

        return {
            glowRadius,
            spinSpeed,
            orbitCount,
            isLevitating: lvl >= 10,
            hasScreenPulse: lvl >= 16
        };
    };

    const visuals = getEvolutionVisuals(currentLevel);
    const SymbolIcon = currentSymbol.icon;

    // ─────────────────────────────────────────────────────────────
    // 뷰 1: 심볼 선택 화면 (SELECT)
    // ─────────────────────────────────────────────────────────────
    if (gameState === 'SELECT') {
        return (
            <div className="w-full min-h-[calc(100dvh-4rem)] mt-16 bg-base flex flex-col items-center justify-between p-4 sm:p-6 select-none relative overflow-hidden">
                {/* 상단 네비게이션 */}
                <div className="w-full max-w-4xl flex items-center justify-between z-10">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-divider text-secondary hover:text-primary hover:bg-surface-hover text-xs font-bold transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>라운지</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSound}
                            className="p-2 rounded-xl bg-surface border border-divider text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                            title={isMuted ? '음소거 해제' : '음소거'}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-ps-blue" />}
                        </button>
                        <button
                            onClick={() => onOpenLeaderboard('forge')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-all"
                        >
                            <Trophy className="w-4 h-4" />
                            <span>명예의 전당</span>
                        </button>
                    </div>
                </div>

                {/* 중앙 헤더 & 심볼 선택 카드 그리드 */}
                <div className="w-full max-w-4xl flex flex-col items-center my-auto py-6 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ps-blue/10 border border-ps-blue/30 text-ps-blue text-xs font-black uppercase mb-3">
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Cybernetic Anvil [Overclock Challenge]</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-primary text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary via-ps-blue to-cyan-400">
                        PS 심볼 포지: +20강 챌린지
                    </h1>
                    <p className="text-xs sm:text-sm text-secondary text-center max-w-md leading-relaxed mb-8">
                        벼려낼 PlayStation 심볼을 선택하세요. 각 심볼마다 독자적인 물리 법칙과 고유한 강화 패시브를 지니고 있습니다.
                    </p>

                    {/* 4대 심볼 선택 카드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        {Object.values(SYMBOLS).map((sym) => {
                            const Icon = sym.icon;
                            return (
                                <button
                                    key={sym.key}
                                    onClick={() => handleSelectSymbol(sym.key)}
                                    className={`group relative p-5 rounded-3xl bg-surface border-2 transition-all duration-200 flex flex-col items-center text-center hover:scale-[1.02] active:scale-95 ${sym.borderClass} hover:bg-surface-hover`}
                                >
                                    <div
                                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105"
                                        style={{
                                            backgroundColor: `${sym.color}15`,
                                            boxShadow: `0 0 20px ${sym.glowColor}`
                                        }}
                                    >
                                        <Icon className="w-10 h-10 stroke-[2.5px]" style={{ color: sym.color }} />
                                    </div>

                                    <h3 className="text-base font-black text-primary mb-1 group-hover:text-ps-blue transition-colors">
                                        {sym.name}
                                    </h3>
                                    <span className="text-[11px] font-bold mb-2.5 px-2 py-0.5 rounded-full bg-base border border-divider" style={{ color: sym.color }}>
                                        {sym.title}
                                    </span>

                                    <p className="text-[11px] text-secondary leading-tight mb-3 line-clamp-2">
                                        {sym.themeDesc}
                                    </p>

                                    <div className="w-full p-2.5 rounded-xl bg-base border border-divider/60 text-left mt-auto">
                                        <div className="flex items-center gap-1 text-[10px] font-black mb-1" style={{ color: sym.color }}>
                                            <Sparkles className="w-3 h-3" />
                                            <span>{sym.passiveName}</span>
                                        </div>
                                        <p className="text-[10px] text-secondary leading-tight">
                                            {sym.passiveDesc}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 하단 팁 */}
                <div className="text-[11px] text-secondary/70 text-center z-10">
                    초기 자본금 5,000 G 제공 • 강화하여 상점에 판매하거나 +20강 신화에 도전하세요.
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 뷰 2: 대장간 앤빌 메인 화면 (FORGE)
    // ─────────────────────────────────────────────────────────────
    return (
        <div className={`w-full min-h-[calc(100dvh-4rem)] mt-16 bg-base flex flex-col justify-between select-none relative overflow-hidden transition-all duration-100 ${screenShake ? 'animate-screen-shake' : ''}`}>
            {/* 16강 이상일 때 배경 비네팅 (CPU 부하 최소화) */}
            {visuals.hasScreenPulse && (
                <div
                    className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-500"
                    style={{
                        background: `radial-gradient(circle at center, transparent 40%, ${currentSymbol.glowColor} 100%)`
                    }}
                />
            )}

            {/* 1. 상단 HUD 바 (소지금 & 피버 & 정보 - 상단 네비게이션과 정렬 일치) */}
            <header className="border-b border-divider bg-surface/90 backdrop-blur-md z-20">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => setGameState('SELECT')}
                        className="p-2 rounded-xl bg-base border border-divider text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                        title="심볼 다시 선택"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-base border border-divider" style={{ color: currentSymbol.color }}>
                            <SymbolIcon className="w-5 h-5 stroke-[2.5px]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-black text-primary">{currentSymbol.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-base border border-divider font-bold" style={{ color: currentSymbol.color }}>
                                    {currentSymbol.title}
                                </span>
                            </div>
                            <span className="text-[10px] text-secondary">
                                최고 기록: <strong className="text-primary">+{sessionBestLevel}강</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* 보유 골드 & 피버 & 상점 컨트롤 */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-xs sm:text-sm shadow-sm">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>{gold.toLocaleString()} G</span>
                    </div>

                    {/* 피버 게이지 HUD 프로그레스 바 */}
                    <div className="flex flex-col gap-1 min-w-[90px] sm:min-w-[125px] px-2.5 py-1 rounded-xl bg-base border border-divider">
                        <div className="flex items-center justify-between text-[10px] font-black">
                            <span className={`flex items-center gap-1 ${isFeverReady ? 'text-amber-400' : 'text-secondary'}`}>
                                <Zap className={`w-3 h-3 ${isFeverReady ? 'fill-current text-amber-400 animate-pulse' : 'text-secondary'}`} />
                                <span>{isFeverReady ? '골든 해머' : '피버'}</span>
                            </span>
                            <span className={isFeverReady ? 'text-amber-400 font-black' : 'text-secondary'}>{feverGauge}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface border border-divider/60 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    isFeverReady
                                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 animate-pulse'
                                        : 'bg-gradient-to-r from-blue-500 to-amber-500'
                                }`}
                                style={{ width: `${feverGauge}%` }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => setIsShopOpen(true)}
                        className="relative p-2 rounded-xl bg-surface border border-divider text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                        title="대장간 상점"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        {(luckyRuneActive || aegisSealCount > 0) && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                    </button>

                    <button
                        onClick={toggleSound}
                        className="p-2 rounded-xl bg-surface border border-divider text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                    >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-ps-blue" />}
                    </button>

                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="p-2 rounded-xl bg-surface border border-divider text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>

            {/* 2. 중앙 앤빌(Anvil) 무대 (대형 스케일 업 & 사이버네틱 챔버 오로라) */}
            <main className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-6 z-10">
                {/* 저발열 고성능 Canvas 파티클 오버레이 */}
                <canvas
                    ref={canvasRef}
                    width={480}
                    height={480}
                    className="absolute pointer-events-none z-20"
                    style={{ willChange: 'transform' }}
                />

                {/* 사이버네틱 대장간 홀로그램 챔버 & 오로라 배경 (공간 낭비 해소 및 웅장한 연출) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
                    <div
                        className="w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] md:w-[620px] md:h-[620px] rounded-full border border-dashed opacity-25 animate-spin"
                        style={{
                            borderColor: currentSymbol.color,
                            animationDuration: '36s'
                        }}
                    />
                    <div
                        className="absolute w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] md:w-[490px] md:h-[490px] rounded-full border border-dotted opacity-20 animate-spin"
                        style={{
                            borderColor: currentSymbol.color,
                            animationDuration: '22s',
                            animationDirection: 'reverse'
                        }}
                    />
                    <div
                        className="absolute w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] rounded-full blur-3xl opacity-20 pointer-events-none"
                        style={{
                            backgroundColor: currentSymbol.color
                        }}
                    />
                    <div className="absolute w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] md:w-[420px] md:h-[420px] pointer-events-none opacity-30 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <span className="w-4 h-4 border-t-2 border-l-2" style={{ borderColor: currentSymbol.color }} />
                            <span className="w-4 h-4 border-t-2 border-r-2" style={{ borderColor: currentSymbol.color }} />
                        </div>
                        <div className="flex justify-between">
                            <span className="w-4 h-4 border-b-2 border-l-2" style={{ borderColor: currentSymbol.color }} />
                            <span className="w-4 h-4 border-b-2 border-r-2" style={{ borderColor: currentSymbol.color }} />
                        </div>
                    </div>
                </div>

                <div className="relative flex flex-col items-center justify-center my-auto z-10">
                    {/* 중앙 대형 심볼 카드 & 앤빌 */}
                    <div className="relative flex flex-col items-center">
                        {currentLevel !== null ? (
                            <div
                                className={`relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl flex items-center justify-center transition-all duration-200 ${
                                    visuals.isLevitating ? 'animate-bounce-gentle' : ''
                                }`}
                                style={{
                                    willChange: 'transform',
                                    boxShadow: `0 0 ${visuals.glowRadius * 1.3}px ${currentSymbol.glowColor}`,
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                            >
                                {/* 4대 심볼 고유 위성 오브 (홍염 불씨 / 프리즘 크리스탈 / 번개 스파크 / 양자 큐브) */}
                                <SymbolSatellites
                                    symbolKey={symbolKey}
                                    orbitCount={visuals.orbitCount}
                                    spinSpeed={visuals.spinSpeed}
                                    color={currentSymbol.color}
                                    level={currentLevel}
                                />

                                {/* 5대 진화 티어 고유 비주얼 코어 엔진 (대형 240x240 정밀 벡터) */}
                                <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center">
                                    <SymbolVisualCore
                                        symbolKey={symbolKey}
                                        level={currentLevel}
                                        hammerSwing={hammerSwing}
                                    />
                                </div>

                                {/* 강화 레벨 뱃지 */}
                                <div
                                    className="absolute -top-3 -right-3 px-3.5 py-1 rounded-full font-black text-xs sm:text-base border shadow-xl text-white z-20"
                                    style={{
                                        backgroundColor: currentSymbol.color,
                                        borderColor: '#ffffff55'
                                    }}
                                >
                                    +{currentLevel}
                                </div>
                            </div>
                        ) : (
                            <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl border-2 border-dashed border-divider flex flex-col items-center justify-center text-secondary gap-3 bg-surface/50">
                                <AlertTriangle className="w-10 h-10 opacity-40 text-amber-500" />
                                <span className="text-sm font-bold">앤빌이 비어있습니다</span>
                                <button
                                    onClick={handleBuyRaw}
                                    className="mt-1 px-4 py-2 rounded-xl bg-ps-blue hover:bg-blue-600 text-white text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all"
                                >
                                    원석 구매 ({getDiscountedPrice(RAW_SYMBOL_COST).toLocaleString()} G)
                                </button>
                            </div>
                        )}

                        {/* 대장간 받침대 (대형화) */}
                        <div className="w-64 sm:w-80 md:w-92 h-7 bg-surface-hover border border-divider rounded-b-2xl shadow-inner mt-2 flex items-center justify-center">
                            <div className="w-36 sm:w-48 h-1 bg-divider/80 rounded-full" />
                        </div>
                    </div>

                    {/* 결과 텍스트 안내 (이모지 없이 순수 Lucide 아이콘 & 정갈한 텍스트) */}
                    <div className="h-10 mt-4 flex items-center justify-center text-center px-4">
                        {resultInfo ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                                {resultInfo.type === 'CRIT' && <Flame className="w-4 h-4 text-amber-400" />}
                                {resultInfo.type === 'SUCCESS' && <Sparkles className="w-4 h-4 text-emerald-400" />}
                                {resultInfo.type === 'SHIELD' && <Shield className="w-4 h-4 text-ps-blue" />}
                                {(resultInfo.type === 'DESTROY' || resultInfo.type === 'DROP' || resultInfo.type === 'FAIL') && (
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                )}
                                {resultInfo.type === 'KEEP' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                                {resultInfo.type === 'COIN' && <Coins className="w-4 h-4 text-amber-400" />}
                                {resultInfo.type === 'RAW' && <Sparkles className="w-4 h-4 text-ps-blue" />}
                                <span
                                    className={`text-xs sm:text-sm font-black ${
                                        resultInfo.type === 'SUCCESS' || resultInfo.type === 'CRIT'
                                            ? 'text-emerald-400'
                                            : resultInfo.type === 'DROP' || resultInfo.type === 'DESTROY' || resultInfo.type === 'FAIL'
                                            ? 'text-red-400'
                                            : resultInfo.type === 'COIN'
                                            ? 'text-amber-400'
                                            : 'text-primary'
                                    }`}
                                >
                                    {resultInfo.text}
                                </span>
                            </div>
                        ) : (
                            <p className="text-[11px] sm:text-xs text-secondary font-medium">
                                Space키 또는 [강화 망치질] 버튼을 눌러 심볼을 벼려내세요.
                            </p>
                        )}
                    </div>
                </div>

                {/* 활성 버프 뱃지 */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                    {luckyRuneActive && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>행운의 룬 활성 (+5%p)</span>
                        </div>
                    )}
                    {aegisSealCount > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-ps-blue text-[11px] font-bold">
                            <Shield className="w-3.5 h-3.5" />
                            <span>파괴 방지권: {aegisSealCount}회</span>
                        </div>
                    )}
                </div>
            </main>

            {/* 3. 하단 컨트롤러 패널 */}
            <footer className="p-4 sm:p-6 border-t border-divider bg-surface/90 backdrop-blur-md z-20">
                <div className="max-w-xl mx-auto flex flex-col gap-3">
                    {currentLevel !== null && currentLevel < 20 && currentTableEntry && (
                        <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-base border border-divider text-center text-[11px]">
                            <div>
                                <span className="text-secondary block text-[10px] font-bold">보유 자산</span>
                                <span className="font-black text-amber-400">
                                    {gold.toLocaleString()} G
                                </span>
                            </div>
                            <div>
                                <span className="text-secondary block text-[10px] font-bold">성공 확률</span>
                                <span className="font-black text-emerald-400">
                                    {Math.round((currentTableEntry.success + (luckyRuneActive ? 0.05 : 0) + (isFeverReady ? 0.15 : 0)) * 100)}%
                                </span>
                            </div>
                            <div>
                                <span className="text-secondary block text-[10px] font-bold">강화 비용</span>
                                <span className={`font-black ${isFeverReady ? 'text-yellow-400 line-through' : 'text-primary'}`}>
                                    {isFeverReady ? '0 G (피버)' : `${upgradeCost.toLocaleString()} G`}
                                </span>
                            </div>
                            <div>
                                <span className="text-secondary block text-[10px] font-bold">판매 환급액</span>
                                <span className="font-black text-amber-500">
                                    +{currentSellPrice.toLocaleString()} G
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 피버 발동 중 안내 배너 */}
                    {isFeverReady && (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-xs animate-pulse">
                            <Zap className="w-4 h-4 fill-current text-amber-400" />
                            <span>골든 해머 피버 발동: 다음 1회 [비용 0G 무료] 및 [성공률 +15%p] 적용!</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={handleSell}
                            disabled={currentLevel === null || isForging}
                            className="flex-1 py-3 px-3 rounded-2xl bg-surface border border-divider hover:border-amber-500/50 text-amber-500 hover:bg-surface-hover font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                        >
                            <Coins className="w-4 h-4" />
                            <span>판매 (+{currentSellPrice.toLocaleString()}G)</span>
                        </button>

                        <button
                            onClick={handleForge}
                            disabled={currentLevel === null || isForging || currentLevel >= 20}
                            className={`flex-[1.6] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-base text-white flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-40 ${
                                isFeverReady
                                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-lg shadow-amber-500/30'
                                    : 'bg-ps-blue hover:bg-blue-600'
                            }`}
                        >
                            <Hammer className={`w-5 h-5 ${isForging ? 'animate-spin' : ''}`} />
                            <span>
                                {isForging
                                    ? '벼리는 중...'
                                    : isFeverReady
                                    ? '골든 해머 일격! (무료)'
                                    : `강화 망치질 (${upgradeCost.toLocaleString()}G)`}
                            </span>
                        </button>

                        <button
                            onClick={handleCashOut}
                            disabled={isForging || (currentLevel === null && sessionBestLevel === 0)}
                            className="flex-1 py-3 px-3 rounded-2xl bg-surface border border-divider hover:border-ps-blue/50 text-primary hover:bg-surface-hover font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                        >
                            <Crown className="w-4 h-4 text-yellow-500" />
                            <span>정산(등록)</span>
                        </button>
                    </div>
                </div>
            </footer>

            {/* 모달 1: 대장간 상점 */}
            {isShopOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
                    <div className="relative w-full max-w-md bg-surface border border-divider rounded-3xl p-5 sm:p-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-divider mb-4">
                            <div className="flex items-center gap-2 text-primary font-black text-base">
                                <ShoppingBag className="w-5 h-5 text-ps-blue" />
                                <span>대장간 보조 상점</span>
                            </div>
                            <button
                                onClick={() => setIsShopOpen(false)}
                                className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-hover"
                            >
                                <CrossIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="p-3.5 rounded-2xl bg-base border border-divider flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-black text-primary">행운의 룬</h4>
                                        <p className="text-[11px] text-secondary">다음 1회 강화 시 성공률 +5%p 보너스</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleBuyItem('RUNE')}
                                    disabled={gold < getDiscountedPrice(LUCKY_RUNE_PRICE) || luckyRuneActive}
                                    className="px-3 py-1.5 rounded-xl bg-ps-blue hover:bg-blue-600 text-white text-xs font-black disabled:opacity-40 transition-all shrink-0"
                                >
                                    {luckyRuneActive ? '보유 중' : `${getDiscountedPrice(LUCKY_RUNE_PRICE).toLocaleString()} G`}
                                </button>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-base border border-divider flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-blue-500/15 text-ps-blue">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs sm:text-sm font-black text-primary">아이기스 파괴 방지권</h4>
                                            <span className="text-[10px] text-ps-blue font-bold">({aegisSealCount}/3)</span>
                                        </div>
                                        <p className="text-[11px] text-secondary">15강 이상 실패 시 심볼 파괴 1회 방어 (-1강 보호)</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleBuyItem('SEAL')}
                                    disabled={gold < getDiscountedPrice(AEGIS_SEAL_PRICE) || aegisSealCount >= 3}
                                    className="px-3 py-1.5 rounded-xl bg-ps-blue hover:bg-blue-600 text-white text-xs font-black disabled:opacity-40 transition-all shrink-0"
                                >
                                    {aegisSealCount >= 3 ? '최대 보유' : `${getDiscountedPrice(AEGIS_SEAL_PRICE).toLocaleString()} G`}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsShopOpen(false)}
                            className="w-full py-2.5 rounded-xl bg-surface-hover text-secondary hover:text-primary text-xs font-bold transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* 모달 2: 게임 도움말 */}
            {isHelpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
                    <div className="relative w-full max-w-md bg-surface border border-divider rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[80dvh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-divider mb-4">
                            <div className="flex items-center gap-2 text-primary font-black text-base">
                                <HelpCircle className="w-5 h-5 text-ps-blue" />
                                <span>대장간 플레이 가이드</span>
                            </div>
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-hover"
                            >
                                <CrossIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs text-secondary leading-relaxed mb-6">
                            <div>
                                <h4 className="font-black text-primary mb-1">자원 순환 룰</h4>
                                <p>
                                    0강 원석 심볼을 구매하여 앤빌에 올린 뒤 강화하세요.
                                    위험 구간 전에 언제든 [상점에 판매]하여 거액의 환급금을 챙겨 자본금을 복리로 불릴 수 있습니다.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-black text-primary mb-1">15강 이상 파괴 위험</h4>
                                <p>
                                    15강부터는 강화 실패 시 일정 확률로 심볼이 산산조각 파괴됩니다.
                                    상점에서 [아이기스 파괴 방지권]을 구비하여 소중한 심볼을 보호하세요.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-black text-primary mb-1">리더보드 공동 등수</h4>
                                <p>
                                    명예의 전당에서는 동일한 강화 레벨(예: +17강)을 달성한 모든 플레이어를 골드 차이 없이 <strong>공동 등수</strong>로 인정합니다.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsHelpOpen(false)}
                            className="w-full py-2.5 rounded-xl bg-ps-blue text-white text-xs font-black shadow-md hover:bg-blue-600 transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 모달 3: 세션 종료 & 리더보드 등록 결과창 */}
            {endModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
                    <div className="relative w-full max-w-md bg-surface border border-divider rounded-3xl p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl border border-divider">
                            {endModal.type === 'VICTORY' ? (
                                <Crown className="w-9 h-9 text-yellow-400" />
                            ) : endModal.type === 'CASHOUT' ? (
                                <Award className="w-9 h-9 text-ps-blue" />
                            ) : (
                                <AlertTriangle className="w-9 h-9 text-red-400" />
                            )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black text-primary mb-1">
                            {endModal.type === 'VICTORY'
                                ? '궁극의 +20강 신화 달성'
                                : endModal.type === 'CASHOUT'
                                ? '명예의 전당 정산 완료'
                                : '대장간 파산 (Game Over)'}
                        </h2>
                        <p className="text-xs text-secondary mb-6">
                            {endModal.type === 'VICTORY'
                                ? '축하합니다! 전설의 대장장이 칭호와 1억 골드 환급의 영예를 안았습니다.'
                                : endModal.type === 'CASHOUT'
                                ? '현재 달성한 강화 수치와 보유 자산을 안전하게 보존하여 공식 리더보드에 등록합니다.'
                                : '비록 파산했지만 이번 세션에서 달성했던 최고 기록으로 구제 등록됩니다.'}
                        </p>

                        <div className="p-4 rounded-2xl bg-base border border-divider mb-6 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-secondary font-bold">최종 강화 등급</span>
                                <span className="font-black text-sm text-primary flex items-center gap-1.5" style={{ color: currentSymbol.color }}>
                                    <SymbolIcon className="w-4 h-4" />
                                    <span>+{endModal.finalLevel}강 ({currentSymbol.name})</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-secondary font-bold">최종 보유 자산</span>
                                <span className="font-black text-sm text-amber-500">
                                    {endModal.finalGold.toLocaleString()} G
                                </span>
                            </div>
                        </div>

                        {submitSuccess ? (
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center gap-2 mb-4">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>명예의 전당에 성공적으로 등록되었습니다.</span>
                            </div>
                        ) : isAuthenticated ? (
                            <button
                                onClick={handleSubmitScore}
                                disabled={isSubmitting}
                                className="w-full py-3.5 px-4 rounded-2xl bg-ps-blue hover:bg-blue-600 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all mb-3 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Crown className="w-4 h-4" />
                                <span>{isSubmitting ? '등록 중...' : '리더보드에 내 기록 박제하기'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={openLoginModal}
                                className="w-full py-3.5 px-4 rounded-2xl bg-ps-blue/15 border border-ps-blue/30 text-ps-blue hover:bg-ps-blue/25 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all mb-3 flex items-center justify-center gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>로그인하고 랭킹 등록하기</span>
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onOpenLeaderboard('forge')}
                                className="flex-1 py-2.5 rounded-xl bg-surface-hover text-secondary hover:text-primary text-xs font-bold transition-colors"
                            >
                                랭킹 확인
                            </button>
                            <button
                                onClick={handleRestartGame}
                                className="flex-1 py-2.5 rounded-xl bg-surface-hover text-secondary hover:text-primary text-xs font-bold transition-colors"
                            >
                                다시 플레이
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SymbolForgeGame;
