package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.insights.service.InsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final CatalogService catalogService;
    private final InsightsService insightsService;

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

    @PostMapping("/insights/refresh")
    public ResponseEntity<String> refreshInsightsCache() {
        insightsService.refreshInsightsCache();
        return ResponseEntity.ok("Insights 통계 로컬 캐시가 성공적으로 초기화되었습니다.");
    }
}
