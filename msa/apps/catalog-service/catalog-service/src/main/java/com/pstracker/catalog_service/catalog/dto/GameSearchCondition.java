package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.Platform;
import lombok.Data;

@Data
public class GameSearchCondition {
    // 검색어 (게임명 - 한글/영문)
    private String keyword;

    // 가격 범위 (예: 1000원 ~ 30000원)
    private Integer minPrice;
    private Integer maxPrice;

    // 할인율 (예: 50% 이상)
    private Integer minDiscountRate;

    // 평점 (메타스코어 OR 유저스코어)
    private Integer minMetaScore;
    private Double minUserScore;

    // 특정 플랫폼 (PS5, PS4...)
    private Platform platform;

    // PS Plus 전용 할인 여부
    private Boolean isPlusExclusive;

    // 장르 필터 추가
    private String genre;
}
