package com.pstracker.catalog_service.catalog.event;

import lombok.Getter;
import lombok.ToString;

@Getter
@ToString
public class GamePriceChangedEvent {
    private final Long gameId;
    private final String gameName;
    private final String psStoreId;
    private final int oldPrice;
    private final int newPrice;
    private final int discountRate;
    private final String imageUrl;

    public GamePriceChangedEvent(Long gameId, String gameName, String psStoreId, int oldPrice, int newPrice, int discountRate, String imageUrl) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.psStoreId = psStoreId;
        this.oldPrice = oldPrice;
        this.newPrice = newPrice;
        this.discountRate = discountRate;
        this.imageUrl = imageUrl;
    }
}
