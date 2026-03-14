package com.pstracker.catalog_service.scraping.controller;

import com.pstracker.catalog_service.catalog.dto.CrawlerCallbackRequest;
import com.pstracker.catalog_service.scraping.dto.CandidateSyncRequest;
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
}
