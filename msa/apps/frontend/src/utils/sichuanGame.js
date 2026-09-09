// PS Tracker 가격 신호등(Price Signal) 및 게이밍 테마 타일 정의
export const TILE_DEFINITIONS = [
    {
        id: 'circle',
        name: 'BUY NOW (최저가)',
        icon: 'Circle',
        color: '#22C55E', // 신호등 초록불 (BUY_NOW)
        bgColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgba(34, 197, 94, 0.5)',
        shadowColor: 'rgba(34, 197, 94, 0.3)',
        category: 'signal'
    },
    {
        id: 'triangle',
        name: 'GOOD OFFER (양호)',
        icon: 'Triangle',
        color: '#F59E0B', // 신호등 노란불 (GOOD_OFFER)
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        shadowColor: 'rgba(245, 158, 11, 0.3)',
        category: 'signal'
    },
    {
        id: 'cross',
        name: 'WAIT (비싸요)',
        icon: 'X',
        color: '#EF4444', // 신호등 빨간불 (WAIT)
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        shadowColor: 'rgba(239, 68, 68, 0.3)',
        category: 'signal'
    },
    {
        id: 'square',
        name: 'TRACKING (추적중)',
        icon: 'Square',
        color: '#3B82F6', // 신호등 파란불 (TRACKING)
        bgColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        category: 'signal'
    },
    {
        id: 'trophy',
        name: 'Trophy',
        icon: 'Trophy',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        shadowColor: 'rgba(245, 158, 11, 0.3)',
        category: 'gaming'
    },
    {
        id: 'gamepad',
        name: 'DualSense',
        icon: 'Gamepad2',
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        category: 'gaming'
    },
    {
        id: 'sparkles',
        name: 'Astro',
        icon: 'Sparkles',
        color: '#A855F7',
        bgColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: 'rgba(168, 85, 247, 0.5)',
        shadowColor: 'rgba(168, 85, 247, 0.3)',
        category: 'gaming'
    },
    {
        id: 'flame',
        name: 'God of War',
        icon: 'Flame',
        color: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.15)',
        borderColor: 'rgba(249, 115, 22, 0.5)',
        shadowColor: 'rgba(249, 115, 22, 0.3)',
        category: 'gaming'
    },
    {
        id: 'zap',
        name: 'Infamous',
        icon: 'Zap',
        color: '#EAB308',
        bgColor: 'rgba(234, 179, 8, 0.15)',
        borderColor: 'rgba(234, 179, 8, 0.5)',
        shadowColor: 'rgba(234, 179, 8, 0.3)',
        category: 'gaming'
    },
    {
        id: 'heart',
        name: 'Heart',
        icon: 'Heart',
        color: '#F43F5E',
        bgColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.5)',
        shadowColor: 'rgba(244, 63, 94, 0.3)',
        category: 'gaming'
    },
    {
        id: 'shield',
        name: 'Shield',
        icon: 'Shield',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        shadowColor: 'rgba(16, 185, 129, 0.3)',
        category: 'gaming'
    },
    {
        id: 'crown',
        name: 'Elden Ring',
        icon: 'Crown',
        color: '#818CF8',
        bgColor: 'rgba(129, 140, 248, 0.15)',
        borderColor: 'rgba(129, 140, 248, 0.5)',
        shadowColor: 'rgba(129, 140, 248, 0.3)',
        category: 'gaming'
    },
    {
        id: 'swords',
        name: 'Ghost of Tsushima',
        icon: 'Swords',
        color: '#06B6D4',
        bgColor: 'rgba(6, 182, 212, 0.15)',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        shadowColor: 'rgba(6, 182, 212, 0.3)',
        category: 'gaming'
    },
    {
        id: 'ghost',
        name: 'Demon Soul',
        icon: 'Ghost',
        color: '#C084FC',
        bgColor: 'rgba(192, 132, 252, 0.15)',
        borderColor: 'rgba(192, 132, 252, 0.5)',
        shadowColor: 'rgba(192, 132, 252, 0.3)',
        category: 'gaming'
    }
];

export const BOARD_CONFIG = {
    mobile: { cols: 9, rows: 16 },
    desktop: { cols: 16, rows: 9 },
    tileCount: 144, // 144개 타일 (12가지 심볼 * 12개씩)
    distinctTypes: 12,
    initialTime: 120
};

