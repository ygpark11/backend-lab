package com.pstracker.catalog_service.catalog.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlerScheduler {

    @Value("${crawler.url:http://localhost:5000/run}")
    private String crawlerUrl;

    /**
     * 매일 오전 1시 30분 0초에 실행
     * cron = "초 분 시 일 월 요일"
     */
    @Scheduled(cron = "0 30 1 * * *")
    public void scheduleCrawling() {
        log.info("⏰ Scheduled Task: Triggering Batch Crawler...");
        triggerCrawler();
    }

    // 수동 테스트나, 스케줄링 로직에서 공통으로 호출
    public void triggerCrawler() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            // POST 요청 전송 (Body는 비워도 됨)
            restTemplate.postForEntity(crawlerUrl, null, String.class);
            log.info("🚀 Crawler Triggered Successfully!");
        } catch (Exception e) {
            log.error("❌ Failed to trigger crawler: {}", e.getMessage());
        }
    }
}
