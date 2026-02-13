package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.scheduler.CrawlerScheduler;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<List<String>> getUpdateTargets() {
        return ResponseEntity.ok(catalogService.getGamesToUpdate());
    }

    // 수동 크롤링 트리거 API
    @PostMapping("/manual-crawl")
    public ResponseEntity<String> manualCrawl() {
        scheduler.triggerCrawler();
        return ResponseEntity.ok("Crawler triggered manually!");
    }

    @GetMapping("/search")
    public ResponseEntity<Page<GameSearchResultDto>> searchGames(
            GameSearchCondition condition,
            @PageableDefault(size = 20, sort = "lastUpdated", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = (principal != null) ? principal.getMemberId() : null;

        Page<GameSearchResultDto> result = catalogService.searchGames(condition, pageable, memberId);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<GameDetailResponse> getGameDetail(
            @PathVariable Long gameId,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = (principal != null) ? principal.getMemberId() : null;

        GameDetailResponse response = catalogService.getGameDetail(gameId, memberId);
        return ResponseEntity.ok(response);
    }
}