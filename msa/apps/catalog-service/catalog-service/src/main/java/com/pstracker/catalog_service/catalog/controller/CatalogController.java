package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.*;
import com.pstracker.catalog_service.catalog.scheduler.CrawlerScheduler;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.catalog.service.GameVoteService;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.insights.service.InsightsService;
import com.pstracker.catalog_service.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
@Slf4j
public class CatalogController {

    private final CatalogService catalogService;
    private final CrawlerScheduler scheduler;
    private final InsightsService insightsService;
    private final GameVoteService gameVoteService;
    private final SubscriptionService subscriptionService;

    // 데이터 적재 API
    @PostMapping("/collect")
    public ResponseEntity<String> collectGameInfo(@Valid @RequestBody CollectRequest request) {
        catalogService.upsertGameData(request);
        return ResponseEntity.ok("Game data collected successfully");
    }

    // 업데이트 대상 게임 조회 API
    @GetMapping("/targets")
    public ResponseEntity<List<String>> getUpdateTargets() {
        return ResponseEntity.ok(catalogService.getGamesToUpdate());
    }

    // 수동 크롤링 트리거 API
    @PostMapping("/manual-crawl")
    public ResponseEntity<String> manualCrawl() {
        scheduler.triggerCrawler();
        return ResponseEntity.ok("Crawler triggered manually!");
    }

    @GetMapping("/search")
    public ResponseEntity<Page<GameSearchResponse>> searchGames(
            GameSearchCondition condition,
            @PageableDefault(size = 20, sort = "lastUpdated", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = (principal != null) ? principal.getMemberId() : null;

        Page<GameSearchResponse> result = catalogService.searchGames(condition, pageable, memberId);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<GameDetailResponse> getGameDetail(
            @PathVariable Long gameId,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = (principal != null) ? principal.getMemberId() : null;

        GameDetailResponse response = catalogService.getGameDetail(gameId, memberId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/batch-complete")
    public ResponseEntity<String> onCrawlerBatchCompleted() {
        log.info("일배치 완료 — 전체 로컬 캐시 초기화");
        insightsService.refreshInsightsCache();
        catalogService.refreshCurationCache();
        subscriptionService.refreshPsPlusPricingCache();
        return ResponseEntity.ok("Cache cleared successfully");
    }

    @GetMapping("/suggest")
    public ResponseEntity<List<GameSuggestResponse>> suggestGames(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "5") int limit) {
        if (q.length() < 2) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(catalogService.suggestGames(q, Math.min(limit, 10)));
    }

    @PostMapping("/{gameId}/vote")
    public ResponseEntity<GameVoteResponse> vote(
            @PathVariable Long gameId,
            @RequestBody GameVoteRequest requestDto,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = (principal != null) ? principal.getMemberId() : null;

        GameVoteResponse response = gameVoteService.toggleVote(gameId, memberId, requestDto.getVoteType());

        return ResponseEntity.ok(response);
    }

}