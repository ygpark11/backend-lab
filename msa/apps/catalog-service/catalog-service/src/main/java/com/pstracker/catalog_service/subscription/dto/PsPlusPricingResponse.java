package com.pstracker.catalog_service.subscription.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record PsPlusPricingResponse(
        @JsonProperty("promotionActive") boolean isPromotionActive,
        Integer promotionDiscountRate,
        Map<PsPlusTier, TierPriceDto> pricingData,
        Map<PsPlusTier, Map<String, List<PsPlusPriceHistoryDto>>> historyData
) {
    public record TierPriceDto(
            Integer price1Month,
            Integer price3Month,
            Integer price12Month,
            Integer discountPrice1Month,
            Integer discountPrice3Month,
            Integer discountPrice12Month,
            Integer discountRate1Month,
            Integer discountRate3Month,
            Integer discountRate12Month,
            LocalDate saleEndDate1Month,
            LocalDate saleEndDate3Month,
            LocalDate saleEndDate12Month
    ) {
    }

    public record PsPlusPriceHistoryDto(
            LocalDate date,
            Integer price,
            Integer discountRate,
            PriceVerdict verdict
    ) {
    }
}
