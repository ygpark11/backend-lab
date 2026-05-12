package com.pstracker.catalog_service.scraping.dto;

public record RatingUpdateDto(
        Long jobId,
        Long gameId,
        String status,
        Integer metaScore,
        Integer metaCount,
        Double userScore,
        Integer userCount
) {}
