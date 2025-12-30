export const getGenreBadgeStyle = (g) => {
    if (!g) return 'bg-gray-700/50 text-gray-400 border-gray-600';

    // 장르별 테마 컬러 매핑 (보내주신 목록 기준 확장)
    const styles = {
        '액션': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        '어드벤처': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        '롤플레잉 게임': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        '슈팅': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        '공포': 'bg-red-900/40 text-red-400 border-red-500/30',
        '격투': 'bg-red-500/10 text-red-500 border-red-500/30',
        '스포츠': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        '드라이빙/레이싱': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        '전략': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        '시뮬레이션': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        '시뮬레이터': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        '가족': 'bg-green-500/10 text-green-400 border-green-500/30',
        '아케이드': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
        '음악/리듬': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        '퍼즐': 'bg-lime-500/10 text-lime-400 border-lime-500/30',
        '피트니스': 'bg-orange-300/10 text-orange-300 border-orange-300/30',
        '유니크': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
        '캐주얼': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        '파티': 'bg-violet-500/10 text-violet-400 border-violet-500/30'
    };

    // 목록에 없으면(undefined) '기타' 스타일(회색 계열) 반환
    return styles[g] || 'bg-gray-600/20 text-gray-400 border-gray-500/30';
};