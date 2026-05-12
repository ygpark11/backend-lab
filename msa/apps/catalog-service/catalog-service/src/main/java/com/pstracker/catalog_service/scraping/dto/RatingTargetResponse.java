package com.pstracker.catalog_service.scraping.dto;

public record RatingTargetResponse(
        Long jobId,
        Long gameId,
        String title
) {}
