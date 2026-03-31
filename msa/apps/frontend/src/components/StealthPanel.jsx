import React from 'react';
import { Radar, Users, Flame } from 'lucide-react';

const StealthPanel = ({ watchersCount, averagePrice, isLiked }) => {
    if (watchersCount === 0) return null;

    const isSingleWatcher = watchersCount === 1;
    const isMajorTarget = watchersCount >= 10;

    const getStatusIcon = () => {
        if (isSingleWatcher) return <Radar className="w-5 h-5" />;
        if (isMajorTarget) return <Flame className="w-5 h-5" />;
        return <Users className="w-5 h-5" />;
    };

    const getStatusTitle = () => {
        if (isSingleWatcher) return '[상태: 스텔스 찜]';
        if (isMajorTarget) return '[상태: 메이저 타겟]';
        return '[상태: 소수 정예]';
    };

    const getBgColor = () => {
        if (isSingleWatcher) return 'bg-blue-500/10 text-blue-700 dark:text-ps-blue border border-blue-500/30';
        if (isMajorTarget) return 'bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/30';
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-500 border border-purple-500/30';
    };

    return (
        <div className="bg-glass backdrop-blur-md border border-divider rounded-xl p-4 mt-4 relative overflow-hidden group shadow-sm">

            <div className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,theme(colors.blue.500/40)_120deg,transparent_130deg,transparent_360deg)] animate-[spin_8s_linear_infinite] rounded-full blur-xl" />
            </div>

            <div className="absolute -right-4 -top-4 w-24 h-24 bg-ps-blue/10 rounded-full blur-2xl group-hover:bg-ps-blue/20 transition-all duration-700"></div>

            <div className="flex items-start gap-3 relative z-10">
                <div className={`p-2 rounded-lg shadow-sm ${getBgColor()}`}>
                    {getStatusIcon()}
                </div>

                <div>
                    <h4 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                        {getStatusTitle()}
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ps-blue opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-ps-blue"></span>
                        </span>
                    </h4>

                    <p className="text-xs text-secondary leading-relaxed break-keep">
                        {isLiked ? (
                            isSingleWatcher ? (
                                "마스터님이 이 구역의 최초 주시자입니다. 게임의 가격 방어선이 무너지기를 은밀히 기다립니다."
                            ) : (
                                <>
                                    마스터님을 포함한 <strong className="text-primary">{watchersCount}명의 요원</strong>이 찜하고 있어요.
                                    {averagePrice && averagePrice > 0 && (
                                        <span className="block mt-1">
                                            요원들의 평균 목표가는 <strong className="text-purple-600 dark:text-purple-500">{averagePrice.toLocaleString()}원</strong> 입니다.
                                        </span>
                                    )}
                                </>
                            )
                        ) : (
                            isSingleWatcher ? (
                                "어느 고독한 개척자가 이 구역을 은밀히 주시하고 있습니다. 작전에 합류하시겠습니까?"
                            ) : (
                                <>
                                    <strong className="text-primary">{watchersCount}명의 정예 요원</strong>들이 이미 게임을 찜하고 있어요.
                                    {averagePrice && averagePrice > 0 && (
                                        <span className="block mt-1">
                                            포착된 평균 목표가는 <strong className="text-purple-600 dark:text-purple-500">{averagePrice.toLocaleString()}원</strong> 입니다.
                                        </span>
                                    )}
                                </>
                            )
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StealthPanel;