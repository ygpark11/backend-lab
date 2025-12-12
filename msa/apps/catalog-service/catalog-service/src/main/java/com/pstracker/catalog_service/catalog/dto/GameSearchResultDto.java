package com.pstracker.catalog_service.catalog.dto;

import com.querydsl.core.annotations.QueryProjection;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GameSearchResultDto {
    private Long id;
    private String name;
    private String imageUrl;

    // 가격 정보
    private Integer originalPrice;
    private Integer price;
    private Integer discountRate;
    private boolean isPlusExclusive;
    private LocalDate saleEndDate;

    // 평점 정보
    private Integer metaScore;
    private Double userScore;

    @QueryProjection
    public GameSearchResultDto(Long id, String name, String imageUrl,
                               Integer originalPrice, Integer price, Integer discountRate,
                               boolean isPlusExclusive, LocalDate saleEndDate,
                               Integer metaScore, Double userScore) {
        this.id = id;
        this.name = name;
        this.imageUrl = imageUrl;
        this.originalPrice = originalPrice;
        this.price = price;
        this.discountRate = discountRate;
        this.isPlusExclusive = isPlusExclusive;
        this.saleEndDate = saleEndDate;
        this.metaScore = metaScore;
        this.userScore = userScore;
    }
}
