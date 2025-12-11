package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pstracker.catalog_service.catalog.domain.Platform;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Set;

@Getter
@NoArgsConstructor
public class CollectRequestDto {
    private String psStoreId;
    private String title;
    private String englishTitle;
    private String publisher;
    private String imageUrl;
    private String description;

    // 가격 관련
    private Integer originalPrice;
    private Integer currentPrice;
    private Integer discountRate;
    private LocalDate saleEndDate;

    private String genreIds;       // "Action, RPG" 형태의 문자열
    @JsonProperty("isPlusExclusive")
    private boolean isPlusExclusive; // PS Plus 전용 할인 여부

    // [New] 플랫폼 목록 (Python에서 ["PS4", "PS5"] 형태로 보냄)
    private Set<Platform> platforms;
}
