package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.querydsl.core.annotations.QueryProjection;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class WishlistResponse {
    private Long id;
    private Long gameId;
    private String name;
    private String imageUrl;

    private Integer currentPrice;
    private Integer originalPrice;
    private Integer lowestPrice;
    private int discountRate;
    private boolean isOnSale;

    private LocalDateTime createdAt;
    private LocalDate saleEndDate;
    private List<String> genres;

    private LocalDateTime wishedAt;

    @JsonProperty("isPlusExclusive")
    boolean isPlusExclusive;

    @JsonProperty("inCatalog")
    private boolean inCatalog;

    @JsonProperty("isPs5ProEnhanced")
    private boolean isPs5ProEnhanced;

    private String pioneerName;

    private Integer displayScore;
    private String scoreSource;
    private String topVibeTag;
    private String priceVerdict;

    private Integer mcMetaScore;
    private Double mcUserScore;
    private Integer igdbCriticScore;
    private Double igdbUserScore;

    private Double hltbMainStory;

    @QueryProjection
    public WishlistResponse(Long id, Long gameId, String gameName, String gameImgUrl,
                       Integer originalPrice, Integer currentPrice, Integer discountRate,
                       Integer lowestPrice,
                       boolean isPlusExclusive, LocalDate saleEndDate,
                       Integer mcMetaScore, Double mcUserScore,
                       Integer igdbCriticScore, Double igdbUserScore,
                       Double hltbMainStory,
                       boolean inCatalog, String pioneerName,
                       LocalDateTime createdAt, LocalDateTime wishedAt,
                       boolean isPs5ProEnhanced, List<String> vibeTags) {
        this.id = id;
        this.gameId = gameId;
        this.name = gameName;
        this.imageUrl = gameImgUrl;
        this.wishedAt = wishedAt;
        this.createdAt = createdAt;
        this.currentPrice = currentPrice != null ? currentPrice : 0;
        this.originalPrice = originalPrice != null ? originalPrice : 0;
        this.lowestPrice = lowestPrice != null ? lowestPrice : 0;
        this.discountRate = discountRate != null ? discountRate : 0;
        this.isOnSale = this.discountRate > 0;
        this.saleEndDate = saleEndDate;
        this.isPlusExclusive = isPlusExclusive;
        this.inCatalog = inCatalog;
        this.pioneerName = pioneerName;
        this.isPs5ProEnhanced = isPs5ProEnhanced;

        this.mcMetaScore = mcMetaScore;
        this.mcUserScore = mcUserScore;
        this.igdbCriticScore = igdbCriticScore;
        this.igdbUserScore = igdbUserScore;

        this.hltbMainStory = hltbMainStory;

        if (mcMetaScore != null && mcMetaScore > 0) {
            this.displayScore = mcMetaScore;
            this.scoreSource = "MC";
        } else if (igdbCriticScore != null && igdbCriticScore > 0) {
            this.displayScore = igdbCriticScore;
            this.scoreSource = "IGDB";
        } else {
            this.displayScore = null;
            this.scoreSource = null;
        }

        if (vibeTags != null && !vibeTags.isEmpty()) {
            this.topVibeTag = vibeTags.get(0);
        }
    }
}