/**
 * 반응형 사천성 보드 생성
 * @param {boolean} isLandscape 데스크톱/가로 모드 여부 (true: 16열x9행, false: 9열x16행)
 */
export function createGameBoard(isLandscape = false) {
    const config = isLandscape ? BOARD_CONFIG.desktop : BOARD_CONFIG.mobile;
    const innerCols = config.cols;
    const innerRows = config.rows;
    const totalTiles = BOARD_CONFIG.tileCount;

    // 12가지 타일 종류 균등 배분 (각 종류당 12개씩 총 144개)
    const selectedTypes = TILE_DEFINITIONS.slice(0, BOARD_CONFIG.distinctTypes);
    const copiesPerType = totalTiles / selectedTypes.length; // 144 / 12 = 12

    const tilePool = [];
    selectedTypes.forEach(type => {
        for (let i = 0; i < copiesPerType; i++) {
            tilePool.push({ ...type, uid: `${type.id}_${i}` });
        }
    });

    // Fisher-Yates 셔플
    for (let i = tilePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tilePool[i], tilePool[j]] = [tilePool[j], tilePool[i]];
    }

    // 전체 그리드: 외곽 패딩 1칸씩 추가하여 (innerRows + 2)행 x (innerCols + 2)열
    const boardRows = innerRows + 2;
    const boardCols = innerCols + 2;
    const board = Array.from({ length: boardRows }, () =>
        Array.from({ length: boardCols }, () => null)
    );

    let poolIdx = 0;
    for (let r = 1; r <= innerRows; r++) {
        for (let c = 1; c <= innerCols; c++) {
            board[r][c] = tilePool[poolIdx++];
        }
    }

    // 초기 생성 시 매칭 가능한 패가 있는지 확인, 없으면 셔플
    let validBoard = board;
    let attempts = 0;
    while (!hasAvailableMoves(validBoard) && attempts < 25) {
        validBoard = shuffleBoard(validBoard);
        attempts++;
    }

    return validBoard;
}

/**
 * 직선(0회 꺾임) 연결 가능 여부 검사
 * 두 점 사이에 빈 칸(null)만 있어야 함
 */
function canConnectDirect(board, r1, c1, r2, c2) {
    if (r1 !== r2 && c1 !== c2) return false;

    if (r1 === r2) {
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        for (let c = minC + 1; c < maxC; c++) {
            if (board[r1][c] !== null) return false;
        }
        return true;
    } else {
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
            if (board[r][c1] !== null) return false;
        }
        return true;
    }
}

/**
 * 주어진 위치에서 상하좌우로 장애물을 만나기 전까지 도달할 수 있는 모든 빈 셀(외곽 포함) 목록 반환
 */
function getReachableCells(board, r, c) {
    const rows = board.length;
    const cols = board[0].length;
    const cells = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (board[nr][nc] === null) {
                cells.push({ r: nr, c: nc });
            } else {
                break; // 다른 타일을 만나면 중단
            }
            nr += dr;
            nc += dc;
        }
    }
    return cells;
}

/**
 * 사천성 정통 경로 탐색 알고리즘 (0꺾, 1꺾, 2꺾 외곽 우회 포함 100% 무결점 탐색)
 * @returns {Array<{r: number, c: number}> | null} 연결 경로 좌표 배열 또는 불가능 시 null
 */
export function findSichuanPath(board, start, end) {
    if (!start || !end) return null;
    const { r: r1, c: c1 } = start;
    const { r: r2, c: c2 } = end;

    // 동일한 셀이거나 둘 중 하나가 빈 칸이면 매칭 불가
    if (r1 === r2 && c1 === c2) return null;
    const tile1 = board[r1]?.[c1];
    const tile2 = board[r2]?.[c2];
    if (!tile1 || !tile2 || tile1.id !== tile2.id) return null;

    // 1) 0회 꺾임 (직선 연결)
    if (canConnectDirect(board, r1, c1, r2, c2)) {
        return [{ r: r1, c: c1 }, { r: r2, c: c2 }];
    }

    // 양쪽 타일에서 각각 1회 직선으로 뻗어나갈 수 있는 모든 빈 공간 탐색
    const reachA = getReachableCells(board, r1, c1);
    const reachB = getReachableCells(board, r2, c2);

    // 2) 1회 꺾임 (L자형) - reachA와 reachB의 교집합 코너 점 존재 여부
    for (const p of reachA) {
        if (reachB.some(q => q.r === p.r && q.c === p.c)) {
            return [{ r: r1, c: c1 }, p, { r: r2, c: c2 }];
        }
    }

    // 3) 2회 꺾임 (3개 선분, 외곽 우회 및 Z/U자형)
    // reachA의 점 p와 reachB의 점 q 사이에 장애물 없이 일직선으로 연결되는 쌍 탐색
    for (const p of reachA) {
        for (const q of reachB) {
            // p와 q가 일직선 상에 있고 사이에 장애물이 없는지 검사
            if (canConnectDirect(board, p.r, p.c, q.r, q.c)) {
                // 경로: start -> p -> q -> end
                // p와 q가 같은 축이면 하나의 코너로 축소, 다르면 2회 꺾임 유지
                const path = [{ r: r1, c: c1 }];
                if (p.r !== r1 || p.c !== c1) path.push(p);
                if ((q.r !== p.r || q.c !== p.c) && (q.r !== r2 || q.c !== c2)) path.push(q);
                path.push({ r: r2, c: c2 });
                return path;
            }
        }
    }

    return null;
}

