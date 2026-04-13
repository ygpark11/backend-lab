package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.querydsl.core.annotations.QueryProjection;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class GameSearchResultDto implements Serializable {
    private Long id;
    private String name;
    private String imageUrl;

    // 가격 정보
    private Integer originalPrice;
    private Integer price;
    private Integer discountRate;
    @JsonProperty("isPlusExclusive")
    private boolean isPlusExclusive;
    private LocalDate saleEndDate;

    private String pioneerName;

    @JsonProperty("inCatalog")
    private boolean inCatalog;

    @JsonProperty("isPs5ProEnhanced")
    private boolean isPs5ProEnhanced;

    private LocalDateTime createdAt;
    private List<String> genres;

    // 찜 여부
    private boolean liked;

    private Integer bestSellerRank;
    private Integer mostDownloadedRank;

    private Integer displayScore;
    private String scoreSource;
    private String topVibeTag;

    @QueryProjection
    public GameSearchResultDto(Long id, String name, String imageUrl,
                               Integer originalPrice, Integer price, Integer discountRate,
                               boolean isPlusExclusive, LocalDate saleEndDate, String pioneerName,
                               boolean inCatalog, LocalDateTime createdAt,
                               boolean isPs5ProEnhanced,
                               Integer bestSellerRank, Integer mostDownloadedRank,
                               Integer mcMetaScore, Integer igdbCriticScore, List<String> vibeTags) {
        this.id = id;
        this.name = name;
        this.imageUrl = imageUrl;
        this.originalPrice = originalPrice != null ? originalPrice : 0;
        this.price = price != null ? price : 0;
        this.discountRate = discountRate != null ? discountRate : 0;
        this.isPlusExclusive = isPlusExclusive;
        this.saleEndDate = saleEndDate;
        this.pioneerName = pioneerName;
        this.inCatalog = inCatalog;
        this.createdAt = createdAt;
        this.isPs5ProEnhanced = isPs5ProEnhanced;
        this.bestSellerRank = bestSellerRank;
        this.mostDownloadedRank = mostDownloadedRank;

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
