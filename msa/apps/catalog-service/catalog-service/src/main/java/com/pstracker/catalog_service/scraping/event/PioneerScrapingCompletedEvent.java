package com.pstracker.catalog_service.scraping.event;

public record PioneerScrapingCompletedEvent(
        String psStoreId,
        Long memberId,
        String memberNickname
) {
}
