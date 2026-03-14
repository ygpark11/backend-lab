package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.catalog.dto.CrawlerCallbackRequest;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.scraping.domain.GameCandidate;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.dto.CandidateSyncRequest;
import com.pstracker.catalog_service.scraping.event.CrawlerErrorEvent;
import com.pstracker.catalog_service.scraping.event.PioneerScrapingCompletedEvent;
import com.pstracker.catalog_service.scraping.repository.GameCandidateRepository;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapingWebhookService {

    private final ScrapingRequestRepository scrapingRequestRepository;
    private final GameCandidateRepository gameCandidateRepository;
    private final GameRepository gameRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void processCallback(CrawlerCallbackRequest payload) {
        ScrapingRequest request = scrapingRequestRepository.findById(payload.requestId())
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 요청 ID: " + payload.requestId()));

        if ("SUCCESS".equals(payload.status())) {
            request.markAsCompleted();
            log.debug("수집 완료 보고 접수! 개척자 {}님에게 푸시 알림 발송 준비...", request.getMember().getNickname());
            eventPublisher.publishEvent(new PioneerScrapingCompletedEvent(request.getPsStoreId(), request.getMember()));
        } else {
            request.markAsFailed(payload.errorMessage());
            log.error("크롤링 실패 보고 접수: {}", payload.errorMessage());
            eventPublisher.publishEvent(new CrawlerErrorEvent("QueueCrawler", payload.errorMessage()));
        }
    }

    @Transactional
    public boolean syncCandidate(CandidateSyncRequest payload) {
        boolean isAlreadyInGames = gameRepository.existsByPsStoreId(payload.psStoreId());
        boolean isAlreadyInQueue = scrapingRequestRepository.existsByPsStoreId(payload.psStoreId());
        boolean isAlreadyInCandidates = gameCandidateRepository.findByPsStoreId(payload.psStoreId()).isPresent();

        if (!isAlreadyInGames && !isAlreadyInQueue && !isAlreadyInCandidates) {
            gameCandidateRepository.save(GameCandidate.builder()
                    .psStoreId(payload.psStoreId())
                    .title(payload.title())
                    .imageUrl(payload.imageUrl())
                    .build());
            return true;
        }
        return false;
    }
}
