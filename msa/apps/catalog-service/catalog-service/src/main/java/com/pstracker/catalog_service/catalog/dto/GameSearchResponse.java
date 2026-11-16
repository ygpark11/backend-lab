package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.querydsl.core.annotations.QueryProjection;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record GameSearchResponse(
        Long id,
        String name,
        String imageUrl,
        Integer originalPrice,
        Integer price,
        Integer discountRate,
        @JsonProperty("isPlusExclusive") boolean isPlusExclusive,
        LocalDate saleEndDate,
        String pioneerName,
        @JsonProperty("inCatalog") boolean inCatalog,
        @JsonProperty("isPs5ProEnhanced") boolean isPs5ProEnhanced,
        LocalDateTime createdAt,
        List<String> genres,
        boolean liked,
        Integer bestSellerRank,
        Integer mostDownloadedRank,
        Integer allTimeLowPrice,
        @JsonProperty("isAllTimeLowNew") boolean isAllTimeLowNew,
        Integer displayScore,
        String scoreSource,
        String topVibeTag,
        String priceVerdict
) implements Serializable {

    @QueryProjection
    public GameSearchResponse(
            Long id, String name, String imageUrl,
            Integer originalPrice, Integer price, Integer discountRate,
            boolean isPlusExclusive, LocalDate saleEndDate, String pioneerName,
            boolean inCatalog, LocalDateTime createdAt,
            boolean isPs5ProEnhanced,
            Integer bestSellerRank, Integer mostDownloadedRank,
            Integer mcMetaScore, Integer igdbCriticScore, List<String> vibeTags,
            Integer allTimeLowPrice, boolean isAllTimeLowNew
    ) {
        this(
                id,
                name,
                imageUrl,
                originalPrice != null ? originalPrice : 0,
                price != null ? price : 0,
                discountRate != null ? discountRate : 0,
                isPlusExclusive,
                saleEndDate,
                pioneerName,
                inCatalog,
                isPs5ProEnhanced,
                createdAt,
                null,
                false,
                bestSellerRank,
                mostDownloadedRank,
                allTimeLowPrice != null ? allTimeLowPrice : 0,
                isAllTimeLowNew,
                resolveDisplayScore(mcMetaScore, igdbCriticScore),
                resolveScoreSource(mcMetaScore, igdbCriticScore),
                (vibeTags != null && !vibeTags.isEmpty()) ? vibeTags.getFirst() : null,
                null
        );
    }

    public GameSearchResponse withEnriched(List<String> genres, boolean liked, String priceVerdict) {
        return new GameSearchResponse(
                id, name, imageUrl,
                originalPrice, price, discountRate,
                isPlusExclusive, saleEndDate, pioneerName,
                inCatalog, isPs5ProEnhanced, createdAt,
                genres, liked,
                bestSellerRank, mostDownloadedRank,
                allTimeLowPrice, isAllTimeLowNew,
                displayScore, scoreSource, topVibeTag, priceVerdict
        );
    }

    static Integer resolveDisplayScore(Integer mcMetaScore, Integer igdbCriticScore) {
        if (mcMetaScore != null && mcMetaScore > 0) return mcMetaScore;
        if (igdbCriticScore != null && igdbCriticScore > 0) return igdbCriticScore;
        return null;
    }

    static String resolveScoreSource(Integer mcMetaScore, Integer igdbCriticScore) {
        if (mcMetaScore != null && mcMetaScore > 0) return "MC";
        if (igdbCriticScore != null && igdbCriticScore > 0) return "IGDB";
        return null;
    }
}
