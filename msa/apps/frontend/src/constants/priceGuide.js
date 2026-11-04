import { Circle, Square, Triangle, X } from 'lucide-react';

// 가격 신호등·할인 방어력 판단 기준의 단일 출처.
// 백엔드 계산과 반드시 일치해야 함:
//   신호등   → catalog-service PriceVerdictCalculator.forGame
//   방어력   → catalog-service GameScouterService.calculateDefenseTier
// 기준이 바뀌면 이 파일과 백엔드를 함께 수정할 것.

export const VERDICT_THRESHOLD_PERCENT = 20;

export const VERDICT_GUIDE = [
    {
        key: 'BUY_NOW',
        Icon: Circle,
        label: 'BUY NOW',
        name: '지금 사도 좋아요',
        short: '역대 최저가 이하',
        rule: '현재가가 역대 최저가와 같거나 더 낮아요.',
        color: 'text-green-600 dark:text-green-500',
        iconClass: 'fill-current',
    },
    {
        key: 'GOOD_OFFER',
        Icon: Triangle,
        label: 'GOOD OFFER',
        name: '나쁘지 않아요',
        short: `최저가 대비 ${VERDICT_THRESHOLD_PERCENT}% 이내`,
        rule: `정가보다 싸고, 역대 최저가보다 ${VERDICT_THRESHOLD_PERCENT}% 이내로 비싸요.`,
        color: 'text-yellow-600 dark:text-yellow-500',
        iconClass: 'fill-current',
    },
    {
        key: 'WAIT',
        Icon: X,
        label: 'WAIT',
        name: '기다려보세요',
        short: `최저가 대비 ${VERDICT_THRESHOLD_PERCENT}% 초과 또는 정가`,
        rule: `할인 중이어도 역대 최저가보다 ${VERDICT_THRESHOLD_PERCENT}% 넘게 비싸거나, 정가로 판매 중이에요.`,
        color: 'text-red-600 dark:text-red-500',
        iconClass: 'stroke-[3px]',
    },
    {
        key: 'TRACKING',
        Icon: Square,
        label: 'TRACKING',
        name: '데이터 수집 중',
        short: '판단할 가격 이력 부족',
        rule: '가격 정보나 이력이 없거나, 첫 기록이 할인가라 역대 최저가인지 아직 판단할 수 없어요.',
        color: 'text-blue-700 dark:text-ps-blue',
        iconClass: 'fill-current',
    },
];

// key: DefenseTrophyCard의 티어 스타일 키 (등급명 첫 글자, 신작 계열은 N, 관측 중은 '관측')
export const DEFENSE_GUIDE = [
    { key: 'S', name: 'S급 철벽', desc: '철벽 방어 · 추적 기간 내 할인 없음', rule: '출시 6개월이 지났고 3개월 이상 추적했는데 한 번도 할인하지 않았어요.' },
    { key: 'A', name: 'A급 방패', desc: '강력 방어 · 최대 할인 25% 이하', rule: '지금까지 가장 깊었던 할인이 25% 이하예요.' },
    { key: 'B', name: 'B급 일반', desc: '평균 방어 · 최대 할인 40% 이하', rule: '가장 깊었던 할인이 25% 초과 40% 이하예요.' },
    { key: 'C', name: 'C급 솜방패', desc: '방어 취약 · 최대 할인 60% 미만', rule: '가장 깊었던 할인이 40% 초과 60% 미만이에요.' },
    { key: 'D', name: 'D급 낙하산', desc: '방어 붕괴 · 최대 할인 60% 이상', rule: '60% 이상 할인된 적이 있어요. 정가 구매는 신중하게 판단하세요.' },
    { key: 'N', name: '신작', desc: '출시 6개월 미만 · 패턴 관측 중', rule: '출시 6개월이 안 된 게임은 할인 패턴이 아직 없어 등급 대신 신작 상태로 표시해요.' },
    { key: '관측', name: '관측 중', desc: '추적 3개월 미만 · 데이터 수집 중', rule: '추적을 시작한 지 3개월이 안 됐고 할인 기록이 거의 없어 등급을 매기기 일러요.' },
];

export const DEFENSE_DESC_BY_KEY = Object.fromEntries(DEFENSE_GUIDE.map(t => [t.key, t.desc]));
