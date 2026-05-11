package com.pstracker.catalog_service.subscription.controller;

import com.pstracker.catalog_service.subscription.dto.MonthlyGameArchiveResponse;
import com.pstracker.catalog_service.subscription.dto.MonthlyGameCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusPricingResponse;
import com.pstracker.catalog_service.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/ps-plus/pricing")
    public ResponseEntity<PsPlusPricingResponse> getPsPlusPricing() {
        PsPlusPricingResponse response = subscriptionService.getLatestPricing();

        if (response == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/ps-plus/collect")
    public ResponseEntity<String> collectPsPlusPrices(@Valid @RequestBody PsPlusCollectRequest request) {
        subscriptionService.upsertPsPlusPrices(request);
        return ResponseEntity.ok("PS Plus subscription prices processed successfully.");
    }

    @PostMapping("/monthly-games/collect")
    public ResponseEntity<Void> collectMonthlyGames(@Valid @RequestBody MonthlyGameCollectRequest request) {
        subscriptionService.collectMonthlyGames(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/monthly-games")
    public ResponseEntity<Page<MonthlyGameArchiveResponse>> getMonthlyGamesArchive(
            @PageableDefault(size = 5) Pageable pageable) {

        Page<MonthlyGameArchiveResponse> response = subscriptionService.getMonthlyGamesArchive(pageable);

        if (response.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(response);
    }
}
