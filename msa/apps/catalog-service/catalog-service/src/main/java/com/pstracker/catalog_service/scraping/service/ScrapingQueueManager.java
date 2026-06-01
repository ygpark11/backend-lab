package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ScrapingQueueManager {

    private final ScrapingRequestRepository scrapingRequestRepository;

    @Transactional
    public ScrapingRequest markNextRequestAsProcessing() {
        return scrapingRequestRepository.findFirstByStatusOrderByCreatedAtAsc(ScrapingRequestStatus.PENDING)
                .map(request -> {
                    request.markAsProcessing();
                    return request;
                }).orElse(null);
    }

    @Transactional
    public void markRequestAsFailed(Long requestId, String errorMessage) {
        scrapingRequestRepository.findById(requestId)
                .ifPresent(request -> request.markAsFailed(errorMessage));
    }
}
