package com.pstracker.catalog_service.subscription.dto;

import com.pstracker.catalog_service.subscription.domain.PsPlusMonthlyHistory.BenefitType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PsPlusBenefitCollectRequest(
        @NotEmpty
        List<BenefitGameDto> benefits
) {
    public record BenefitGameDto(
            @NotNull BenefitType benefitType,
            @NotBlank String psStoreId,
            @NotBlank String title,
            String imageUrl,
            String slug
    ) {}
}