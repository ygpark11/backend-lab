package com.pstracker.catalog_service.global.client.collector.dto;

import java.util.List;

public record CrawlTriggerRequest(String secretKey, List<String> types) {
    /** 기존 호출부 하위 호환 — types 없이 secretKey만 전달 시 전체 실행 */
    public CrawlTriggerRequest(String secretKey) {
        this(secretKey, null);
    }
}
