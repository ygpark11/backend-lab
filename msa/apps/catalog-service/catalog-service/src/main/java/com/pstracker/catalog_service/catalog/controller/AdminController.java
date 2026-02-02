package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
