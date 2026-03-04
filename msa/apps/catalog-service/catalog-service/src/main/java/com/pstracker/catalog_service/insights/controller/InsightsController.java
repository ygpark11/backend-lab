package com.pstracker.catalog_service.insights.controller;

import com.pstracker.catalog_service.insights.service.InsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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

        Map<String, Object> discount = insightsService.getDiscountSummary();

        // 4. 할인 중
        response.put("totalDiscountedGames", discount.get("totalDiscountedGames"));

        // 5. 총 할인액
        response.put("totalDiscountAmount", discount.get("totalDiscountAmount"));

        // 6. 마지막 동기화 시간
        response.put("lastSyncTime", insightsService.getLastSyncTime());

        // 7. 총 찜한 게임 수
        response.put("totalWishlistCount", insightsService.getTotalWishlistCount());

        return ResponseEntity.ok(response);
    }
}
