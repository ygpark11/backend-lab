package com.pstracker.catalog_service.catalog.dto;

public record CrawlerCallbackRequest(
        Long requestId,
        String status,
        String errorMessage)
{}
