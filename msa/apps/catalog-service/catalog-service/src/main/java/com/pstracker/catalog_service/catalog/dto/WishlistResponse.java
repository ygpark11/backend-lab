package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.querydsl.core.annotations.QueryProjection;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record WishlistResponse(
        Long id,
        Long gameId,
        String name,
        String imageUrl,
        Integer currentPrice,
        Integer originalPrice,
        Integer lowestPrice,
        int discountRate,
        @JsonProperty("onSale") boolean isOnSale,
        LocalDateTime createdAt,
        LocalDate saleEndDate,
        List<String> genres,
        LocalDateTime wishedAt,
        @JsonProperty("isPlusExclusive") boolean isPlusExclusive,
        @JsonProperty("inCatalog") boolean inCatalog,
        @JsonProperty("isPs5ProEnhanced") boolean isPs5ProEnhanced,
        @JsonProperty("isAllTimeLowNew") boolean isAllTimeLowNew,
        String pioneerName,
        Integer displayScore,
        String scoreSource,
        String topVibeTag,
        String priceVerdict,
        Integer mcMetaScore,
        Double mcUserScore,
        Integer igdbCriticScore,
        Double igdbUserScore,
        Double hltbMainStory
) {
    @QueryProjection
    public WishlistResponse(
            Long id, Long gameId, String gameName, String gameImgUrl,
            Integer originalPrice, Integer currentPrice, Integer discountRate,
            Integer lowestPrice,
            boolean isPlusExclusive, LocalDate saleEndDate,
            Integer mcMetaScore, Double mcUserScore,
            Integer igdbCriticScore, Double igdbUserScore,
            Double hltbMainStory,
            boolean inCatalog, String pioneerName,
            LocalDateTime createdAt, LocalDateTime wishedAt,
            boolean isPs5ProEnhanced, List<String> vibeTags,
            boolean isAllTimeLowNew
    ) {
        this(
                id,
                gameId,
                gameName,
                gameImgUrl,
                currentPrice != null ? currentPrice : 0,
                originalPrice != null ? originalPrice : 0,
                lowestPrice != null ? lowestPrice : 0,
                discountRate != null ? discountRate : 0,
                (discountRate != null && discountRate > 0),
                createdAt,
                saleEndDate,
                null,
                wishedAt,
                isPlusExclusive,
                inCatalog,
                isPs5ProEnhanced,
                isAllTimeLowNew,
                pioneerName,
                GameSearchResponse.resolveDisplayScore(mcMetaScore, igdbCriticScore),
                GameSearchResponse.resolveScoreSource(mcMetaScore, igdbCriticScore),
                (vibeTags != null && !vibeTags.isEmpty()) ? vibeTags.getFirst() : null,
                null,
                mcMetaScore,
                mcUserScore,
                igdbCriticScore,
                igdbUserScore,
                hltbMainStory
        );
    }

    public WishlistResponse withEnriched(List<String> genres, String priceVerdict) {
        return new WishlistResponse(
                id, gameId, name, imageUrl,
                currentPrice, originalPrice, lowestPrice,
                discountRate, isOnSale,
                createdAt, saleEndDate, genres, wishedAt,
                isPlusExclusive, inCatalog, isPs5ProEnhanced, isAllTimeLowNew,
                pioneerName, displayScore, scoreSource, topVibeTag, priceVerdict,
                mcMetaScore, mcUserScore, igdbCriticScore, igdbUserScore, hltbMainStory
        );
    }
}
