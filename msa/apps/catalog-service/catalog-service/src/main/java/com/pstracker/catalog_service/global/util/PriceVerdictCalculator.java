package com.pstracker.catalog_service.global.util;

import com.pstracker.catalog_service.global.domain.PriceVerdict;

/**
 * 가격 적정성 판정 공통 유틸리티.
 *
 * 게임과 구독권 두 도메인이 동일한 판정 기준을 공유하며,
 * BUY_NOW 조건에서만 도메인 특성에 따른 차이가 있습니다.
 *
 * [BUY_NOW 조건의 도메인별 차이]
 * - 게임:  originalPrice = 고정 MSRP → 정가 = 역대최저가인 경우에도 BUY_NOW 허용
 * - 구독권: originalPrice = 현재 수집 가격 → 프로모션이 없으면 모든 이력이
 *           safeLowest와 같아져 전 구간이 BUY_NOW로 오판될 수 있으므로,
 *           price < originalPrice 조건을 추가로 요구합니다.
 */
public class PriceVerdictCalculator {

    private PriceVerdictCalculator() {}

    /**
     * 게임 가격 적정성 판정.
     *
     * @param price        판정할 가격 (현재가 또는 이력 가격)
     * @param originalPrice 정가 (고정 MSRP)
     * @param lowestPrice  역대 최저가 (없거나 0이면 price로 대체)
     * @param historySize  전체 이력 수
     */
    public static PriceVerdict forGame(
            Integer price, Integer originalPrice, Integer lowestPrice, int historySize) {
        return calculate(price, originalPrice, lowestPrice, historySize, false);
    }

    /**
     * 구독권 가격 적정성 판정.
     *
     * @param price        판정할 이력 가격
     * @param originalPrice 현재 수집된 구독 가격 (기준 가격)
     * @param lowestPrice  역대 최저 구독 가격 (없거나 0이면 price로 대체)
     * @param historySize  전체 이력 수
     */
    public static PriceVerdict forSubscription(
            Integer price, Integer originalPrice, Integer lowestPrice, int historySize) {
        return calculate(price, originalPrice, lowestPrice, historySize, true);
    }

    /**
     * @param requireBelowOriginalForBuyNow true이면 BUY_NOW 조건에 price < originalPrice를 추가 요구
     */
    private static PriceVerdict calculate(
            Integer price, Integer originalPrice, Integer lowestPrice,
            int historySize, boolean requireBelowOriginalForBuyNow) {

        // 가격이 0이거나 이력이 없으면 수집 중 상태
        if (price == null || price == 0 || historySize == 0) return PriceVerdict.TRACKING;

        // 이력 1건: 비교 기준 부족 → 할인 중이면 데이터를 더 모아야 하고(TRACKING), 정가면 기다리기(WAIT)
        if (historySize == 1) {
            return (price < originalPrice) ? PriceVerdict.TRACKING : PriceVerdict.WAIT;
        }

        // lowestPrice가 없거나 0이면 현재 가격을 기준으로 삼음
        int safeLowest = (lowestPrice == null || lowestPrice == 0) ? price : lowestPrice;

        // 역대 최저가 이하 여부 (구독은 추가로 정가 미만 조건 요구)
        boolean isBuyNow = price <= safeLowest
                && (!requireBelowOriginalForBuyNow || price < originalPrice);
        if (isBuyNow) return PriceVerdict.BUY_NOW;

        // 정가 미만: 역대 최저가 대비 20% 이내면 GOOD_OFFER, 초과면 WAIT
        if (price < originalPrice) {
            double diffPercent = (double) (price - safeLowest) / safeLowest * 100;
            return (diffPercent <= 20.0) ? PriceVerdict.GOOD_OFFER : PriceVerdict.WAIT;
        }

        return PriceVerdict.WAIT;
    }
}
