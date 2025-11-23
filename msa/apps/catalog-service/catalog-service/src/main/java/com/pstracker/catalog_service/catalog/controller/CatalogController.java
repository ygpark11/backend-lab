package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.GameCollectRequest;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    // 수집기가 데이터를 쏘는 API
    @PostMapping("/collect")
    public ResponseEntity<Long> collectGameInfo(@Valid @RequestBody GameCollectRequest request) {
        Long gameId = catalogService.saveOrUpdateGame(request);
        return ResponseEntity.ok(gameId);
    }
}
