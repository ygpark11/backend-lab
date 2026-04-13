export const getGenreBadgeStyle = (g) => {
    if (!g) return 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600';

    // 장르별 테마 컬러 매핑
    const styles = {
        '액션': 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30',
        '어드벤처': 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
        '롤플레잉 게임': 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
        '슈팅': 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30',
        '공포': 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
        '격투': 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-500 border-red-300 dark:border-red-500/30',
        '스포츠': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30',
        '드라이빙/레이싱': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30',
        '전략': 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
        '시뮬레이션': 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30',
        '시뮬레이터': 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30',
        '가족': 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
        '아케이드': 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-500/30',
        '음악/리듬': 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30',
        '퍼즐': 'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-300 dark:border-lime-500/30',
        '피트니스': 'bg-orange-50 dark:bg-orange-300/10 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-300/30',
        '유니크': 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-500/30',
        '캐주얼': 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30',
        '파티': 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-300 dark:border-violet-500/30'
    };

    return styles[g] || 'bg-gray-100 dark:bg-gray-600/20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/30';
};