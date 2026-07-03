package com.pstracker.catalog_service.catalog.scheduler;

import com.pstracker.catalog_service.global.client.collector.CollectorApiClient;
import com.pstracker.catalog_service.global.client.collector.CollectorClientManager;
import com.pstracker.catalog_service.global.client.collector.dto.CrawlTriggerRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlerScheduler {

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    private final CollectorClientManager clientManager;

    /** 랭킹 타입 목록 — 인덱스 순서대로 수집기 인스턴스에 round-robin 배분 */
    private static final String[] RANKING_TYPES = {"BEST_SELLER", "MOST_DOWNLOADED"};

    /** 보조 수집기 기동 지연 간격 (5분) — Phase 0 완료 후 Phase 1-B 시작 보장 */
    private static final long SHARD_DELAY_MS = 5 * 60 * 1000L;

    /**
     * 매일 자정(00:00)에 배치 수집 트리거.
     * 모든 수집기 인스턴스를 기동하되, 주 수집기(#0)는 즉시,
     * 보조 수집기(#1~)는 SHARD_DELAY_MS 간격으로 순차 기동.
     * 각 수집기는 자체 SHARD_ID 환경변수로 담당 범위를 결정함.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void scheduleCrawling() {
        log.info("Scheduled Task: Triggering Batch Crawlers ({} instances)...", clientManager.getAll().size());
        List<CollectorApiClient> clients = clientManager.getAll();

        for (int i = 0; i < clients.size(); i++) {
            final int shardIdx = i;
            final CollectorApiClient client = clients.get(i);
            final long delayMs = shardIdx * SHARD_DELAY_MS;

            Thread.ofVirtual().start(() -> {
                try {
                    if (delayMs > 0) {
                        log.info("배치 수집기 #{}: {}분 후 기동 예정", shardIdx, delayMs / 60_000);
                        Thread.sleep(delayMs);
                    }
                    String response = client.triggerBatchCrawl(new CrawlTriggerRequest(internalSecretKey));
                    log.info("배치 수집기 #{} 기동 완료. Response: {}", shardIdx, response);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("배치 수집기 #{} 기동 인터럽트됨", shardIdx);
                } catch (Exception e) {
                    log.error("배치 수집기 #{} 기동 실패: {}", shardIdx, e.getMessage());
                }
            });
        }
    }

    /**
     * 매일 15:30에 랭킹 수집 트리거.
     * RANKING_TYPES를 수집기 인스턴스 수로 나눠 round-robin 배분.
     * 인스턴스가 1개면 전체 타입을 혼자 처리, 2개면 각 1개씩 담당.
     */
    @Scheduled(cron = "0 30 15 * * *", zone = "Asia/Seoul")
    public void scheduleRankingCrawling() {
        log.info("Scheduled Task: Triggering Ranking Crawlers...");
        List<CollectorApiClient> clients = clientManager.getAll();

        for (int i = 0; i < RANKING_TYPES.length; i++) {
            final String rankingType = RANKING_TYPES[i];
            final CollectorApiClient client = clients.get(i % clients.size());
            try {
                String response = client.triggerRankingCrawl(
                        new CrawlTriggerRequest(internalSecretKey, List.of(rankingType)));
                log.info("랭킹 수집 [{}] 기동 완료. Response: {}", rankingType, response);
            } catch (Exception e) {
                log.error("랭킹 수집 [{}] 기동 실패: {}", rankingType, e.getMessage());
            }
        }
    }

    /** 수동 배치 트리거 (AdminController → CatalogController에서 호출) */
    public void triggerCrawler() {
        log.info("Triggering manual batch crawl ({} instances)...", clientManager.getAll().size());
        List<CollectorApiClient> clients = clientManager.getAll();
        for (int i = 0; i < clients.size(); i++) {
            final int shardIdx = i;
            final CollectorApiClient client = clients.get(i);
            final long delayMs = shardIdx * SHARD_DELAY_MS;
            Thread.ofVirtual().start(() -> {
                try {
                    if (delayMs > 0) Thread.sleep(delayMs);
                    String response = client.triggerBatchCrawl(new CrawlTriggerRequest(internalSecretKey));
                    log.info("수동 배치 수집기 #{} 기동 완료. Response: {}", shardIdx, response);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.error("수동 배치 수집기 #{} 기동 실패: {}", shardIdx, e.getMessage());
                }
            });
        }
    }
}
