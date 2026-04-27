package com.pstracker.catalog_service.catalog.scheduler;

import com.pstracker.catalog_service.global.client.collector.CollectorApiClient;
import com.pstracker.catalog_service.global.client.collector.dto.CrawlTriggerRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlerScheduler {

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    private final CollectorApiClient collectorApiClient;

    /**
     * 매일 자정(00시 00분 00초)에 실행
     * cron = "초 분 시 일 월 요일"
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void scheduleCrawling() {
        log.info("Scheduled Task: Triggering Batch Crawler...");
        triggerCrawler();
    }

    @Scheduled(cron = "0 30 13 * * *", zone = "Asia/Seoul")
    public void scheduleRankingCrawling() {
        log.info("Scheduled Task: Triggering Ranking Crawler...");
        try {
            String response = collectorApiClient.triggerRankingCrawl(new CrawlTriggerRequest(internalSecretKey));
            log.info("Ranking Crawler Triggered Successfully! Response: {}", response);
        } catch (Exception e) {
            log.error("Failed to trigger Ranking Crawler: {}", e.getMessage());
        }
    }

    public void triggerCrawler() {
        log.info("Triggering daily batch crawl...");
        try {
            String response = collectorApiClient.triggerBatchCrawl(new CrawlTriggerRequest(internalSecretKey));
            log.info("Crawler Triggered Successfully! Response: {}", response);
        } catch (Exception e) {
            log.error("Failed to trigger batch crawler: {}", e.getMessage());
        }
    }
}
