package com.pstracker.catalog_service.subscription.dto;

import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class PsPlusPricingResponse {

    private boolean isPromotionActive;
    private Integer promotionDiscountRate;

    private Map<PsPlusTier, TierPriceDto> pricingData;

    private Map<PsPlusTier, Map<String, List<PsPlusPriceHistoryDto>>> historyData;

    @Getter
    @AllArgsConstructor
    public static class TierPriceDto {
        private Integer price1Month;
        private Integer price3Month;
        private Integer price12Month;

        private Integer discountPrice1Month;
        private Integer discountPrice3Month;
        private Integer discountPrice12Month;

        // 프로모션 중이면 할인율, 아니면 0
        private Integer discountRate1Month;
        private Integer discountRate3Month;
        private Integer discountRate12Month;

        // 할인 종료일 (프로모션 미진행 시 null)
        private LocalDate saleEndDate1Month;
        private LocalDate saleEndDate3Month;
        private LocalDate saleEndDate12Month;
    }

    @Getter
    @AllArgsConstructor
    public static class PsPlusPriceHistoryDto {
        private LocalDate date;
        private Integer price;
        private Integer discountRate;
        private PriceVerdict verdict;
    }
}
