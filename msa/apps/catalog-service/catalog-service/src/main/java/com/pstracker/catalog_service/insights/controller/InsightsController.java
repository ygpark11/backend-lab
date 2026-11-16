package com.pstracker.catalog_service.insights.controller;

import com.pstracker.catalog_service.insights.dto.InsightsSummaryResponse;
import com.pstracker.catalog_service.insights.dto.TrendingGameResponse;
import com.pstracker.catalog_service.insights.service.InsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/insights")
@RequiredArgsConstructor
public class InsightsController {

    private final InsightsService insightsService;

    @GetMapping("/summary")
    public ResponseEntity<InsightsSummaryResponse> getInsightsSummary() {
        return ResponseEntity.ok(insightsService.getInsightsSummary());
    }

    @GetMapping("/trending")
    public ResponseEntity<List<TrendingGameResponse>> getTrendingGames(
            @RequestParam(defaultValue = "10") int limit) {
        List<TrendingGameResponse> all = insightsService.getTrendingGames();
        return ResponseEntity.ok(all.stream().limit(Math.min(limit, 20)).toList());
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refreshInsightsCache() {
        insightsService.refreshInsightsCache();
        return ResponseEntity.ok().build();
    }
}
