package com.pstracker.catalog_service.insights.controller;

import com.pstracker.catalog_service.insights.dto.DiscountSummaryDto;
import com.pstracker.catalog_service.insights.service.InsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/insights")
@RequiredArgsConstructor
public class InsightsController {

    private final InsightsService insightsService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getInsightsSummary() {
        Map<String, Object> response = new HashMap<>();

        // 1. 역대 최저가 게임 수
        response.put("allTimeLowCount", insightsService.getAllTimeLowCount());

        // 2. 머스트 플레이 갓겜 수
        response.put("mustPlayCount", insightsService.getMustPlayCount());

        // 3. 총 트래킹 중인 타이틀 수
        response.put("totalTrackedCount", insightsService.getTotalTrackedCount());

        DiscountSummaryDto discount = insightsService.getDiscountSummary();

        // 4. 할인 중
        response.put("totalDiscountedGames", discount.totalDiscountedGames());

        // 5. 총 할인액
        response.put("totalDiscountAmount", discount.totalDiscountAmount());

        // 6. 마지막 동기화 시간
        response.put("lastSyncTime", insightsService.getLastSyncTime());

        // 7. 총 찜한 게임 수
        response.put("totalWishlistCount", insightsService.getTotalWishlistCount());

        // 8. 마감 임박 게임 수
        response.put("closingSoonCount", insightsService.getClosingSoonCount());

        // 9. 신규 할인 게임 수
        response.put("newDiscountCount", insightsService.getNewDiscountCount());

        // 10. PS5 Pro 향상 게임 수
        response.put("ps5ProCount", insightsService.getPs5ProEnhancedCount());

        // 11. 스페셜 카탈로그 게임 수
        response.put("inCatalogCount", insightsService.getInCatalogCount());

        // 12. PLUS 전용 할인 게임 수
        response.put("plusExclusiveCount", insightsService.getPlusExclusiveCount());

        // 13. 플레이타임 분포 구간별 카운트
        response.put("ptShortCount", insightsService.getShortPlayTimeCount());
        response.put("ptMediumCount", insightsService.getMediumPlayTimeCount());
        response.put("ptLongCount", insightsService.getLongPlayTimeCount());
        response.put("ptEpicCount", insightsService.getEpicPlayTimeCount());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refreshInsightsCache() {
        insightsService.refreshInsightsCache();
        return ResponseEntity.ok().build();
    }
}
