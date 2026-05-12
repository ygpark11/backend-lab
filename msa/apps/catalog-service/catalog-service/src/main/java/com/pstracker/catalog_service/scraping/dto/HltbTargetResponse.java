package com.pstracker.catalog_service.scraping.dto;

public record HltbTargetResponse(
        Long jobId,
        Long gameId,
        String searchTitle
) {}
