package com.pstracker.catalog_service.scraping.dto;

public record HltbUpdateRequest(
        Long jobId,
        Long gameId,
        String status,
        Double mainStory,
        Double mainExtra,
        Double completionist
) {}
