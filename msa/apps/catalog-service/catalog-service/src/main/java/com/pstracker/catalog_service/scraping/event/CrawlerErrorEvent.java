package com.pstracker.catalog_service.scraping.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class CrawlerErrorEvent {
    private final String source;
    private final String errorMessage;
}