/**
 * 현재 보드에서 매칭 가능한 한 쌍을 찾아 반환 (힌트 및 데드락 검사용)
 */
export function findAvailableMatch(board) {
    const tiles = [];
    const rows = board.length;
    const cols = board[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c] !== null) {
                tiles.push({ r, c, tile: board[r][c] });
            }
        }
    }

    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i].tile.id === tiles[j].tile.id) {
                const path = findSichuanPath(board, tiles[i], tiles[j]);
                if (path) {
                    return {
                        tile1: tiles[i],
                        tile2: tiles[j],
                        path
                    };
                }
            }
        }
    }
    return null;
}

/**
 * 매칭 가능한 쌍이 하나라도 존재하는지 확인
 */
export function hasAvailableMoves(board) {
    return findAvailableMatch(board) !== null;
}

/**
 * 현재 남아있는 타일들만 그대로 유지하며 위치를 무작위로 재배치 (셔플)
 */
export function shuffleBoard(board) {
    const rows = board.length;
    const cols = board[0].length;
    const currentTiles = [];
    const positions = [];

    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (board[r][c] !== null) {
                currentTiles.push(board[r][c]);
                positions.push({ r, c });
            }
        }
    }

    if (currentTiles.length <= 2) return board;

    // Fisher-Yates 셔플
    for (let i = currentTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentTiles[i], currentTiles[j]] = [currentTiles[j], currentTiles[i]];
    }

    const newBoard = board.map(row => [...row]);
    positions.forEach((pos, idx) => {
        newBoard[pos.r][pos.c] = currentTiles[idx];
    });

    return newBoard;
}

/**
 * 클리어 시 성적과 트로피 등급 산정 (144개 타일, 120초 기준)
 */
export function calculateTrophy(score, remainingTime, maxCombo) {
    if (remainingTime >= 40 || score >= 12000 || maxCombo >= 15) {
        return {
            grade: 'PLATINUM',
            name: '플래티넘 트로피',
            desc: '빛의 속도로 대형 보드를 완벽하게 제패한 전설!',
            color: '#38BDF8', // Neon Sky Blue
            bgColor: 'rgba(56, 189, 248, 0.2)',
            borderColor: '#38BDF8'
        };
    }
    if (remainingTime >= 20 || score >= 9000 || maxCombo >= 10) {
        return {
            grade: 'GOLD',
            name: '골드 트로피',
            desc: '엄청난 속도와 집중력으로 144개 타일을 클리어했습니다!',
            color: '#FACC15', // Gold
            bgColor: 'rgba(250, 204, 21, 0.2)',
            borderColor: '#FACC15'
        };
    }
    if (remainingTime >= 10 || score >= 7500) {
        return {
            grade: 'SILVER',
            name: '실버 트로피',
            desc: '제한 시간 내에 끈기 있게 완주했습니다!',
            color: '#E2E8F0', // Silver
            bgColor: 'rgba(226, 232, 240, 0.2)',
            borderColor: '#CBD5E1'
        };
    }
    return {
        grade: 'BRONZE',
        name: '브론즈 트로피',
        desc: '144개 대형 보드를 완벽하게 클리어했습니다!',
        color: '#CD7F32', // Bronze
        bgColor: 'rgba(205, 127, 50, 0.2)',
        borderColor: '#CD7F32'
    };
}
