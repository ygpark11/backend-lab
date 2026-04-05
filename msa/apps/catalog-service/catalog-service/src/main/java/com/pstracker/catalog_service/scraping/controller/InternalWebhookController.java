package com.pstracker.catalog_service.scraping.controller;

import com.pstracker.catalog_service.catalog.dto.CrawlerCallbackRequest;
import com.pstracker.catalog_service.catalog.dto.RankingUpdateRequestDto;
import com.pstracker.catalog_service.catalog.dto.RatingTargetResponse;
import com.pstracker.catalog_service.catalog.dto.RatingUpdateDto;
import com.pstracker.catalog_service.catalog.service.RankingService;
import com.pstracker.catalog_service.scraping.dto.CandidateSyncRequest;
import com.pstracker.catalog_service.scraping.service.RatingScrapingService;
import com.pstracker.catalog_service.scraping.service.ScrapingWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/internal/scraping")
@RequiredArgsConstructor
public class InternalWebhookController {

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    private final ScrapingWebhookService scrapingWebhookService;
    private final RankingService rankingService;
    private final RatingScrapingService ratingScrapingService;

    @PostMapping("/callback")
    @Transactional
    public ResponseEntity<?> handleCrawlerCallback(
            @RequestHeader("X-Internal-Secret") String secretHeader,
            @RequestBody CrawlerCallbackRequest payload) {

        // 1. 사설망 내부 API 보안 검증
        if (secretHeader == null || !secretHeader.equals(internalSecretKey)) {
            log.warn("잘못된 시크릿 키로 콜백 API 접근 시도!");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
        }

        scrapingWebhookService.processCallback(payload);

        return ResponseEntity.ok("Callback processed successfully");
    }

    @PostMapping("/candidates/sync")
    @Transactional
    public ResponseEntity<String> syncGameCandidates(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @RequestBody CandidateSyncRequest payload) {

        if (secretHeader == null || !secretHeader.equals(internalSecretKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
        }

        boolean saved = scrapingWebhookService.syncCandidate(payload);

        if (saved) {
            log.info("새벽 탐사: 신규 후보군 진열장 등록 완료 ({})", payload.title());
        }
        return ResponseEntity.ok("Sync processed");
    }

    @PostMapping("/rankings/update")
    @Transactional
    public ResponseEntity<String> updateRankings(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @RequestBody RankingUpdateRequestDto payload) {

        if (secretHeader == null || !secretHeader.equals(internalSecretKey)) {
            log.warn("잘못된 시크릿 키로 랭킹 업데이트 API 접근 시도!");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
        }

        rankingService.updateRankings(payload);

        log.info("[Webhook] 랭킹 업데이트 수신 및 처리 완료 ({})", payload.getRankingType());
        return ResponseEntity.ok("Rankings processed");
    }

    @GetMapping("/ratings/target")
    public ResponseEntity<RatingTargetResponse> getRatingTarget(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader) {

        if (secretHeader == null || !secretHeader.equals(internalSecretKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        RatingTargetResponse target = ratingScrapingService.getPendingTarget();
        if (target == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(target);
    }

    @PostMapping("/ratings/update")
    public ResponseEntity<String> updateRatingResult(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @RequestBody RatingUpdateDto request) {

        if (secretHeader == null || !secretHeader.equals(internalSecretKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
        }

        ratingScrapingService.updateRatingResult(request);
        return ResponseEntity.ok("Result saved successfully");
    }

}
