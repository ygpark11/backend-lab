import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import { Pickaxe, Sparkles, Gamepad2, AlertCircle, RefreshCw, Cpu, Fingerprint, Circle, Triangle, Square, X as XIcon, Lock, Unlock } from 'lucide-react';
import PSLoader from '../components/PSLoader';
import PSGameImage from '../components/common/PSGameImage';
import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';
import PSFactoryLoader from '../components/PSFactoryLoader';

// 🎮 RE9 스타일 자판기 개별 슬롯 컴포넌트
const CandidateCard = ({ game, onExtract, isAuthenticated, openLoginModal }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isUnlocked, setIsUnlocked] = useState(false); // 🚀 대망의 언락 상태!
    const holdTimer = useRef(null);
    const progressInterval = useRef(null);

    const particles = useMemo(() => {
        const types = ['triangle', 'circle', 'x', 'square'];
        const colors = ['text-[#00A39D]', 'text-[#FF3E3E]', 'text-[#4E6CBB]', 'text-[#E8789C]'];
        return Array.from({ length: 12 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 80;
            return { id: i, type: types[i % 4], color: colors[i % 4], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, delay: Math.random() * 0.5 };
        });
    }, []);

    const startHold = (e) => {
        if (!isAuthenticated) { openLoginModal(); return; }
        if (isUnlocked) return; // 이미 열렸으면 작동 안함

        setIsHolding(true);
        setProgress(0);

        progressInterval.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) { clearInterval(progressInterval.current); return 100; }
                return prev + 1.5; // 속도 살짝 높임
            });
        }, 15);

        holdTimer.current = setTimeout(() => {
            clearInterval(progressInterval.current);
            setIsHolding(false);
            setProgress(100);

            // 🚀 1. 게이지가 차면 유리문 개방 애니메이션 시작!
            setIsUnlocked(true);

            // 🚀 2. 0.8초 동안 튀어나오는 포스터를 감상하게 한 뒤 팩토리 모달로 이동
            setTimeout(() => {
                onExtract(game);
            }, 800);

        }, 1000);
    };

    const endHold = () => {
        if (isUnlocked) return;
        setIsHolding(false);
        clearTimeout(holdTimer.current);
        clearInterval(progressInterval.current);
        setProgress(0);
    };

    const renderParticleIcon = (type, color) => {
        const props = { className: `w-5 h-5 sm:w-6 sm:h-6 stroke-[3px] filter brightness-150 drop-shadow-[0_0_12px_currentColor] ${color}` };
        if (type === 'triangle') return <Triangle {...props} />;
        if (type === 'circle') return <Circle {...props} />;
        if (type === 'x') return <XIcon {...props} />;
        return <Square {...props} />;
    };

    return (
        <div className={`relative group bg-[#0a0a0a] rounded-xl overflow-hidden shadow-2xl border transition-all duration-[800ms] ease-out will-change-transform flex flex-col h-full
            ${isUnlocked ? 'border-ps-blue shadow-[0_0_50px_rgba(59,130,246,0.6)] z-50 scale-105' : 'border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)]'}
        `}>
            {/* 1. 게임 포스터 영역 */}
            <div className="aspect-[3/4] overflow-hidden relative bg-black shrink-0">
                <PSGameImage
                    src={game.imageUrl}
                    alt={game.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform
                        ${isUnlocked ? 'scale-125 brightness-110 z-10' : (isHolding ? 'scale-110 brightness-50 blur-[2px]' : 'scale-100 opacity-90 group-hover:opacity-100')}
                    `}
                />

                {/* 2. 스마트 글래스 */}
                <div className={`absolute inset-0 z-20 pointer-events-none transition-transform duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)] origin-top
                    ${isUnlocked ? '-translate-y-[105%] opacity-0' : 'translate-y-0 opacity-100'}
                `}>
                    <div className="absolute inset-0 backdrop-blur-[1px] bg-gradient-to-b from-white/10 via-transparent to-black/40 border border-white/10 rounded-xl overflow-hidden">
                        <div className="absolute top-[-100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-tr from-transparent via-white/10 to-transparent transform rotate-45 group-hover:translate-x-[50%] transition-transform duration-[1.5s] ease-in-out"></div>
                    </div>
                </div>

                {/* 3. 블랙홀 파티클 */}
                <div className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none overflow-hidden transition-opacity duration-300 ${isHolding && !isUnlocked ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute w-16 h-16 bg-blue-500/40 rounded-full blur-xl animate-pulse shadow-[0_0_30px_rgba(59,130,246,1)]"></div>
                    {particles.map((p) => (
                        <div key={p.id} className="absolute animate-blackhole" style={{ '--startX': `${p.x}px`, '--startY': `${p.y}px`, animationDelay: `${p.delay}s` }}>
                            {renderParticleIcon(p.type, p.color)}
                        </div>
                    ))}
                </div>

                {/* 4. 뱃지 */}
                <div className={`absolute inset-0 z-40 transition-opacity duration-[500ms] pointer-events-none ${isUnlocked ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="absolute top-2 left-2 bg-blue-950/80 backdrop-blur-md border border-blue-400/30 text-blue-300 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-1 uppercase tracking-widest">
                        {isHolding ? <Unlock className="w-2.5 h-2.5 text-blue-400 animate-pulse"/> : <Lock className="w-2.5 h-2.5"/>}
                        봉인 데이터
                    </span>
                </div>
            </div>

            {/* 5. 정보 및 버튼 */}
            <div className={`p-3 sm:p-4 flex flex-col flex-grow bg-[#0a0a0a] relative z-40 transition-all duration-[600ms] ease-out
                ${isUnlocked ? 'translate-y-10 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}
            `}>
                <h3 className={`text-xs sm:text-sm font-black leading-snug line-clamp-2 h-[2.8em] mb-3 drop-shadow-lg transition-colors ${isHolding ? 'text-ps-blue animate-pulse' : 'text-gray-100'}`}>
                    {game.title.trim()}
                </h3>

                <div className="mt-auto pt-1">
                    <button
                        onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold}
                        className={`relative w-full overflow-hidden border py-2.5 rounded-lg text-[11px] sm:text-xs font-black transition-all touch-none select-none
                            ${isHolding ? 'border-ps-blue scale-95 bg-blue-900/40 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 hover:text-white hover:border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.05)]'}
                        `}
                    >
                        <div className="absolute left-0 top-0 h-full bg-ps-blue transition-none opacity-80 shadow-[0_0_15px_rgba(59,130,246,0.8)]" style={{ width: `${progress}%` }}></div>
                        <div className={`relative z-10 flex items-center justify-center gap-1.5 tracking-wide whitespace-nowrap ${isHolding ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : ''}`}>
                            <Cpu className={`w-3.5 h-3.5 shrink-0 ${isHolding ? 'animate-spin text-white' : 'text-blue-300'}`} />
                            {isHolding ? '해제 중...' : '꾹 눌러 해제'}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

