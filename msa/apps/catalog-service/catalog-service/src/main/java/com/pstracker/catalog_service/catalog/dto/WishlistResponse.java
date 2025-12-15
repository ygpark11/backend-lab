package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class WishlistResponse {
    private Long gameId;
    private String name;
    private String imageUrl;

    // 가격 정보 (가격 정보가 없을 수도 있음)
    private Integer currentPrice;
    private Integer originalPrice;
    private int discountRate;
    private boolean isOnSale;

    private LocalDateTime wishedAt; // 언제 찜했는지

    public WishlistResponse(Wishlist wishlist, GamePriceHistory latestPrice) {
        Game game = wishlist.getGame();
        this.gameId = game.getId();
        this.name = game.getName();
        this.imageUrl = game.getImageUrl();
        this.wishedAt = wishlist.getCreatedAt();

        if (latestPrice != null) {
            this.currentPrice = latestPrice.getPrice();
            this.originalPrice = latestPrice.getOriginalPrice();
            this.discountRate = latestPrice.getDiscountRate();
            this.isOnSale = discountRate > 0;
        } else {
            // 가격 정보가 없는 경우 (출시 예정작 등)
            this.currentPrice = 0;
            this.isOnSale = false;
        }
    }
}
