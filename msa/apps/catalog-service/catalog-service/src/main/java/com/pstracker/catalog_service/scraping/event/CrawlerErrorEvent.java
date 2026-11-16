package com.pstracker.catalog_service.scraping.event;

public record CrawlerErrorEvent(
        String source,
        String errorMessage
) {
}
