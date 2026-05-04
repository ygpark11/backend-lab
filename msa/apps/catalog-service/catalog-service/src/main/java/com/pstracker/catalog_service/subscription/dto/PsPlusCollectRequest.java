package com.pstracker.catalog_service.subscription.dto;

import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
    }
}