const PioneerCandidatesPage = () => {
    const navigate = useNavigate();
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
            toast.error("요청에 실패했습니다. 다시 시도해주세요.");
            setIsFactoryModalOpen(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-ps-black pt-32 flex justify-center"><PSLoader /></div>;

    return (
        <div className="min-h-screen bg-ps-black text-white relative">
            <SEO title="신작 수집소" description="매일 새벽 발굴되는 플레이스테이션 신작들을 확인하고 트래커에 추가하세요." />

            <PSFactoryLoader
                isOpen={isFactoryModalOpen}
                onClose={() => setIsFactoryModalOpen(false)}
                gameName={extractingGame?.title?.replace(/\s*\([^)]*한국어[^)]*\)|\s*\([^)]*중국어[^)]*\)|\s*\([^)]*영어[^)]*\)/gi, '').trim() || '알 수 없는 원석'}
            />

            <div className="pt-24 md:pt-32 px-4 sm:px-6 md:px-10 pb-24 max-w-7xl mx-auto relative z-10">

                <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a192f] via-[#112240] to-[#0a192f] border border-blue-500/30 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                    <div className="absolute top-0 left-0 w-64 h-full bg-blue-500/10 blur-3xl transform -skew-x-12"></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.4)] shrink-0">
                            <Pickaxe className="w-6 h-6 sm:w-7 sm:h-7 text-blue-300" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black tracking-tight mb-1.5 sm:mb-2">
                                데이터 진열장 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">(미개척지)</span>
                            </h1>
                            <p className="text-blue-100/70 text-xs sm:text-sm leading-relaxed break-keep">
                                PS 스토어 심층부에서 갓 발굴되어 봉인된 원석들입니다.<br className="hidden sm:block"/>
                                개척자님의 힘으로 잠금을 해제하고 공장으로 보내주세요!
                            </p>
                        </div>
                    </div>
                    <button onClick={fetchCandidates} className="mt-5 sm:mt-0 relative z-10 flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400/30 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm font-bold text-blue-100 group w-full sm:w-auto justify-center">
                        <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} /> 레이더 재스캔
                    </button>
                </div>

                {!error && (
                    candidates.length > 0 ? (
                        <div className="relative p-3 sm:p-6 md:p-8 bg-[#0d1117] rounded-2xl sm:rounded-[3rem] border-2 sm:border-4 border-[#1f2937] shadow-[0_10px_30px_rgba(0,0,0,0.8),_inset_0_0_80px_rgba(0,0,0,0.9)] overflow-hidden mt-4 animate-fadeIn">
                            {/* 캐비닛 상단 네온 조명 */}
                            <div className="absolute top-0 left-0 w-full h-[2px] sm:h-[3px] bg-gradient-to-r from-blue-900 via-blue-400 to-blue-900 shadow-[0_0_30px_rgba(59,130,246,0.8)]"></div>
                            {/* 캐비닛 내부 메쉬 텍스처 */}
                            <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_20px)] pointer-events-none"></div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 relative z-10">
                                {candidates.map((game) => (
                                    <CandidateCard key={game.psStoreId} game={game} onExtract={handleExtractStart} isAuthenticated={isAuthenticated} openLoginModal={openLoginModal} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 sm:py-32 bg-[#0d1117] rounded-2xl sm:rounded-[3rem] border border-dashed border-[#1f2937] mt-4 relative overflow-hidden shadow-inner animate-fadeIn">

                            {/* 배경 레이더 파동 애니메이션 */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                                <div className="absolute w-48 h-48 sm:w-64 sm:h-64 border border-blue-500/30 rounded-full animate-[ping_3s_ease-in-out_infinite]"></div>
                                <div className="absolute w-32 h-32 sm:w-48 sm:h-48 border border-blue-400/20 rounded-full animate-[ping_3s_ease-in-out_infinite_0.5s]"></div>
                            </div>

                            {/* 메인 콘텐츠 */}
                            <div className="relative z-10 flex flex-col items-center px-4 text-center">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-900/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                    <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 opacity-80" />
                                </div>
                                <h3 className="text-lg sm:text-2xl font-black text-gray-200 mb-2 drop-shadow-md">
                                    현재 탐지된 신규 원석이 없습니다.
                                </h3>
                                <p className="text-gray-500 text-xs sm:text-sm max-w-md break-keep leading-relaxed">
                                    개척자님들이 모든 데이터를 성공적으로 수집했습니다!<br/>
                                    다음번 스토어 심층부 탐사가 끝날 때까지 기다려주세요.
                                </p>

                                <button
                                    onClick={() => navigate('/games')}
                                    className="mt-8 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-lg"
                                >
                                    기존 게임 진열장 둘러보기
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default PioneerCandidatesPage;