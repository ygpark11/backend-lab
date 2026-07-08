package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.WishlistResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WishlistRepositoryCustom {
    Page<WishlistResponse> findAllByMemberId(Long memberId, Pageable pageable);
}
