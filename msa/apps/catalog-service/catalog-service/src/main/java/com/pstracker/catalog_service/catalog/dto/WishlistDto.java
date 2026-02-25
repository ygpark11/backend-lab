package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.querydsl.core.annotations.QueryProjection;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QGame.game;

@Data
public class WishlistDto {
    private Long id;
    private Long gameId;
    private String name;
    private String imageUrl;

    private Integer currentPrice;
    private Integer originalPrice;
    private int discountRate;
    private boolean isOnSale;

    private LocalDateTime createdAt; // 게임 생성일 (NEW 뱃지용)
    private LocalDate saleEndDate;   // 할인 종료일 (마감임박 뱃지용)
    private List<String> genres;     // 장르 이모지용

    private LocalDateTime wishedAt; // 언제 찜했는지

    private Integer metaScore;

    @JsonProperty("isPlusExclusive")
    boolean isPlusExclusive;

    @JsonProperty("inCatalog")
    private boolean inCatalog;

    @QueryProjection
    public WishlistDto(Long id, Long gameId, String gameName, String gameImgUrl,
                       Integer originalPrice, Integer currentPrice, Integer discountRate,
                       boolean isPlusExclusive, LocalDate saleEndDate,
                       Integer metaScore, boolean inCatalog,
                       LocalDateTime createdAt, LocalDateTime wishedAt) {
        this.id = id;
        this.gameId = gameId;
        this.name = gameName;
        this.imageUrl = gameImgUrl;
        this.wishedAt = wishedAt;
        this.createdAt = createdAt;
        this.metaScore = metaScore;
        this.currentPrice = currentPrice != null ? currentPrice : 0;
        this.originalPrice = originalPrice != null ? originalPrice : 0;
        this.discountRate = discountRate != null ? discountRate : 0;
        this.isOnSale = this.discountRate > 0;
        this.saleEndDate = saleEndDate;
        this.isPlusExclusive = isPlusExclusive;
        this.inCatalog = inCatalog;
    }
}
