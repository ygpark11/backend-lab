package com.pstracker.catalog_service.search;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 매일 오전 05:00 (자정 일배치 크롤링 및 새벽 03:00 AI 배치 종료 이후) 전체 리싱크 안전망 스케줄러.
 * 베스트셀러·메타스코어 변동 및 일시적 증분 누락을 1~2초 일괄 업서트로 보정한다.
 */
@Slf4j
@Component
@Profile("prod")
@RequiredArgsConstructor
public class GameSearchSyncScheduler {

    private final GameSearchIndexService indexService;

    @Scheduled(cron = "0 0 5 * * *", zone = "Asia/Seoul")
    public void scheduledFullReindex() {
        try {
            int count = indexService.reindexAll();
            log.info("[Search Daily Resync] 완료: {}건", count);
        } catch (Exception e) {
            log.warn("[Search Daily Resync] 실패 (다음 주기 또는 관리자 수동 재색인으로 복구 가능): {}", e.getMessage());
        }
    }
}
