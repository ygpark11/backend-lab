package com.pstracker.catalog_service.catalog.dto.igdb;

import com.fasterxml.jackson.annotation.JsonProperty;

public record IgdbGameResponse(
        Long id,
        String name,

        // 전문가 평점 (Metacritic 점수와 유사)
        @JsonProperty("aggregated_rating")
        Double criticScore,

        // 전문가 평가 수
        @JsonProperty("aggregated_rating_count")
        Integer criticCount,

        // 유저 평점 (IGDB 유저)
        @JsonProperty("rating")
        Double userScore,

        // 유저 평가 수
        @JsonProperty("rating_count")
        Integer userCount,

        // 요약
        String summary,

        @JsonProperty("total_rating_count")
        Integer totalRatingCount
) {}
