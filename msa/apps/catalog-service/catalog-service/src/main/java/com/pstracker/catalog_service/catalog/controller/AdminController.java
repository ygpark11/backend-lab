package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/games")
@RequiredArgsConstructor
public class AdminController {

    private final CatalogService catalogService;

    @DeleteMapping("/{gameId}")
    public ResponseEntity<Void> deleteGame(@PathVariable Long gameId) {
        catalogService.deleteGame(gameId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{gameId}/refresh")
    public ResponseEntity<String> refreshGame(@PathVariable Long gameId) {
        catalogService.triggerSingleGameRefresh(gameId);
        return ResponseEntity.ok("재수집 요청이 완료되었습니다. (로그를 확인하세요)");
    }
}
