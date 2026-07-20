package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.member.dto.FilterPresetCreateRequest;
import com.pstracker.catalog_service.member.dto.FilterPresetResponse;
import com.pstracker.catalog_service.member.dto.FilterPresetUpdateRequest;
import com.pstracker.catalog_service.member.service.FilterPresetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/members/me/presets")
@RequiredArgsConstructor
public class FilterPresetController {

    private final FilterPresetService filterPresetService;

    @GetMapping
    public ResponseEntity<List<FilterPresetResponse>> getMyPresets(
            @AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(filterPresetService.getMyPresets(principal.getMemberId()));
    }

    @PostMapping
    public ResponseEntity<FilterPresetResponse> createPreset(
            @AuthenticationPrincipal MemberPrincipal principal,
            @RequestBody @Valid FilterPresetCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(filterPresetService.createPreset(principal.getMemberId(), request));
    }

    @PatchMapping("/{presetId}")
    public ResponseEntity<FilterPresetResponse> updatePreset(
            @AuthenticationPrincipal MemberPrincipal principal,
            @PathVariable Long presetId,
            @RequestBody @Valid FilterPresetUpdateRequest request) {
        return ResponseEntity.ok(filterPresetService.updatePreset(principal.getMemberId(), presetId, request));
    }

    @DeleteMapping("/{presetId}")
    public ResponseEntity<Void> deletePreset(
            @AuthenticationPrincipal MemberPrincipal principal,
            @PathVariable Long presetId) {
        filterPresetService.deletePreset(principal.getMemberId(), presetId);
        return ResponseEntity.noContent().build();
    }
}
