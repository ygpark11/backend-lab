import React from 'react';
import {
    Circle,
    Triangle,
    X as CrossIcon,
    Square,
    Trophy,
    Gamepad2,
    Sparkles,
    Flame,
    Zap,
    Heart,
    Shield,
    Crown,
    Swords,
    Ghost
} from 'lucide-react';

const ICON_MAP = {
    Circle,
    Triangle,
    X: CrossIcon,
    Square,
    Trophy,
    Gamepad2,
    Sparkles,
    Flame,
    Zap,
    Heart,
    Shield,
    Crown,
    Swords,
    Ghost
};

const SichuanTile = ({
    tile,
    r,
    c,
    isSelected = false,
    isHinted = false,
    isMatched = false,
    isShaking = false,
    onClick,
    cellSize = 'w-full h-full'
}) => {
    if (!tile) {
        return <div className={`${cellSize} pointer-events-none`} />;
    }

    const IconComponent = ICON_MAP[tile.icon] || Gamepad2;

    const handleClick = React.useCallback(() => {
        if (onClick) onClick(r, c);
    }, [onClick, r, c]);

    return (
        <button
            type="button"
            onClick={handleClick}
            style={{
                borderColor: isShaking ? '#ef4444' : isSelected ? tile.color : undefined,
                boxShadow: isShaking
                    ? '0 0 12px rgba(239, 68, 68, 0.7)'
                    : isSelected
                    ? `0 0 14px ${tile.color}, inset 0 0 6px ${tile.color}40`
                    : isHinted
                    ? '0 0 12px rgba(250, 204, 21, 0.8)'
                    : undefined
            }}
            className={`
                relative ${cellSize} flex items-center justify-center rounded-lg sm:rounded-xl border transition-all duration-150
                select-none touch-manipulation transform-gpu
                ${
                    isShaking
                        ? 'animate-tile-shake border-red-500 bg-red-500/20 z-30'
                        : isSelected
                        ? 'scale-105 z-20 bg-surface-hover border-2 ring-1 ring-white/40'
                        : isHinted
                        ? 'border-yellow-400 border-2 animate-bounce z-10 bg-yellow-500/20'
                        : 'bg-surface hover:bg-surface-hover border-divider hover:border-border-strong hover:scale-[1.03] active:scale-95'
                }
                ${isMatched ? 'opacity-0 scale-50 transition-all duration-300' : 'opacity-100'}
            `}
            aria-label={tile.name}
        >
            {/* 배경 은은한 컬러 틴트 */}
            <div
                className="absolute inset-0 rounded-lg sm:rounded-xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
                style={{ backgroundColor: tile.color }}
            />

            {/* 타일 중앙 아이콘 (타일 크기에 맞춰 60% 비율로 또렷하게 자동 스케일링) */}
            <IconComponent
                className="w-[58%] h-[58%] transition-transform duration-200 stroke-[2.4px]"
                style={{
                    color: isShaking ? '#ef4444' : tile.color,
                    filter: isSelected ? `drop-shadow(0 0 6px ${tile.color})` : undefined
                }}
            />

            {/* 선택 표시 코너 닷 */}
            {isSelected && (
                <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: tile.color }}
                />
            )}
        </button>
    );
};

export default React.memo(SichuanTile);
