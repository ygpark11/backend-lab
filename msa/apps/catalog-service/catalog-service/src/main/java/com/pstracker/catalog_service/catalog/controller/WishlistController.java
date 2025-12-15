package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.dto.WishlistResponse;
import com.pstracker.catalog_service.catalog.service.WishlistService;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
            @AuthenticationPrincipal MemberPrincipal principal // Security Context에서 ID 바로 획득
    ) {
        boolean isAdded = wishlistService.toggleWishlist(principal.getMemberId(), gameId);

        return ResponseEntity.ok(isAdded ? "찜 목록에 추가되었습니다." : "찜 목록에서 삭제되었습니다.");
    }

    @GetMapping
    public ResponseEntity<Page<WishlistResponse>> getMyWishlist(
            @AuthenticationPrincipal MemberPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<WishlistResponse> response = wishlistService.getMyWishlist(principal.getMemberId(), pageable);
        return ResponseEntity.ok(response);
    }
}
