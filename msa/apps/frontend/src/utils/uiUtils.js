// 한글 장르 데이터 기준 컬러 매핑
export const getGenreBadgeStyle = (genreString) => {
    if (!genreString) return 'bg-gray-700/50 text-gray-400 border-gray-600';

    const g = genreString; // 한글 문자열

    if (g.includes('액션') || g.includes('Action')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (g.includes('롤플레잉') || g.includes('RPG')) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (g.includes('공포') || g.includes('Horror')) return 'bg-red-900/40 text-red-400 border-red-500/30';
    if (g.includes('스포츠') || g.includes('레이싱') || g.includes('Sport')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (g.includes('슈팅') || g.includes('FPS')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (g.includes('어드벤처') || g.includes('Adventure')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    if (g.includes('전략') || g.includes('Strategy')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (g.includes('격투') || g.includes('Fighting')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';

    return 'bg-blue-900/30 text-blue-300 border-blue-500/30';
};