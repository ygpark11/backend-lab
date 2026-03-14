package com.pstracker.catalog_service.catalog.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlerScheduler {

    @Value("${crawler.url:http://localhost:5000/run}")
    private String crawlerUrl;

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    /**
     * 매일 자정(00시 00분 00초)에 실행
     * cron = "초 분 시 일 월 요일"
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void scheduleCrawling() {
        log.info("⏰ Scheduled Task: Triggering Batch Crawler...");
        triggerCrawler();
    }

    // 수동 테스트나, 스케줄링 로직에서 공통으로 호출
    public void triggerCrawler() {
        log.info("🚀 Triggering daily batch crawl...");

        RestClient restClient = RestClient.create();
        try {
            String response = restClient.post()
                    .uri(crawlerUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("secretKey", internalSecretKey))
                    .retrieve()
                    .body(String.class);

            log.info("✅ Crawler Triggered Successfully! Response: {}", response);
        } catch (Exception e) {
            log.error("❌ Failed to trigger batch crawler: {}", e.getMessage());
        }
    }
}
