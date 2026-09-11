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
    ChevronRight,
    Rocket,
    Hammer
} from 'lucide-react';
import DragonFlightGame from '../components/arcade/DragonFlightGame';
import SichuanGame from '../components/arcade/SichuanGame';
import QuickReflexGame from '../components/arcade/QuickReflexGame';
import SymbolForgeGame from '../components/arcade/SymbolForgeGame';
import LeaderboardModal from '../components/arcade/LeaderboardModal';
import { useAuth } from '../contexts/AuthContext';
import { arcadeApi } from '../api/arcadeApi';

const ArcadePage = () => {
    const { isAuthenticated, user, openLoginModal } = useAuth();

    // 심볼 포지 게임 정식 오픈 전 비공개 플래그 (true로 변경 시 아케이드 메인에 노출)
    const SHOW_FORGE_GAME = false;

    // 뷰 모드: 'HUB' (아케이드 메인 라운지) | 'FLIGHT' (PS 플라이트) | 'SICHUAN' (사천성) | 'REFLEX' (퀵 리액션) | 'FORGE' (심볼 포지)
    const [activeView, setActiveView] = useState('HUB');

    // 리더보드 모달 상태
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [leaderboardGameType, setLeaderboardGameType] = useState('flight');

    // 서버 DB 기반 내 최고 기록
    const [userBestScores, setUserBestScores] = useState({
        flight: 0,
        sichuan: 0,
        reflex: 0,
        forge: 0
    });

    const fetchUserBestScores = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setUserBestScores({ flight: 0, sichuan: 0, reflex: 0, forge: 0 });
            return;
        }

        try {
            const promises = [
                arcadeApi.getLeaderboard('flight', user).catch(() => null),
                arcadeApi.getLeaderboard('sichuan', user).catch(() => null),
                arcadeApi.getLeaderboard('reflex', user).catch(() => null)
            ];
            if (SHOW_FORGE_GAME) {
                promises.push(arcadeApi.getLeaderboard('forge', user).catch(() => null));
            }

            const [flightData, sichuanData, reflexData, forgeData] = await Promise.all(promises);

            setUserBestScores({
                flight: flightData?.myRank?.score || 0,
                sichuan: sichuanData?.myRank?.score || 0,
                reflex: reflexData?.myRank?.score || 0,
                forge: forgeData?.myRank?.score || 0
            });
        } catch (e) {
            console.error('[ArcadePage] 내 최고 기록 조회 실패:', e);
        }
    }, [isAuthenticated, user, SHOW_FORGE_GAME]);

    useEffect(() => {
        if (activeView === 'HUB') {
            fetchUserBestScores();
        }
    }, [activeView, fetchUserBestScores]);

    const handleOpenLeaderboard = (gameType = 'flight') => {
        setLeaderboardGameType(gameType);
        setIsLeaderboardOpen(true);
    };

    // 1. PS 플라이트 플레이 뷰
    if (activeView === 'FLIGHT') {
        return (
            <>
                <DragonFlightGame
                    onBack={() => setActiveView('HUB')}
                    onOpenLeaderboard={handleOpenLeaderboard}
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

    // 2. 사천성 플레이 뷰
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

    // 3. 퀵 리액션 플레이 뷰
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

    // 4. PS 심볼 포지 (+20강 챌린지) 플레이 뷰
    if (activeView === 'FORGE') {
        return (
            <>
                <SymbolForgeGame
                    onBack={() => setActiveView('HUB')}
                    onOpenLeaderboard={handleOpenLeaderboard}
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
                        PS 아케이드 라운지
                    </h1>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed font-medium">
                        PlayStation 감성의 아케이드 게임에 도전하세요.<br className="hidden sm:inline" />
                        자신의 한계를 시험하고 글로벌 명예의 전당 리더보드에 이름을 남겨보세요!
                    </p>

                    {/* 통합 명예의 전당 CTA 버튼 */}
                    <div className="mt-5 flex items-center justify-center gap-3">
                        <button
                            onClick={() => handleOpenLeaderboard('flight')}
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

                {/* 아케이드 게임 전면 카드 그리드 */}
                <div className={`grid grid-cols-1 ${SHOW_FORGE_GAME ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5 sm:gap-6 w-full max-w-5xl`}>
                    {/* 게임 1: PS 플라이트 (드래곤 플라이트) */}
                    <div className="group relative bg-surface/90 backdrop-blur-md border-2 border-ps-blue/40 hover:border-ps-blue rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-40 h-40 bg-ps-blue/20 blur-3xl rounded-full pointer-events-none group-hover:bg-ps-blue/30 transition-all" />

                        <div>
                            {/* 상단 뱃지 & 아이콘 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-ps-blue/15 border border-ps-blue/30 text-ps-blue">
                                    <Rocket className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full bg-ps-blue text-white text-[10px] font-black uppercase tracking-wide">
                                        슈팅 • 러너
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full bg-base border border-divider text-[10px] font-bold text-secondary">
                                        라이프 2개+쉴드
                                    </span>
                                </div>
                            </div>

                            {/* 타이틀 & 설명 */}
                            <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-primary mb-2 group-hover:text-ps-blue transition-colors">
                                PS 플라이트
                            </h2>
                            <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-6 font-medium">
                                5개 레인에서 쏟아지는 적들을 격추하며 끝없이 질주하세요!
                                파워샷, 자석, 하이퍼 무적 대시와 폭탄(Space)으로 최고 거리를 돌파하세요.
                            </p>

                            {/* 스탯 프리뷰 */}
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-base border border-divider mb-6">
                                <Award className="w-4 h-4 text-yellow-500 shrink-0" />
                                <div className="flex-1 flex items-center justify-between text-xs">
                                    <span className="text-secondary font-bold">내 최고 기록</span>
                                    <span className={`font-black ${isAuthenticated ? 'text-primary' : 'text-secondary text-[11px]'}`}>
                                        {isAuthenticated ? `${userBestScores.flight.toLocaleString()}P` : '로그인 시 기록'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 하단 액션 버튼 */}
                        <div className="flex items-center gap-2 pt-2 border-t border-divider/60">
                            <button
                                onClick={() => setActiveView('FLIGHT')}
                                className="flex-1 py-3 px-4 rounded-2xl bg-ps-blue hover:bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,112,209,0.4)] hover:shadow-[0_0_20px_rgba(0,112,209,0.6)] active:scale-95 transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>플레이하기</span>
                            </button>
                            <button
                                onClick={() => handleOpenLeaderboard('flight')}
                                className="py-3 px-3.5 rounded-2xl bg-base hover:bg-surface-hover border border-divider text-secondary hover:text-primary transition-colors text-xs font-bold"
                                title="플라이트 랭킹 보기"
                            >
                                <Trophy className="w-4 h-4 text-yellow-500" />
                            </button>
                        </div>
                    </div>

                    {/* 게임 2: PS 심볼 포지 (+20강 챌린지) [정식 오픈 시 노출] */}
                    {SHOW_FORGE_GAME && (
                        <div className="group relative bg-surface/90 backdrop-blur-md border-2 border-amber-500/40 hover:border-amber-500 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                            <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/20 blur-3xl rounded-full pointer-events-none group-hover:bg-amber-500/30 transition-all" />

                            <div>
                                {/* 상단 뱃지 & 아이콘 */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                                        <Hammer className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wide shadow-sm">
                                            신규 • 강화
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full bg-base border border-divider text-[10px] font-bold text-secondary">
                                            자원순환 & 도파민
                                        </span>
                                    </div>
                                </div>

                                {/* 타이틀 & 설명 */}
                                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-primary mb-2 group-hover:text-amber-500 transition-colors">
                                    PS 심볼 포지: +20강
                                </h2>
                                <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-6 font-medium">
                                    4대 PlayStation 심볼을 사이버네틱 대장간에서 벼려내세요!
                                    단계별 우주 진화, 상점 판매를 통한 자본금 증식, 그리고 +20강 신화 완주에 도전하세요.
                                </p>

                                {/* 스탯 프리뷰 */}
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-base border border-divider mb-6">
                                    <Award className="w-4 h-4 text-yellow-500 shrink-0" />
                                    <div className="flex-1 flex items-center justify-between text-xs">
                                        <span className="text-secondary font-bold">내 최고 기록</span>
                                        <span className={`font-black ${isAuthenticated ? 'text-amber-500' : 'text-secondary text-[11px]'}`}>
                                            {isAuthenticated
                                                ? userBestScores.forge > 0
                                                    ? `+${Math.floor(userBestScores.forge / 1000000)}강 달성`
                                                    : '도전 전'
                                                : '로그인 시 기록'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 하단 액션 버튼 */}
                            <div className="flex items-center gap-2 pt-2 border-t border-divider/60">
                                <button
                                    onClick={() => setActiveView('FORGE')}
                                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-95 transition-all"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    <span>플레이하기</span>
                                </button>
                                <button
                                    onClick={() => handleOpenLeaderboard('forge')}
                                    className="py-3 px-3.5 rounded-2xl bg-base hover:bg-surface-hover border border-divider text-secondary hover:text-primary transition-colors text-xs font-bold"
                                    title="심볼 포지 랭킹 보기"
                                >
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 게임 3: PS 트로피 사천성 */}
                    <div className="group relative bg-surface/90 backdrop-blur-md border border-divider hover:border-ps-blue/50 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
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

                    {/* 게임 4: PS 퀵 리액션 (QTE) */}
                    <div className="group relative bg-surface/90 backdrop-blur-md border border-divider hover:border-amber-500/50 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/15 blur-3xl rounded-full pointer-events-none group-hover:bg-amber-500/25 transition-all" />

                        <div>
                            {/* 상단 뱃지 & 아이콘 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-500">
                                        피지컬 • QTE
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
