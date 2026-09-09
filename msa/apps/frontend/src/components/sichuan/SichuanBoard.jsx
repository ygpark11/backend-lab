import React, { useRef } from 'react';
import SichuanTile from './SichuanTile';

const SichuanBoard = ({
    board,
    selectedPos,
    shakingPos = null,
    hintPair,
    matchedKeys = new Set(),
    laserPath = null,
    laserColor = '#3B82F6',
    onTileClick
}) => {
    const boardRef = useRef(null);

    if (!board || board.length === 0) return null;

    const rows = board.length;
    const cols = board[0].length;

    // SVG 레이저 라인 좌표 계산
    let polylinePoints = '';
    if (laserPath && laserPath.length >= 2) {
        polylinePoints = laserPath
            .map(p => {
                const xPercent = ((p.c + 0.5) / cols) * 100;
                const yPercent = ((p.r + 0.5) / rows) * 100;
                return `${xPercent},${yPercent}`;
            })
            .join(' ');
    }

    const isLandscape = cols > rows;

    return (
        <div
            ref={boardRef}
            style={{
                aspectRatio: `${cols} / ${rows}`,
                width: isLandscape
                    ? 'min(100%, calc((100dvh - 180px) * (18 / 11)))'
                    : 'min(98vw, calc((100dvh - 175px) * (11 / 18)))',
                maxWidth: isLandscape ? '1040px' : '460px',
                maxHeight: 'calc(100dvh - 170px)'
            }}
            className="relative mx-auto select-none p-1 sm:p-2.5 rounded-2xl bg-base/90 backdrop-blur-md border border-divider shadow-2xl overflow-hidden flex flex-col justify-center touch-manipulation"
        >
            {/* SVG 레이저 매칭 라인 오버레이 */}
            {polylinePoints && (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-30"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
                            <feMerge>
                                <feMergeNode in="blur2" />
                                <feMergeNode in="blur1" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* 외부 두꺼운 발광 선 */}
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={laserColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#neonGlow)"
                        className="animate-pulse"
                    />
                    {/* 내부 선명한 흰색 코어 선 */}
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}

            {/* 그리드 렌더링 */}
            <div
                className="grid gap-[2px] sm:gap-1 w-full h-full"
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                }}
            >
                {board.map((row, r) =>
                    row.map((tile, c) => {
                        const isSelected = selectedPos && selectedPos.r === r && selectedPos.c === c;
                        const isShaking = shakingPos && shakingPos.r === r && shakingPos.c === c;
                        const isHinted =
                            hintPair &&
                            ((hintPair.tile1.r === r && hintPair.tile1.c === c) ||
                                (hintPair.tile2.r === r && hintPair.tile2.c === c));
                        const isMatched = matchedKeys.has(`${r}_${c}`);

                        return (
                            <div
                                key={`${r}_${c}`}
                                className="w-full h-full flex items-center justify-center min-w-0 min-h-0"
                            >
                                <SichuanTile
                                    tile={tile}
                                    r={r}
                                    c={c}
                                    isSelected={isSelected}
                                    isShaking={isShaking}
                                    isHinted={isHinted}
                                    isMatched={isMatched}
                                    cellSize="w-full h-full"
                                    onClick={onTileClick}
                                />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default React.memo(SichuanBoard);
