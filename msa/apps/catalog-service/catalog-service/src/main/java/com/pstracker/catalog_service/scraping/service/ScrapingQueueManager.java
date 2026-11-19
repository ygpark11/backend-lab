package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import com.pstracker.catalog_service.catalog.repository.CrawlJobRepository;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapingQueueManager {

    private static final long STUCK_PROCESSING_TIMEOUT_MINUTES = 30L;

    private final ScrapingRequestRepository scrapingRequestRepository;
    private final CrawlJobRepository crawlJobRepository;

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

    /**
     * 크롤러 OOM/재시작 등으로 PROCESSING 상태에 고착된 작업 복구.
     * - CrawlJob(메타크리틱/HLTB): PENDING 으로 되돌려 자동 재시도
     * - ScrapingRequest(유저/관리자 개척 요청): FAILED 로 전환해 영구 재요청 차단 해제
     */
    @Transactional
    public void recoverStuckProcessingJobs() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(STUCK_PROCESSING_TIMEOUT_MINUTES);

        int resetCrawlJobs = crawlJobRepository.resetStuckJobs(
                CrawlJob.JobStatus.PROCESSING, CrawlJob.JobStatus.PENDING, threshold);
        int failedRequests = scrapingRequestRepository.failStuckRequests(
                ScrapingRequestStatus.PROCESSING,
                ScrapingRequestStatus.FAILED,
                "수집 응답 시간 초과 (" + STUCK_PROCESSING_TIMEOUT_MINUTES + "분 경과)",
                threshold
        );

        if (resetCrawlJobs > 0 || failedRequests > 0) {
            log.warn("[StuckJobRecovery] PROCESSING 고착 작업 복구 완료 - CrawlJob(PENDING 복구): {}건, ScrapingRequest(FAILED 전환): {}건",
                    resetCrawlJobs, failedRequests);
        }
    }
}
