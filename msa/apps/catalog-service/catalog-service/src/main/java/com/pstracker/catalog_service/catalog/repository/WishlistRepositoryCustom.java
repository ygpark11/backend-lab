package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.WishlistDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WishlistRepositoryCustom {
    Page<WishlistDto> findAllByMemberId(Long memberId, Pageable pageable);
}
