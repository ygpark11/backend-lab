package com.pstracker.catalog_service.scraping.scheduler;

import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapingScheduler {

    private final ScrapingRequestRepository scrapingRequestRepository;

    @Value("${crawler.queue-url}")
    private String crawlerServerUrl;

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    @Scheduled(fixedDelay = 10000)
    public void processQueue() {
        // DB 트랜잭션 최소화를 위해 상태 변경 로직만 따로 뺌
        ScrapingRequest request = markNextRequestAsProcessing();
        if (request == null) return;

        try {
            log.debug("Hand(Python) 서버로 크롤링 지시 전송: {}", request.getPsStoreId());

            RestClient restClient = RestClient.create();

            // 파이썬은 요청을 받으면 즉시 202 Accepted를 반환하고 백그라운드 작업 시작
            String response = restClient.post()
                    .uri(crawlerServerUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "requestId", request.getId(),
                            "psStoreId", request.getPsStoreId(),
                            "secretKey", internalSecretKey
                    ))
                    .retrieve()
                    .body(String.class);

            log.debug("✅ Crawler Trigger Response: {}", response);
        } catch (Exception e) {
            log.error("Hand 서버 통신 실패 (psStoreId: {})", request.getPsStoreId(), e);
            // 통신 실패 시 상태를 FAILED로 롤백하는 별도 처리 필요
        }
    }

    @Transactional
    public ScrapingRequest markNextRequestAsProcessing() {
        return scrapingRequestRepository.findFirstByStatusOrderByCreatedAtAsc(ScrapingRequestStatus.PENDING)
                .map(request -> {
                    request.markAsProcessing();
                    return request;
                }).orElse(null);
    }
}
