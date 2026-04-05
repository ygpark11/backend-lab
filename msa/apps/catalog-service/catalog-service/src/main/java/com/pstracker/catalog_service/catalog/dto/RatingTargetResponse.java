package com.pstracker.catalog_service.catalog.dto;

public record RatingTargetResponse(
        Long jobId,
        Long gameId,
        String title
) {}
