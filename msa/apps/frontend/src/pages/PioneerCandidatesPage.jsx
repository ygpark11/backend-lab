import React, {useEffect, useMemo, useRef, useState} from 'react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';

import client from '../api/client';
import toast from 'react-hot-toast';
import {Circle, Cpu, Gamepad2, Lock, Pickaxe, RefreshCw, Square, Triangle, Unlock, X as XIcon} from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import {useAuth} from '../contexts/AuthContext';
import PSFactoryLoader from '../components/PSFactoryLoader';

const CandidateCard = ({ game, onExtract, isAuthenticated, openLoginModal }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const holdTimer = useRef(null);
    const progressInterval = useRef(null);

    const particles = useMemo(() => {
        const types = ['triangle', 'circle', 'x', 'square'];
        const colors = ['text-[#00A39D]', 'text-[#FF3E3E]', 'text-[#4E6CBB]', 'text-[#E8789C]'];
        return Array.from({ length: 16 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 120 + Math.random() * 100;
            return { id: i, type: types[i % 4], color: colors[i % 4], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, delay: Math.random() * 0.4 };
        });
    }, []);

    const startHold = (e) => {
        if (!isAuthenticated) { openLoginModal(); return; }
        if (isUnlocked) return;

        setIsHolding(true);
        setProgress(0);

        // 1.5초(1500ms) 동안 프로그레스 바 차오르게 설정
        progressInterval.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) { clearInterval(progressInterval.current); return 100; }
                return prev + (100 / (1500 / 15));
            });
        }, 15);

        holdTimer.current = setTimeout(() => {
            clearInterval(progressInterval.current);
            setIsHolding(false);
            setProgress(100);
            setIsUnlocked(true);

            setTimeout(() => { onExtract(game); }, 1000);
        }, 1500);
    };

    const endHold = () => {
        if (isUnlocked) return;
        setIsHolding(false);
        clearTimeout(holdTimer.current);
        clearInterval(progressInterval.current);
        setProgress(0);
    };

    const renderParticleIcon = (type, color) => {
        const cls = `w-8 h-8 sm:w-10 sm:h-10 stroke-[4px] drop-shadow-[0_0_15px_currentColor] ${color}`;
        if (type === 'triangle') return <Triangle className={cls} />;
        if (type === 'circle') return <Circle className={cls} />;
        if (type === 'x') return <XIcon className={cls} />;
        return <Square className={cls} />;
    };

    return (
        <div
            className={`relative group rounded-xl overflow-hidden shadow-lg border transition-all duration-800 ease-out flex flex-col h-full bg-base
            ${isUnlocked ? 'border-ps-blue shadow-[0_0_50px_rgba(59,130,246,0.8)] z-50 scale-105' : 'border-divider hover:border-ps-blue hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'}
        `}>
            {/* 게임 포스터 영역 */}
            <div className="aspect-[3/4] overflow-hidden relative bg-black shrink-0">
                <PSGameImage
                    src={game.imageUrl}
                    alt={game.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-800 ease-[cubic-bezier(0.25,1,0.5,1)]
                        ${isUnlocked
                        ? 'grayscale-0 scale-125 brightness-110 z-10'
                        : (isHolding
                            ? 'grayscale-0 scale-110 brightness-100 blur-[2px]'
                            : 'grayscale-[80%] contrast-125 brightness-90 scale-100 group-hover:grayscale-0 group-hover:brightness-110')}
                    `}
                />

                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 bg-ps-blue/20 mix-blend-overlay ${isUnlocked || isHolding ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`}></div>

                {/* 스마트 글래스 스캔 이펙트 */}
                <div className={`absolute inset-0 z-20 pointer-events-none transition-transform duration-800 ease-[cubic-bezier(0.25,1,0.5,1)] origin-top
                    ${isUnlocked ? '-translate-y-[105%] opacity-0' : 'translate-y-0 opacity-100'}
                `}>
                    <div className="absolute inset-0 backdrop-blur-[1px] bg-gradient-to-b from-white/10 via-transparent to-black/10 rounded-xl overflow-hidden border border-white/10"></div>
                </div>

                <div className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none overflow-hidden transition-opacity duration-300 ${isHolding && !isUnlocked ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute w-20 h-20 bg-white rounded-full blur-xl animate-pulse shadow-[0_0_50px_#3b82f6,0_0_100px_#3b82f6]"></div>
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute animate-blackhole"
                            style={Object.assign({ animationDelay: `${p.delay}s` }, { '--startX': `${p.x}px`, '--startY': `${p.y}px` })}
                        >
                            {renderParticleIcon(p.type, p.color)}
                        </div>
                    ))}
                </div>

                {/* 상태 뱃지 */}
                <div className={`absolute inset-0 z-40 transition-opacity duration-500 pointer-events-none ${isUnlocked ? 'opacity-0' : 'opacity-100'}`}>
                    <span className={`absolute top-2 left-2 backdrop-blur-md border text-[10px] font-black px-2.5 py-1 rounded shadow-md flex items-center gap-1 uppercase tracking-widest transition-colors
                        ${isHolding ? 'bg-ps-blue text-white border-blue-400' : 'bg-black/70 text-white border-white/20'}
                    `}>
                        {isHolding ? <Unlock className="w-3 h-3 animate-pulse"/> : <Lock className="w-3 h-3 text-red-500"/>}
                        {isHolding ? '디코딩 중...' : '봉인 데이터'}
                    </span>
                </div>
            </div>

            {/* 정보 및 제어부 */}
            <div className={`p-4 flex flex-col flex-grow bg-base relative z-40 transition-all duration-600 border-t border-divider
                ${isUnlocked ? 'translate-y-10 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}
            `}>
                <h3 className={`text-sm font-black leading-snug line-clamp-2 h-[2.8em] mb-4 transition-colors ${isHolding ? 'text-ps-blue animate-pulse' : 'text-primary'}`}>
                    {game.title.trim()}
                </h3>

                <div className="mt-auto">
                    <button
                        onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold}
                        className={`relative w-full overflow-hidden border-2 py-3 rounded-lg text-xs font-black transition-all touch-none select-none
                            ${isHolding
                            ? 'border-ps-blue scale-95 bg-[var(--bento-blue-from)] shadow-[0_0_20px_rgba(59,130,246,0.5)] text-ps-blue'
                            : 'border-divider-strong bg-surface text-secondary hover:bg-[var(--bento-blue-from)] hover:border-[color:var(--bento-blue-border-hover)] hover:text-ps-blue shadow-sm'}
                        `}
                    >
                        {/* 프로그레스 바 채우기 */}
                        <div
                            className="absolute left-0 top-0 h-full w-full origin-left bg-gradient-to-r from-ps-blue to-cyan-400 transition-none opacity-90 shadow-[0_0_15px_rgba(59,130,246,1)] transform-gpu will-change-transform"
                            style={{ transform: `scaleX(${progress / 100})` }}
                        ></div>

                        <div className={`relative z-10 flex items-center justify-center gap-1.5 tracking-wide whitespace-nowrap ${isHolding ? 'text-white drop-shadow-md' : ''}`}>
                            <Cpu className={`w-4 h-4 shrink-0 ${isHolding ? 'animate-spin text-white' : 'text-current'}`} />
                            {isHolding ? '데이터 추출 중...' : '꾹 눌러 해제'}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

