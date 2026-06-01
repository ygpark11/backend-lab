package com.pstracker.catalog_service.scraping.scheduler;

import com.pstracker.catalog_service.global.client.collector.CollectorApiClient;
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
    private final CollectorApiClient collectorApiClient;

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    @Scheduled(fixedDelay = 10000)
    public void processQueue() {
        // DB 트랜잭션 최소화를 위해 상태 변경 로직만 별도 빈에서 처리
        ScrapingRequest request = scrapingQueueManager.markNextRequestAsProcessing();
        if (request == null) return;

        try {
            log.debug("Hand(Python) 서버로 크롤링 지시 전송: {}", request.getPsStoreId());

            // 파이썬은 요청을 받으면 즉시 202 Accepted를 반환하고 백그라운드 작업 시작
            String response = collectorApiClient.triggerScrapingQueue(
                    new ScrapingQueueRequest(request.getId(), request.getPsStoreId(), internalSecretKey)
            );

            log.debug("Crawler Trigger Response: {}", response);
        } catch (Exception e) {
            log.error("Hand 서버 통신 실패 (psStoreId: {})", request.getPsStoreId(), e);
            scrapingQueueManager.markRequestAsFailed(request.getId(), e.getMessage());
        }
    }
}
