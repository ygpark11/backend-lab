/**
 * 💰 가성비 전투력 측정기 (Combat Power)
 * IGDB스코어가 높고, 가격이 저렴할수록 전투력이 높게 나옵니다.
 * * 공식: (IGDB스코어 / 가격) * 보정계수
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
ㅛ * verdict 타입과 game 데이터를 함께 받아 케이스별 세분화된 메시지를 반환합니다.
 *
 * @param {string} verdict - PriceVerdict enum 값 (BUY_NOW | GOOD_OFFER | WAIT | TRACKING)
 * @param {object} game    - GameDetailResponse 데이터 (currentPrice, originalPrice, lowestPrice, priceHistory)
 */
export const getTrafficLight = (verdict, game = {}) => {
    const {
        currentPrice = 0,
        originalPrice = 0,
        lowestPrice = 0,
        priceHistory = []
    } = game;
    const historyCount = priceHistory.length;

    switch (verdict) {
        case 'BUY_NOW':
            return {
                color: 'bg-green-500',
                text: '지금이 기회! (역대 최저가)',
                desc: '이 가격이면 고민할 필요가 없습니다.'
            };

        case 'GOOD_OFFER': {
            const safeLowest = lowestPrice > 0 ? lowestPrice : currentPrice;
            const diffPercent = Math.round((currentPrice - safeLowest) / safeLowest * 100);
            return {
                color: 'bg-yellow-400',
                text: '나쁘지 않아요 (평균 이하)',
                desc: `역대 최저가보다 ${diffPercent}% 높지만 괜찮은 가격이에요!`
            };
        }

        case 'WAIT': {
            if (historyCount === 1) {
                return {
                    color: 'bg-red-500',
                    text: '아직은 정가예요',
                    desc: '할인이 시작될 때까지 기다려보세요!'
                };
            }
            // 할인 중이지만 역대 최저가 대비 20% 초과 → 아쉬운 할인
            if (currentPrice < originalPrice) {
                const safeLowest = lowestPrice > 0 ? lowestPrice : currentPrice;
                return {
                    color: 'bg-red-500',
                    text: '잠깐! 비싸요 (평균 이상)',
                    desc: `아쉬운 할인율! 최저가(${safeLowest.toLocaleString()}원) 대비 비싸요.`
                };
            }
            // 정가이고 이력 2건 이상 → 할인 이력은 있지만 지금은 정가
            return {
                color: 'bg-red-500',
                text: '잠깐! 비싸요 (평균 이상)',
                desc: '지금 사면 나중에 배가 아플 수 있습니다.'
            };
        }

        case 'TRACKING': {
            // 이력 1건 + 할인가 = 첫 할인 수집, 최저가 판단 불가
            if (historyCount === 1 && currentPrice < originalPrice) {
                return {
                    color: 'bg-blue-500',
                    text: '데이터 수집 중',
                    desc: '첫 수집된 할인 정보예요! 역대 최저가인지 확인하기 위해 데이터가 더 필요해요.'
                };
            }
            return {
                color: 'bg-blue-500',
                text: '데이터 수집 중',
                desc: '아직 충분한 가격 데이터가 모이지 않았습니다.'
            };
        }

        default:
            return {
                color: 'bg-gray-500',
                text: '정보 없음',
                desc: '가격 정보를 분석할 수 없습니다.'
            };
    }
};