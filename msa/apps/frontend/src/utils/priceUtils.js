/**
 * 💰 가성비 전투력 측정기 (Combat Power)
 * 메타스코어가 높고, 가격이 저렴할수록 전투력이 높게 나옵니다.
 * * 공식: (메타스코어 / 가격) * 보정계수
 */
export const calculateCombatPower = (metaScore, currentPrice) => {
    // 데이터가 없거나 무료 게임인 경우 처리
    if (!metaScore || currentPrice === undefined || currentPrice === null) return 0;

    // 무료 게임(0원)이거나 가격이 너무 쌀 경우 전투력이 무한대로 가는 것 방지
    // 최소 분모를 1000원으로 고정
    const adjustedPrice = Math.max(currentPrice, 1000);

    // 계산: (점수 / 가격) * 10000 (보기 좋은 숫자로 만들기 위해)
    // 예: (85점 / 10000원) * 10000 = 85
    // 예: (90점 / 50000원) * 10000 = 18
    const power = (metaScore / adjustedPrice) * 10000;

    return Math.floor(power);
};

/**
 * 🚦 가격 신호등 판정 (Traffic Light)
 * 판정 결과(verdict)에 따라 텍스트와 색상 정보를 반환합니다.
 */
export const getTrafficLight = (verdict) => {
    switch (verdict) {
        case 'BUY_NOW':
            return {
                color: 'bg-green-500',
                text: '지금이 기회! (최저가 근접)',
                desc: '이 가격이면 고민할 필요가 없습니다.'
            };
        case 'GOOD_OFFER':
            return {
                color: 'bg-yellow-400',
                text: '나쁘지 않아요 (평균 이하)',
                desc: '급하면 사도 되지만, 더 떨어질 수도?'
            };
        case 'WAIT':
            return {
                color: 'bg-red-500',
                text: '잠깐! 비싸요 (평균 이상)',
                desc: '지금 사면 나중에 배가 아플 수 있습니다.'
            };
        case 'TRACKING':
            return {
                color: 'bg-blue-500',
                text: '데이터 수집 중',
                desc: '아직 충분한 가격 데이터가 모이지 않았습니다.'
            };
        default:
            return {
                color: 'bg-gray-500',
                text: '정보 없음',
                desc: '가격 정보를 분석할 수 없습니다.'
            };
    }
};