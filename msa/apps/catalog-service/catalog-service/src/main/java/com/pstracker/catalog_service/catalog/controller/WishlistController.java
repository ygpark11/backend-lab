package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.WishlistDto;
import com.pstracker.catalog_service.catalog.dto.WishlistRequest;
import com.pstracker.catalog_service.catalog.service.WishlistService;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wishlists")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @PostMapping("/{gameId}")
    public ResponseEntity<String> toggleWishlist(
            @PathVariable Long gameId,
            @RequestBody(required = false) WishlistRequest request,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        try {
            Integer targetPrice = (request != null) ? request.getTargetPrice() : null;

            String resultMessage = wishlistService.toggleWishlist(principal.getMemberId(), gameId, targetPrice);

            return ResponseEntity.ok(resultMessage);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Page<WishlistDto>> getMyWishlist(
            @AuthenticationPrincipal MemberPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<WishlistDto> response = wishlistService.getMyWishlist(principal.getMemberId(), pageable);
        return ResponseEntity.ok(response);
    }
}
