import React, { useState, useEffect, useCallback } from 'react';
import {
    Trophy,
    X,
    Crown,
    Medal,
    LogIn,
    User,
    RotateCw,
    Zap
} from 'lucide-react';
import { arcadeApi } from '../../api/arcadeApi';

const formatPlayerName = (item) => {
    if (!item) return '플레이어';
    const raw = item.nickname || item.username || item.memberNickname || '';
    if (!raw) return '플레이어';

    // 이메일 형식인 경우 도메인 제거 및 마스킹 처리하여 개인정보 보호
    if (raw.includes('@')) {
        const prefix = raw.split('@')[0];
        if (prefix.length <= 2) return prefix;
        return `${prefix.slice(0, -2)}**`;
    }
    return raw;
};

const LeaderboardModal = ({
    isOpen,
    onClose,
    initialGameType = 'sichuan',
    isAuthenticated = false,
    user = null,
    openLoginModal
}) => {
    const [activeGame, setActiveGame] = useState(initialGameType);
    const [leaderboardData, setLeaderboardData] = useState({ topList: [], myRank: null });
    const [isLoading, setIsLoading] = useState(false);

    const fetchLeaderboard = useCallback(async (gameType) => {
        setIsLoading(true);
        try {
            const data = await arcadeApi.getLeaderboard(gameType, user);
            setLeaderboardData(data);
        } catch {
            setLeaderboardData({ topList: [], myRank: null });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen) {
            setActiveGame(initialGameType);
            fetchLeaderboard(initialGameType);
        }
    }, [isOpen, initialGameType, fetchLeaderboard]);

    const handleTabChange = (type) => {
        setActiveGame(type);
        fetchLeaderboard(type);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 select-none">
            <div className="relative w-full max-w-lg bg-surface border border-divider rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-divider bg-surface/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-ps-blue text-white shadow-md">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-primary flex items-center gap-1.5">
                                <span>PS 아케이드 명예의 전당</span>
                            </h2>
                            <p className="text-[11px] text-secondary font-medium">
                                실시간 플레이어 순위 & 트로피 랭킹
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => fetchLeaderboard(activeGame)}
                            disabled={isLoading}
                            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                            title="새로고침"
                        >
                            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-ps-blue' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 게임 전환 탭 */}
                <div className="px-5 pt-3 pb-2 flex items-center gap-2 border-b border-divider/60 bg-base shrink-0">
                    <button
                        onClick={() => handleTabChange('sichuan')}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                            activeGame === 'sichuan'
                                ? 'bg-ps-blue text-white shadow-md'
                                : 'text-secondary hover:text-primary hover:bg-surface-hover'
                        }`}
                    >
                        <Trophy className="w-4 h-4" />
                        <span>트로피 사천성</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('reflex')}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                            activeGame === 'reflex'
                                ? 'bg-ps-blue text-white shadow-md'
                                : 'text-secondary hover:text-primary hover:bg-surface-hover'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        <span>퀵 리액션 (QTE)</span>
                    </button>
                </div>

                {/* 메인 랭킹 리스트 영역 (비로그인도 자유롭게 열람 가능) */}
                <div className="relative flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 min-h-[300px]">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-secondary gap-2.5">
                            <RotateCw className="w-7 h-7 animate-spin text-ps-blue" />
                            <span className="text-xs font-medium">명예의 전당 랭킹을 불러오는 중...</span>
                        </div>
                    ) : !leaderboardData.topList || leaderboardData.topList.length === 0 ? (
                        /* 데이터 없음 (Empty State) UI */
                        <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-16 h-16 rounded-3xl bg-surface-hover border border-divider flex items-center justify-center text-secondary mb-3.5 shadow-inner">
                                <Trophy className="w-8 h-8 opacity-30 text-amber-500" />
                            </div>
                            <h4 className="text-sm sm:text-base font-black text-primary mb-1">
                                아직 등록된 랭킹 기록이 없습니다
                            </h4>
                            <p className="text-xs text-secondary max-w-xs leading-relaxed">
                                지금 게임을 플레이하고 명예의 전당 최초 1위의 영예를 차지해보세요!
                            </p>
                        </div>
                    ) : (
                        /* 실시간 TOP 10 랭킹 목록 */
                        leaderboardData.topList.map((item, index) => {
                            const displayName = formatPlayerName(item);

                            return (
                                <div
                                    key={item.rank || index}
                                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                                        index === 0
                                            ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                                            : index === 1
                                            ? 'bg-slate-400/10 border-slate-400/30'
                                            : index === 2
                                            ? 'bg-amber-700/10 border-amber-700/30'
                                            : 'bg-base border-divider'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                                        {/* 순위 아이콘/숫자 */}
                                        <div className="w-7 text-center font-black shrink-0">
                                            {index === 0 ? (
                                                <Crown className="w-5 h-5 text-yellow-500 mx-auto" />
                                            ) : index === 1 ? (
                                                <Medal className="w-5 h-5 text-slate-300 mx-auto" />
                                            ) : index === 2 ? (
                                                <Medal className="w-5 h-5 text-amber-600 mx-auto" />
                                            ) : (
                                                <span className="text-xs text-secondary font-bold">{index + 1}</span>
                                            )}
                                        </div>

                                        {/* 유저 닉네임 */}
                                        <span className="text-xs sm:text-sm font-bold text-primary truncate">
                                            {displayName}
                                        </span>
                                    </div>

                                    {/* 점수 */}
                                    <div className="text-right shrink-0 pl-3">
                                        <span className="text-xs sm:text-sm font-black text-ps-blue">
                                            {(item.score || 0).toLocaleString()}P
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 하단 고정 바: 로그인 유저 (내 순위) vs 비로그인 유저 (로그인 유도 CTA) */}
                {isAuthenticated ? (
                    leaderboardData.myRank ? (
                        <div className="p-3.5 sm:p-4 bg-surface-hover border-t border-divider flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-ps-blue/20 text-ps-blue flex items-center justify-center font-black text-xs">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-primary">내 최고 기록</span>
                                        <span className="px-1.5 py-0.5 rounded bg-ps-blue text-white text-[10px] font-black">
                                            {leaderboardData.myRank.rank === '-' || !leaderboardData.myRank.rank
                                                ? '순위권 외'
                                                : `${leaderboardData.myRank.rank}위`}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-secondary">
                                        {formatPlayerName(leaderboardData.myRank) || user?.nickname || '나'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className="text-sm sm:text-base font-black text-ps-blue">
                                    {(leaderboardData.myRank.score || 0).toLocaleString()}P
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 sm:p-4 bg-surface-hover/60 border-t border-divider flex items-center justify-between shrink-0 text-xs text-secondary">
                            <span>아직 등록된 내 기록이 없습니다. 게임을 완료하여 순위표에 도전해보세요!</span>
                        </div>
                    )
                ) : (
                    /* 비로그인 유저인 경우 하단 로그인 안내 CTA */
                    <div className="p-3.5 sm:p-4 bg-surface-hover border-t border-divider flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-ps-blue/15 text-ps-blue flex items-center justify-center shrink-0">
                                <LogIn className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                                <p className="text-xs font-bold text-primary truncate">
                                    나의 최고 기록을 등록하고 싶으신가요?
                                </p>
                                <p className="text-[11px] text-secondary truncate">
                                    로그인하시면 게임 결과가 명예의 전당에 영구 기록됩니다.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                onClose();
                                if (openLoginModal) openLoginModal();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-ps-blue hover:bg-blue-600 text-white font-bold text-xs shrink-0 shadow-md active:scale-95 transition-all"
                        >
                            로그인하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardModal;
