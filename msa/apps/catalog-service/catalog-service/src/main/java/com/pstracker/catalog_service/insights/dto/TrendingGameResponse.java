package com.pstracker.catalog_service.insights.dto;

public record TrendingGameResponse(
        int rank,
        Long id,
        String title,
        String imageUrl,
        Integer currentPrice,
        Integer discountRate,
        String priceVerdict
) {}