const PioneerCandidatesPage = () => {
    const navigate = useTransitionNavigate();
    const { isAuthenticated, openLoginModal } = useAuth();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
    const [extractingGame, setExtractingGame] = useState(null);

    const fetchCandidates = async () => {
        setLoading(true); setError(null);
        try {
            const response = await client.get('/api/v1/scraping/candidates');
            setCandidates(response.data);
        } catch (err) {
            setError("신작 데이터를 불러오지 못했습니다. 통신 방해가 있습니다.");
            toast.error("데이터 로딩 실패");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchCandidates(); }, []);

    const handleExtractStart = async (game) => {
        setExtractingGame(game);
        setIsFactoryModalOpen(true);
        try {
            await client.post(`/api/v1/scraping/request/${game.psStoreId}`);
            setCandidates(prev => prev.filter(c => c.psStoreId !== game.psStoreId));
        } catch (err) {
            let errorMessage = "요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

            if (err.response) {
                if (err.response.status === 400 && typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                }
                else if (err.response.status === 500) {
                    errorMessage = "수집 한도(1시간 3회)를 초과했거나 이미 처리 중인 게임입니다.";
                }
            }

            toast.error(errorMessage);
            setIsFactoryModalOpen(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-base pt-32 flex justify-center transition-colors duration-500"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-base text-primary relative transition-colors duration-500">
            <SEO title="신작 수집소" description="매일 새벽 발굴되는 플레이스테이션 신작들을 확인하고 트래커에 추가하세요." />

            {/* 배경 오로라 이펙트 */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-base">
                <div className="absolute inset-0 z-20 mix-blend-screen dark:mix-blend-screen opacity-60">
                    <div className="absolute top-[10%] left-[10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[60px] sm:blur-[120px] animate-[pulse_10s_ease-in-out_infinite]"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-cyan-500/20 rounded-full blur-[60px] sm:blur-[120px] animate-[pulse_8s_ease-in-out_infinite]"></div>
                </div>
            </div>

            <PSFactoryLoader
                isOpen={isFactoryModalOpen}
                onClose={() => setIsFactoryModalOpen(false)}
                gameName={extractingGame?.title?.replace(/\s*\([^)]*한국어[^)]*\)|\s*\([^)]*중국어[^)]*\)|\s*\([^)]*영어[^)]*\)/gi, '').trim() || '알 수 없는 원석'}
            />

            <div className="pt-24 md:pt-32 px-4 sm:px-6 md:px-10 pb-24 max-w-7xl mx-auto relative z-10">

                <div className="mb-8 relative overflow-hidden rounded-2xl bg-[var(--bento-card-bg)] border border-[color:var(--bento-blue-border)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-[var(--bento-blue-shadow)] group">

                    <div className="absolute top-0 left-0 w-64 h-full bg-gradient-to-r from-[var(--bento-blue-from)] to-transparent blur-2xl transform -skew-x-12 pointer-events-none transition-colors duration-500"></div>

                    <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--bento-blue-from)] flex items-center justify-center border border-[color:var(--bento-blue-border)] shadow-sm shrink-0">
                            <Pickaxe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-700 dark:text-blue-500 drop-shadow-sm group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            {/* 🚀 라이트/다크 텍스트 컬러 분리 (text-blue-700 dark:text-blue-500) */}
                            <h2 className="text-blue-700 dark:text-blue-500 font-bold text-xs sm:text-sm tracking-wider flex items-center gap-1.5 mb-1 sm:mb-2">
                                <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> NEW ARRIVALS
                            </h2>
                            <h3 className="text-primary font-black text-xl sm:text-2xl lg:text-3xl leading-tight mt-1">
                                진열장에 방금 입고된 따끈따끈한<br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">미발굴 데이터</span> 캡슐
                            </h3>
                        </div>
                    </div>
                    <button onClick={fetchCandidates} className="mt-5 sm:mt-0 relative z-10 flex items-center gap-2 bg-surface hover:bg-[var(--bento-blue-from)] hover:text-ps-blue border border-divider hover:border-[color:var(--bento-blue-border-hover)] px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm font-bold text-secondary w-full sm:w-auto justify-center shadow-sm">
                        <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} /> 레이더 재스캔
                    </button>
                </div>

                {!error && (
                    candidates.length > 0 ? (
                        <div className="relative p-4 sm:p-6 md:p-8 bg-glass backdrop-blur-2xl rounded-2xl sm:rounded-[3rem] border border-divider shadow-2xl overflow-hidden mt-4 animate-fadeIn transition-colors duration-500">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-ps-blue to-transparent opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 relative z-10">
                                {candidates.map((game) => (
                                    <CandidateCard key={game.psStoreId} game={game} onExtract={handleExtractStart} isAuthenticated={isAuthenticated} openLoginModal={openLoginModal} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 sm:py-32 bg-glass backdrop-blur-md rounded-2xl sm:rounded-[3rem] border border-dashed border-divider mt-4 relative overflow-hidden shadow-sm animate-fadeIn">
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                                <div className="absolute w-48 h-48 sm:w-64 sm:h-64 border border-ps-blue/30 rounded-full animate-[ping_3s_ease-in-out_infinite]"></div>
                                <div className="absolute w-32 h-32 sm:w-48 sm:h-48 border border-cyan-500/20 rounded-full animate-[ping_3s_ease-in-out_infinite_0.5s]"></div>
                            </div>

                            <div className="py-20 sm:py-32 flex flex-col items-center justify-center text-center px-4 animate-fadeIn relative z-10">
                                <div className="bg-surface border border-divider p-8 sm:p-12 rounded-3xl flex flex-col items-center shadow-lg backdrop-blur-md max-w-lg w-full">
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--bento-blue-from)] rounded-full flex items-center justify-center backdrop-blur-sm border border-[color:var(--bento-blue-border)] mb-6 shadow-sm">
                                        <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-700 dark:text-blue-500 opacity-80" />
                                    </div>
                                    <h3 className="text-lg sm:text-2xl font-black text-primary mb-2 drop-shadow-sm">
                                        현재 탐지된 신규 캡슐이 없습니다.
                                    </h3>
                                    <p className="text-secondary text-xs sm:text-sm max-w-md break-keep leading-relaxed">
                                        개척자님들이 모든 데이터를 성공적으로 추출했습니다!<br/>
                                        다음번 스토어 심층부 탐사가 끝날 때까지 기다려주세요.
                                    </p>

                                    <button
                                        onClick={() => navigate('/games')}
                                        className="mt-8 bg-surface hover:bg-surface-hover border border-divider text-secondary hover:text-primary px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        기존 게임 진열장 둘러보기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default PioneerCandidatesPage;