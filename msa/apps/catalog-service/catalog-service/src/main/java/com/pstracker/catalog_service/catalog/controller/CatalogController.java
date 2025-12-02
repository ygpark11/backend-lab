package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.scheduler.CrawlerScheduler;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;
    private final CrawlerScheduler scheduler;

    // 데이터 적재 API
    @PostMapping("/collect")
    public ResponseEntity<String> collectGameInfo(@Valid @RequestBody CollectRequestDto request) {
        catalogService.upsertGameData(request);
        return ResponseEntity.ok("Game data collected successfully");
    }

    // 업데이트 대상 게임 조회 API
    @GetMapping("/targets")
    public ResponseEntity<java.util.List<String>> getUpdateTargets() {
        return ResponseEntity.ok(catalogService.getGamesToUpdate());
    }

    // 수동 크롤링 트리거 API
    @PostMapping("/manual-crawl")
    public ResponseEntity<String> manualCrawl() {
        scheduler.triggerCrawler();
        return ResponseEntity.ok("Crawler triggered manually!");
    }
}