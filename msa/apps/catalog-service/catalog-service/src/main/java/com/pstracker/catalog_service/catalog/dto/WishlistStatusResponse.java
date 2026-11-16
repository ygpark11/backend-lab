package com.pstracker.catalog_service.catalog.dto;

/**
 * 찜 등록·수정 및 삭제 API의 최종 상태 응답 DTO.
 */
public record WishlistStatusResponse(
        boolean liked,
        Integer targetPrice,
        String message
) {
    public static WishlistStatusResponse saved(Integer targetPrice, String message) {
        return new WishlistStatusResponse(true, targetPrice, message);
    }

    public static WishlistStatusResponse removed(String message) {
        return new WishlistStatusResponse(false, null, message);
    }
}
