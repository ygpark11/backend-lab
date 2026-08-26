package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.AdminGameDetailResponse;
import com.pstracker.catalog_service.catalog.dto.AdminGameUpdateRequest;
import com.pstracker.catalog_service.catalog.dto.AdminRegisterRequest;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.catalog.service.GameReadService;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.insights.service.InsightsService;
import com.pstracker.catalog_service.scraping.dto.AdminScrapingResponse;
import com.pstracker.catalog_service.scraping.service.ScrapingQueueService;
import com.pstracker.catalog_service.subscription.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final CatalogService catalogService;
    private final GameReadService gameReadService;
    private final InsightsService insightsService;
    private final ScrapingQueueService scrapingQueueService;
    private final SubscriptionService subscriptionService;

    @DeleteMapping("/games/{gameId}")
    public ResponseEntity<Void> deleteGame(@PathVariable Long gameId) {
        catalogService.deleteGame(gameId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/games/{gameId}/refresh")
    public ResponseEntity<String> refreshGame(@PathVariable Long gameId) {
        catalogService.triggerSingleGameRefresh(gameId);
        return ResponseEntity.ok("재수집 요청이 완료되었습니다. (로그를 확인하세요)");
    }

    @PostMapping("/cache/refresh")
    public ResponseEntity<String> refreshAllCaches() {
        insightsService.refreshInsightsCache();
        insightsService.refreshTrendingCache();
        catalogService.refreshCurationCache();
        subscriptionService.refreshPsPlusPricingCache();
        return ResponseEntity.ok("전체 로컬 캐시가 성공적으로 초기화되었습니다.");
    }

    @DeleteMapping("/scraping/candidates/{psStoreId}")
    public ResponseEntity<Void> deleteCandidate(@PathVariable String psStoreId) {
        scrapingQueueService.deleteCandidate(psStoreId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/games/bulk")
    public ResponseEntity<Void> bulkDeleteGames(@RequestBody List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        catalogService.bulkDeleteGames(gameIds);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/games/register")
    public ResponseEntity<String> registerGame(
            @RequestBody AdminRegisterRequest req,
            @AuthenticationPrincipal MemberPrincipal principal) {
        scrapingQueueService.adminRegisterGame(req.psStoreId(), principal.getMemberId());
        return ResponseEntity.ok("수집 대기열에 등록되었습니다.");
    }

    @GetMapping("/games/{gameId}")
    public ResponseEntity<AdminGameDetailResponse> getAdminGameDetail(@PathVariable Long gameId) {
        return ResponseEntity.ok(gameReadService.getAdminGameDetail(gameId));
    }

    @PatchMapping("/games/{gameId}")
    public ResponseEntity<Void> updateGame(
            @PathVariable Long gameId,
            @RequestBody AdminGameUpdateRequest req) {
        catalogService.adminUpdateGame(gameId, req);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/scraping/requests")
    public ResponseEntity<Page<AdminScrapingResponse>> getScrapingRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                scrapingQueueService.getAdminScrapingRequests(PageRequest.of(page, size))
        );
    }

    @PostMapping("/scraping/requests/{requestId}/retry")
    public ResponseEntity<String> retryScrapingRequest(
            @PathVariable Long requestId,
            @AuthenticationPrincipal MemberPrincipal principal) {
        scrapingQueueService.adminRetryRequest(requestId, principal.getMemberId());
        return ResponseEntity.ok("재수집 요청이 등록되었습니다.");
    }
}
