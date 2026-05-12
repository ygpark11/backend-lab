package com.pstracker.catalog_service.scraping.controller;

import com.pstracker.catalog_service.catalog.dto.CrawlerCallbackRequest;
import com.pstracker.catalog_service.catalog.dto.RankingUpdateRequestDto;
import com.pstracker.catalog_service.catalog.service.RankingService;
import com.pstracker.catalog_service.scraping.dto.*;
import com.pstracker.catalog_service.scraping.service.HltbScrapingService;
import com.pstracker.catalog_service.scraping.service.RatingScrapingService;
import com.pstracker.catalog_service.scraping.service.ScrapingWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final HltbScrapingService hltbScrapingService;

    @PostMapping("/callback")
    @Transactional
    public ResponseEntity<?> handleCrawlerCallback(
            @RequestBody CrawlerCallbackRequest payload) {
        scrapingWebhookService.processCallback(payload);
        return ResponseEntity.ok("Callback processed successfully");
    }

    @PostMapping("/candidates/sync")
    @Transactional
    public ResponseEntity<String> syncGameCandidates(
            @RequestBody CandidateSyncRequest payload) {
        boolean saved = scrapingWebhookService.syncCandidate(payload);

        if (saved) {
            log.info("새벽 탐사: 신규 후보군 진열장 등록 완료 ({})", payload.title());
        }
        return ResponseEntity.ok("Sync processed");
    }

    @PostMapping("/rankings/update")
    @Transactional
    public ResponseEntity<String> updateRankings(
            @RequestBody RankingUpdateRequestDto payload) {
        rankingService.updateRankings(payload);

        log.info("[Webhook] 랭킹 업데이트 수신 및 처리 완료 ({})", payload.getRankingType());
        return ResponseEntity.ok("Rankings processed");
    }

    @GetMapping("/ratings/target")
    public ResponseEntity<RatingTargetResponse> getRatingTarget() {
        RatingTargetResponse target = ratingScrapingService.getPendingTarget();
        if (target == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(target);
    }

    @PostMapping("/ratings/update")
    public ResponseEntity<String> updateRatingResult(
            @RequestBody RatingUpdateDto request) {
        ratingScrapingService.updateRatingResult(request);
        return ResponseEntity.ok("Result saved successfully");
    }

    @GetMapping("/hltb/target")
    public ResponseEntity<HltbTargetResponse> getHltbTarget() {
        HltbTargetResponse target = hltbScrapingService.getPendingTarget();
        if (target == null) {
            return ResponseEntity.noContent().build(); // 204 No Content
        }
        return ResponseEntity.ok(target);
    }

    @PostMapping("/hltb/update")
    public ResponseEntity<String> updateHltbResult(@RequestBody HltbUpdateDto request) {
        hltbScrapingService.updateHltbResult(request);
        return ResponseEntity.ok("HLTB Result saved successfully");
    }
}
