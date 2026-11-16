package com.pstracker.catalog_service.subscription.dto;

import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.Map;

public record PsPlusCollectRequest(Map<PsPlusTier, TierPriceReq> data) {

    @Builder
    public record TierPriceReq(
            @NotNull Integer price1Month,
            @NotNull Integer price3Month,
            @NotNull Integer price12Month,
            Integer originalPrice1Month,
            Integer originalPrice3Month,
            Integer originalPrice12Month,
            LocalDate saleEndDate1Month,
            LocalDate saleEndDate3Month,
            LocalDate saleEndDate12Month
    ) {
        public Integer resolvedOriginalPrice1Month() {
            return originalPrice1Month != null ? originalPrice1Month : price1Month;
        }

        public Integer resolvedOriginalPrice3Month() {
            return originalPrice3Month != null ? originalPrice3Month : price3Month;
        }

        public Integer resolvedOriginalPrice12Month() {
            return originalPrice12Month != null ? originalPrice12Month : price12Month;
        }
    }
}
