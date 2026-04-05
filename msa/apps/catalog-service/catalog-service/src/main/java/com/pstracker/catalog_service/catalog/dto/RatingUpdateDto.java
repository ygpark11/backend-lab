package com.pstracker.catalog_service.catalog.dto;

public record RatingUpdateDto(
        Long jobId,
        Long gameId,
        String status, // SUCCESS, NOT_FOUND, BLOCKED, ERROR 등
        Integer metaScore,
        Integer metaCount,
        Double userScore,
        Integer userCount
) {}
