package com.pstracker.catalog_service.insights.dto;

import com.pstracker.catalog_service.catalog.dto.GameInsightStats;

public record InsightsSummaryResponse(
        long allTimeLowCount,
        long mustPlayCount,
        long totalTrackedCount,
        long totalDiscountedGames,
        long totalDiscountAmount,
        String lastSyncTime,
        long totalWishlistCount,
        long closingSoonCount,
        long newDiscountCount,
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
    public static InsightsSummaryResponse of(GameInsightStats stats, long totalWishlistCount, long newDiscountCount) {
        String lastSync = stats.lastSyncTime() != null ? stats.lastSyncTime().toString() : "기록 없음";
        return new InsightsSummaryResponse(
                stats.allTimeLowCount(),
                stats.mustPlayCount(),
                stats.totalTrackedCount(),
                stats.totalDiscountedGames(),
                stats.totalDiscountAmount(),
                lastSync,
                totalWishlistCount,
                stats.closingSoonCount(),
                newDiscountCount,
                stats.ps5ProCount(),
                stats.inCatalogCount(),
                stats.plusExclusiveCount(),
                stats.ptShortCount(),
                stats.ptMediumCount(),
                stats.ptLongCount(),
                stats.ptEpicCount(),
                stats.verdictBuyNow(),
                stats.verdictGoodOffer(),
                stats.verdictWait(),
                stats.verdictTracking()
        );
    }
}
