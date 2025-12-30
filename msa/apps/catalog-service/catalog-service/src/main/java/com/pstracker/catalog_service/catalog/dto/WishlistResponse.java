package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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

    private LocalDateTime createdAt; // 게임 생성일 (NEW 뱃지용)
    private LocalDate saleEndDate;   // 할인 종료일 (마감임박 뱃지용)
    private List<String> genres;     // 장르 이모지용

    private LocalDateTime wishedAt; // 언제 찜했는지

    private Integer metaScore;

    public WishlistResponse(Wishlist wishlist, GamePriceHistory latestPrice) {
        Game game = wishlist.getGame();

        this.gameId = game.getId();
        this.name = game.getName();
        this.imageUrl = game.getImageUrl();
        this.wishedAt = wishlist.getCreatedAt();
        this.createdAt = game.getCreatedAt();
        this.metaScore = game.getMetaScore();

        this.genres = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getName())
                .toList();

        if (latestPrice != null) {
            this.currentPrice = latestPrice.getPrice();
            this.originalPrice = latestPrice.getOriginalPrice();
            this.discountRate = latestPrice.getDiscountRate();
            this.isOnSale = discountRate > 0;
            this.saleEndDate = latestPrice.getSaleEndDate();
        } else {
            this.currentPrice = 0;
            this.isOnSale = false;
        }
    }
}
