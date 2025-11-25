package com.pstracker.catalog_service.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record GameCollectRequest(
        @NotBlank(message = "PS Store ID는 필수입니다.")
        String psStoreId,

        @NotBlank(message = "게임 제목은 필수입니다.")
        String title,

        String publisher,
        String imageUrl,

        @PositiveOrZero
        int currentPrice,

        boolean isDiscount,

        @PositiveOrZero
        int discountRate
) {}
