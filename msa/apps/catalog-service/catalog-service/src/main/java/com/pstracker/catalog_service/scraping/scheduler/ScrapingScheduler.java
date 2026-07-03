package com.pstracker.catalog_service.scraping.scheduler;

import com.pstracker.catalog_service.global.client.collector.CollectorClientManager;
import com.pstracker.catalog_service.global.client.collector.dto.ScrapingQueueRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.service.ScrapingQueueManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapingScheduler {

    private final ScrapingQueueManager scrapingQueueManager;
    private final CollectorClientManager clientManager;

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    @Scheduled(fixedDelay = 10000)
    public void processQueue() {
        ScrapingRequest request = scrapingQueueManager.markNextRequestAsProcessing();
        if (request == null) return;

        try {
            log.debug("VIP 수집 요청 전송 (psStoreId: {})", request.getPsStoreId());

            clientManager.triggerVipWithFallback(
                    new ScrapingQueueRequest(request.getId(), request.getPsStoreId(), internalSecretKey)
            );
        } catch (Exception e) {
            log.error("수집기 통신 실패 (psStoreId: {})", request.getPsStoreId(), e);
            scrapingQueueManager.markRequestAsFailed(request.getId(), e.getMessage());
        }
    }
}
