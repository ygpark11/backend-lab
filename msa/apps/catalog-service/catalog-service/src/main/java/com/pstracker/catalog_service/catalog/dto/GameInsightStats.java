package com.pstracker.catalog_service.catalog.dto;

import java.time.LocalDateTime;

public record GameInsightStats(
        long allTimeLowCount,
        long mustPlayCount,
        long totalTrackedCount,
        long totalDiscountedGames,
        long totalDiscountAmount,
        LocalDateTime lastSyncTime,
        long closingSoonCount,
        long ps5ProCount,
        long inCatalogCount,
        long plusExclusiveCount,
        long ptShortCount,
        long ptMediumCount,
        long ptLongCount,
        long ptEpicCount,
        long verdictBuyNow,
        long verdictGoodOffer,
        long verdictWait,
        long verdictTracking
) {
    public static GameInsightStats empty() {
        return new GameInsightStats(
                0L, 0L, 0L, 0L, 0L, null,
                0L, 0L, 0L, 0L,
                0L, 0L, 0L, 0L,
                0L, 0L, 0L, 0L
        );
    }
}
