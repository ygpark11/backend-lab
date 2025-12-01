package com.pstracker.catalog_service.catalog.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class CollectRequestDto {
    private String psStoreId;
    private String title;
    private String publisher;
    private String imageUrl;
    private String description;

    // 가격 관련
    private Integer originalPrice;
    private Integer currentPrice;
    private Integer discountRate;
    private LocalDate saleEndDate;

    private String genreIds;       // "Action, RPG" 형태의 문자열
    private boolean isPlusExclusive; // PS Plus 전용 할인 여부
}
