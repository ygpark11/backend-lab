package com.pstracker.catalog_service.catalog.event;

public record GamePriceChangedEvent(
        Long gameId,
        String gameName,
        String psStoreId,
        int oldPrice,
        int newPrice,
        int discountRate,
        String imageUrl
) {
}
