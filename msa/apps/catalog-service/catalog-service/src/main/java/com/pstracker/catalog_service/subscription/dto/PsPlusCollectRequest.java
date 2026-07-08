package com.pstracker.catalog_service.subscription.dto;

import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Getter
@NoArgsConstructor
public class PsPlusCollectRequest {
    private Map<PsPlusTier, TierPriceReq> data;

    @Getter
    @NoArgsConstructor
    public static class TierPriceReq {
        @NotNull private Integer price1Month;
        @NotNull private Integer price3Month;
        @NotNull private Integer price12Month;

        // 정가 (소니 공식 MSRP) — 크롤러 업데이트 전까지 null 허용, null 시 price* 로 fallback
        private Integer originalPrice1Month;
        private Integer originalPrice3Month;
        private Integer originalPrice12Month;

        // 할인 종료일 (프로모션 미진행 시 null)
        private LocalDate saleEndDate1Month;
        private LocalDate saleEndDate3Month;
        private LocalDate saleEndDate12Month;

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
