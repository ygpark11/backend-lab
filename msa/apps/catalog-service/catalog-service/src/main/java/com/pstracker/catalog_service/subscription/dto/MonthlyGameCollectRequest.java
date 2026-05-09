package com.pstracker.catalog_service.subscription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record MonthlyGameCollectRequest(
        @NotEmpty
        List<MonthlyGameDto> monthlyGames
) {
    public record MonthlyGameDto(
            @NotBlank String psStoreId,
            @NotBlank String title,
            String imageUrl,
            String slug
    ) {}
}