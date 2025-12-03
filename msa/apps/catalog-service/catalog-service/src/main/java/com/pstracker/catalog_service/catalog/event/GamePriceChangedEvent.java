package com.pstracker.catalog_service.catalog.event;

import lombok.Getter;
import lombok.ToString;

@Getter
@ToString
public class GamePriceChangedEvent {

    private final String gameName;
    private final String psStoreId; // 링크 생성용
    private final int oldPrice;
    private final int newPrice;
    private final int discountRate;
    private final String imageUrl;

    public GamePriceChangedEvent(String gameName, String psStoreId, int oldPrice, int newPrice, int discountRate, String imageUrl) {
        this.gameName = gameName;
        this.psStoreId = psStoreId;
        this.oldPrice = oldPrice;
        this.newPrice = newPrice;
        this.discountRate = discountRate;
        this.imageUrl = imageUrl;
    }
}
