import React, { useState, useEffect, useCallback } from 'react';
import {
    Trophy,
    Zap,
    Play,
    Timer,
    Sparkles,
    Flame,
    Award,
    Circle,
    Triangle,
    X as CrossIcon,
    Square,
    Gamepad2,
    Crown,
    LogIn,
    ChevronRight
} from 'lucide-react';
import SichuanGame from '../components/arcade/SichuanGame';
import QuickReflexGame from '../components/arcade/QuickReflexGame';
import LeaderboardModal from '../components/arcade/LeaderboardModal';
import { useAuth } from '../contexts/AuthContext';
import { arcadeApi } from '../api/arcadeApi';

const ArcadePage = () => {
    const { isAuthenticated, user, openLoginModal } = useAuth();

    // 뷰 모드: 'HUB' (아케이드 메인 라운지) | 'SICHUAN' (사천성) | 'REFLEX' (퀵 리액션)
    const [activeView, setActiveView] = useState('HUB');

    // 리더보드 모달 상태
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [leaderboardGameType, setLeaderboardGameType] = useState('sichuan');

    // 서버 DB 기반 내 최고 기록
    const [userBestScores, setUserBestScores] = useState({ sichuan: 0, reflex: 0 });

    const fetchUserBestScores = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setUserBestScores({ sichuan: 0, reflex: 0 });
            return;
        }

        try {
            const [sichuanData, reflexData] = await Promise.all([
                arcadeApi.getLeaderboard('sichuan', user),
                arcadeApi.getLeaderboard('reflex', user)
            ]);

            setUserBestScores({
                sichuan: sichuanData?.myRank?.score || 0,
                reflex: reflexData?.myRank?.score || 0
            });
        } catch (e) {
            console.error('[ArcadePage] 내 최고 기록 조회 실패:', e);
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        if (activeView === 'HUB') {
            fetchUserBestScores();
        }
    }, [activeView, fetchUserBestScores]);

    const handleOpenLeaderboard = (gameType = 'sichuan') => {
        setLeaderboardGameType(gameType);
        setIsLeaderboardOpen(true);
    };

    // 사천성 플레이 뷰
    if (activeView === 'SICHUAN') {
        return (
            <>
                <SichuanGame
                    user={user}
                    isAuthenticated={isAuthenticated}
                    initialBestScore={userBestScores.sichuan}
                    onBack={() => setActiveView('HUB')}
                    onOpenLeaderboard={handleOpenLeaderboard}
                    openLoginModal={openLoginModal}
                />
                <LeaderboardModal
                    isOpen={isLeaderboardOpen}
                    onClose={() => setIsLeaderboardOpen(false)}
                    initialGameType={leaderboardGameType}
                    isAuthenticated={isAuthenticated}
                    user={user}
                    openLoginModal={openLoginModal}
                />
            </>
        );
    }

    // 퀵 리액션 플레이 뷰
    if (activeView === 'REFLEX') {
        return (
            <>
                <QuickReflexGame
                    user={user}
                    isAuthenticated={isAuthenticated}
                    initialBestScore={userBestScores.reflex}
                    onBack={() => setActiveView('HUB')}
                    onOpenLeaderboard={handleOpenLeaderboard}
                    openLoginModal={openLoginModal}
                />
                <LeaderboardModal
                    isOpen={isLeaderboardOpen}
                    onClose={() => setIsLeaderboardOpen(false)}
                    initialGameType={leaderboardGameType}
                    isAuthenticated={isAuthenticated}
                    user={user}
                    openLoginModal={openLoginModal}
                />
            </>
        );
    }

    // 메인 아케이드 허브 (게임 선택 라운지)
    return (
        <div className="relative min-h-[calc(100dvh-4rem)] mt-16 bg-base text-primary px-4 py-6 sm:py-10 flex flex-col items-center justify-start select-none overflow-x-hidden">
            {/* PlayStation 상징 배경 애니메이션 심볼 */}
            <div className="absolute top-12 left-10 pointer-events-none opacity-[0.03] dark:opacity-[0.04] text-primary rotate-12">
                <Triangle className="w-56 h-56 stroke-[1.5px]" />
            </div>
            <div className="absolute bottom-12 right-10 pointer-events-none opacity-[0.03] dark:opacity-[0.04] text-ps-blue -rotate-12">
                <CrossIcon className="w-64 h-64 stroke-[1.5px]" />
            </div>

            <div className="w-full max-w-5xl z-10 flex flex-col items-center">
                {/* 상단 라운지 헤더 */}
                <div className="text-center max-w-2xl mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ps-blue/10 border border-ps-blue/20 text-ps-blue text-xs font-black tracking-wide uppercase mb-3">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>PlayStation Arcade Lounge</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-primary mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary via-ps-blue to-cyan-400">
                        PS 아케이드 미니게임 라운지
                    </h1>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed font-medium">
                        PlayStation 아이덴티티를 담은 캐주얼 미니게임에 도전하세요.<br className="hidden sm:inline" />
                        타임어택 챌린지를 완수하고 명예의 전당 리더보드에 이름을 남겨보세요!
                    </p>

                    {/* 통합 명예의 전당 CTA 버튼 */}
                    <div className="mt-5 flex items-center justify-center gap-3">
                        <button
                            onClick={() => handleOpenLeaderboard('sichuan')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface border border-divider hover:border-ps-blue/50 text-xs sm:text-sm font-bold text-primary hover:bg-surface-hover shadow-sm active:scale-95 transition-all group"
                        >
                            <Crown className="w-4 h-4 text-yellow-500 transition-transform group-hover:scale-110" />
                            <span>명예의 전당 (리더보드)</span>
                            <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {!isAuthenticated && (
                            <button
                                onClick={openLoginModal}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-ps-blue/10 border border-ps-blue/30 text-ps-blue text-xs font-bold hover:bg-ps-blue/20 transition-all"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>로그인하고 랭킹 등록</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 게임 선택 Bento 그리드 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 w-full">
                    {/* 게임 1: PS 트로피 사천성 */}
                    <div className="group relative bg-surface/90 backdrop-blur-md border border-divider hover:border-ps-blue/50 rounded-3xl p-6 sm:p-7 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                        {/* 상단 은은한 배경 글로우 */}
                        <div className="absolute -top-16 -right-16 w-40 h-40 bg-ps-blue/15 blur-3xl rounded-full pointer-events-none group-hover:bg-ps-blue/25 transition-all" />

                        <div>
                            {/* 상단 뱃지 & 아이콘 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-ps-blue/15 border border-ps-blue/30 text-ps-blue">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full bg-ps-blue/10 border border-ps-blue/20 text-[10px] font-black text-ps-blue">
                                        144 TILE
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full bg-base border border-divider text-[10px] font-bold text-secondary">
                                        120초
                                    </span>
                                </div>
                            </div>

                            {/* 타이틀 & 설명 */}
                            <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-primary mb-2 group-hover:text-ps-blue transition-colors">
                                PS 트로피 사천성
                            </h2>
                            <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-6 font-medium">
                                PlayStation의 상징 `○ △ × □` 패를 2번 이하로 꺾어 짝을 맞추는 타임어택 퍼즐.
                                콤보 보너스를 획득하고 플래티넘 트로피를 획득하세요!
                            </p>

                            {/* 스탯 프리뷰 */}
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-base border border-divider mb-6">
                                <Award className="w-4 h-4 text-yellow-500 shrink-0" />
                                <div className="flex-1 flex items-center justify-between text-xs">
                                    <span className="text-secondary font-bold">내 최고 기록</span>
                                    <span className={`font-black ${isAuthenticated ? 'text-primary' : 'text-secondary text-[11px]'}`}>
                                        {isAuthenticated ? `${userBestScores.sichuan.toLocaleString()}P` : '로그인 시 기록'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 하단 액션 버튼 */}
                        <div className="flex items-center gap-2 pt-2 border-t border-divider/60">
                            <button
                                onClick={() => setActiveView('SICHUAN')}
                                className="flex-1 py-3 px-4 rounded-2xl bg-ps-blue hover:bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,112,209,0.4)] hover:shadow-[0_0_20px_rgba(0,112,209,0.6)] active:scale-95 transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>플레이하기</span>
                            </button>
                            <button
                                onClick={() => handleOpenLeaderboard('sichuan')}
                                className="py-3 px-3.5 rounded-2xl bg-base hover:bg-surface-hover border border-divider text-secondary hover:text-primary transition-colors text-xs font-bold"
                                title="사천성 랭킹 보기"
                            >
                                <Trophy className="w-4 h-4 text-yellow-500" />
                            </button>
                        </div>
                    </div>

                    {/* 게임 2: PS 퀵 리액션 (QTE) */}
                    <div className="group relative bg-surface/90 backdrop-blur-md border border-divider hover:border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                        {/* 상단 은은한 배경 글로우 */}
                        <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/15 blur-3xl rounded-full pointer-events-none group-hover:bg-amber-500/25 transition-all" />

                        <div>
                            {/* 상단 뱃지 & 아이콘 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-500">
                                        신규 • QTE
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full bg-base border border-divider text-[10px] font-bold text-secondary">
                                        45초
                                    </span>
                                </div>
                            </div>

                            {/* 타이틀 & 설명 */}
                            <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-primary mb-2 group-hover:text-amber-500 transition-colors">
                                PS 퀵 리액션 (QTE)
                            </h2>
                            <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-6 font-medium">
                                중앙 타겟 링에 등장하는 PlayStation 심볼을 빠르고 정확하게 매칭!
                                10콤보 이상 달성 시 2배 점수의 피버 모드가 발동됩니다.
                            </p>

                            {/* 스탯 프리뷰 */}
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-base border border-divider mb-6">
                                <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                                <div className="flex-1 flex items-center justify-between text-xs">
                                    <span className="text-secondary font-bold">내 최고 기록</span>
                                    <span className={`font-black ${isAuthenticated ? 'text-primary' : 'text-secondary text-[11px]'}`}>
                                        {isAuthenticated ? `${userBestScores.reflex.toLocaleString()}P` : '로그인 시 기록'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 하단 액션 버튼 */}
                        <div className="flex items-center gap-2 pt-2 border-t border-divider/60">
                            <button
                                onClick={() => setActiveView('REFLEX')}
                                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-95 transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>플레이하기</span>
                            </button>
                            <button
                                onClick={() => handleOpenLeaderboard('reflex')}
                                className="py-3 px-3.5 rounded-2xl bg-base hover:bg-surface-hover border border-divider text-secondary hover:text-primary transition-colors text-xs font-bold"
                                title="퀵 리액션 랭킹 보기"
                            >
                                <Trophy className="w-4 h-4 text-yellow-500" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 리더보드 모달 */}
            <LeaderboardModal
                isOpen={isLeaderboardOpen}
                onClose={() => setIsLeaderboardOpen(false)}
                initialGameType={leaderboardGameType}
                isAuthenticated={isAuthenticated}
                user={user}
                openLoginModal={openLoginModal}
            />
        </div>
    );
};

export default ArcadePage;
