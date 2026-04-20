package com.pstracker.catalog_service.global.client.collector.dto;

public record ScrapingQueueRequest(Long requestId, String psStoreId, String secretKey) {}
