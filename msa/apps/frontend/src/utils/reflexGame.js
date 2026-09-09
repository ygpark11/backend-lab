// PS Tracker 가격 신호등(Price Signal) 테마 심볼 정의
export const REFLEX_SYMBOLS = [
    {
        id: 'triangle',
        name: 'GOOD OFFER',
        label: '△',
        keyName: 'W',
        keys: ['ArrowUp', 'KeyW', 'w', 'W'],
        color: '#F59E0B', // 신호등 노란불 (GOOD_OFFER)
        bgGlow: 'rgba(245, 158, 11, 0.4)',
        borderColor: 'rgba(245, 158, 11, 0.8)'
    },
    {
        id: 'square',
        name: 'TRACKING',
        label: '□',
        keyName: 'A',
        keys: ['ArrowLeft', 'KeyA', 'a', 'A'],
        color: '#3B82F6', // 신호등 파란불 (TRACKING)
        bgGlow: 'rgba(59, 130, 246, 0.4)',
        borderColor: 'rgba(59, 130, 246, 0.8)'
    },
    {
        id: 'circle',
        name: 'BUY NOW',
        label: '○',
        keyName: 'D',
        keys: ['ArrowRight', 'KeyD', 'd', 'D'],
        color: '#22C55E', // 신호등 초록불 (BUY_NOW)
        bgGlow: 'rgba(34, 197, 94, 0.4)',
        borderColor: 'rgba(34, 197, 94, 0.8)'
    },
    {
        id: 'cross',
        name: 'WAIT',
        label: '×',
        keyName: 'S',
        keys: ['ArrowDown', 'KeyS', 's', 'S'],
        color: '#EF4444', // 신호등 빨간불 (WAIT)
        bgGlow: 'rgba(239, 68, 68, 0.4)',
        borderColor: 'rgba(239, 68, 68, 0.8)'
    }
];

export const REFLEX_CONFIG = {
    duration: 45, // 45초 타임어택
    baseScore: 200,
    comboMultiplier: 25,
    feverThreshold: 10 // 10콤보 이상 피버 모드 (2배 점수)
};

/**
 * 무작위 다음 심볼 생성 (이전 심볼과 연속 3번 이상 중복되지 않도록 안배)
 */
export function generateNextSymbol(prevSymbolId = null) {
    const pool = REFLEX_SYMBOLS.filter(s => s.id !== prevSymbolId);
    // 70% 확률로 다른 심볼, 30% 확률로 이전 심볼 허용
    const candidates = Math.random() < 0.7 ? pool : REFLEX_SYMBOLS;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    return {
        ...picked,
        uid: `${picked.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: Date.now()
    };
}

/**
 * 퀵 리액션 트로피 등급 산정
 */
export function calculateReflexTrophy(score, maxCombo) {
    if (score >= 24000 && maxCombo >= 35) {
        return {
            grade: 'PLATINUM',
            name: '플래티넘 트로피',
            title: '신경계 초월자 (Ultra Reflex Master)',
            desc: '인간의 한계를 뛰어넘은 궁극의 듀얼센스 리액션!',
            color: 'from-cyan-300 via-blue-200 to-indigo-300',
            textColor: 'text-cyan-400',
            bgGlow: 'rgba(6, 182, 212, 0.4)',
            badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
        };
    }
    if (score >= 18000) {
        return {
            grade: 'GOLD',
            name: '골드 트로피',
            title: '프로 게이머 리플렉스',
            desc: '놀라운 집중력으로 고득점을 달성했습니다!',
            color: 'from-amber-300 via-yellow-200 to-amber-500',
            textColor: 'text-yellow-400',
            bgGlow: 'rgba(245, 158, 11, 0.4)',
            badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
        };
    }
    if (score >= 12000) {
        return {
            grade: 'SILVER',
            name: '실버 트로피',
            title: '듀얼센스 마스터',
            desc: '안정적인 조작으로 훌륭한 반응 속도를 증명했습니다.',
            color: 'from-slate-200 via-gray-100 to-slate-400',
            textColor: 'text-slate-300',
            bgGlow: 'rgba(148, 163, 184, 0.4)',
            badgeBg: 'bg-slate-400/20 text-slate-300 border-slate-400/40'
        };
    }
    return {
        grade: 'BRONZE',
        name: '브론즈 트로피',
        title: '신속한 도전자',
        desc: '45초간 포기하지 않고 리액션 도전을 완료했습니다.',
        color: 'from-amber-700 via-orange-600 to-amber-900',
        textColor: 'text-amber-500',
        bgGlow: 'rgba(217, 119, 6, 0.4)',
        badgeBg: 'bg-amber-600/20 text-amber-500 border-amber-600/40'
    };
}
