package com.pstracker.catalog_service.scraping.dto;

import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;

import java.time.LocalDateTime;

public record AdminScrapingResponse(
        Long id,
        String psStoreId,
        String targetUrl,
        String memberNickname,
        ScrapingRequestStatus status,
        String errorMessage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminScrapingResponse from(ScrapingRequest req) {
        return new AdminScrapingResponse(
                req.getId(),
                req.getPsStoreId(),
                req.getTargetUrl(),
                req.getMember().getNickname(),
                req.getStatus(),
                req.getErrorMessage(),
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }
}
