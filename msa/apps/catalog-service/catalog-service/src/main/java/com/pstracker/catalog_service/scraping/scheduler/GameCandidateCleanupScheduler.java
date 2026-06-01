package com.pstracker.catalog_service.scraping.scheduler;

import com.pstracker.catalog_service.scraping.repository.GameCandidateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class GameCandidateCleanupScheduler {

    private static final int EXPIRY_DAYS = 14;

    private final GameCandidateRepository gameCandidateRepository;

    // 매일 새벽 4시 실행
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void cleanup() {
        // 1. Game 테이블에 이미 등록된 후보 제거 (서브쿼리로 단일 DELETE)
        int removedCompleted = gameCandidateRepository.deleteAlreadyCollected();

        // 2. 14일 이상 선택받지 못한 후보 제거
        int removedExpired = gameCandidateRepository.deleteByCreatedAtBefore(
                LocalDateTime.now().minusDays(EXPIRY_DAYS));

        log.info("[CandidateCleanup] 완료 - 수집완료 중복: {}건, {}일 경과 만료: {}건",
                removedCompleted, EXPIRY_DAYS, removedExpired);
    }
}
