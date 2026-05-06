package com.pstracker.catalog_service.subscription.controller;

import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusPricingResponse;
import com.pstracker.catalog_service.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
}
