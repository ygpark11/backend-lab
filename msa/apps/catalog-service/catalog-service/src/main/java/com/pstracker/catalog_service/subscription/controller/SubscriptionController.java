package com.pstracker.catalog_service.subscription.controller;

import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @PostMapping("/ps-plus/collect")
    public ResponseEntity<String> collectPsPlusPrices(@Valid @RequestBody PsPlusCollectRequest request) {
        subscriptionService.upsertPsPlusPrices(request);
        return ResponseEntity.ok("PS Plus subscription prices processed successfully.");
    }
}
