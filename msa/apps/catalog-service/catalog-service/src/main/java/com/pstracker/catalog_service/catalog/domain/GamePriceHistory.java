package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "game_price_history", indexes = {
        @Index(name = "idx_price_history_game_date", columnList = "game_id, recorded_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GamePriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    // 정가 (할인 전 가격)
    @Column(name = "original_price")
    private Integer originalPrice;

    // 실제 판매가 (할인 적용가)
    @Column(nullable = false)
    private Integer price;

    @Column(name = "discount_rate")
    private Integer discountRate;

    // PS Plus 전용 할인 여부
    @Column(name = "is_plus_exclusive")
    private boolean isPlusExclusive;

    // 할인 종료일
    @Column(name = "sale_end_date")
    private LocalDate saleEndDate;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    @Column(name = "in_catalog", nullable = false)
    private boolean inCatalog;

    // --- [비즈니스 로직: 데이터 동등성 비교] ---
    /**
     * 새로 수집된 데이터가 현재 이력과 동일한 가격 조건을 가지고 있는지 확인
     * (가격, 할인율, 플러스 혜택 여부, 세일 종료일 등)
     */
    public boolean isSameCondition(Integer newPrice, Integer newDiscountRate,
                                   boolean newPlusExclusive, LocalDate newSaleEndDate,
                                   boolean newInCatalog) {
        // 1. 가격 비교
        if (!this.price.equals(newPrice)) return false;

        // 2. 할인율 비교 (null safe)
        int currentDiscount = this.discountRate == null ? 0 : this.discountRate;
        int targetDiscount = newDiscountRate == null ? 0 : newDiscountRate;
        if (currentDiscount != targetDiscount) return false;

        // 3. 조건 비교 (PS Plus 전용 여부 / 카탈로그 여부)
        if (this.isPlusExclusive != newPlusExclusive) return false;
        if (this.inCatalog != newInCatalog) return false;

        // 4. 세일 종료일 비교 (날짜가 바뀌었으면 새로운 프로모션일 수 있음)
        // 둘 다 null이면 같음, 하나만 null이면 다름, 둘 다 있으면 equals
        if (this.saleEndDate == null && newSaleEndDate == null) return true;
        if (this.saleEndDate == null || newSaleEndDate == null) return false;

        return this.saleEndDate.equals(newSaleEndDate);
    }

    // --- [생성 메서드] ---
    public static GamePriceHistory create(Game game, Integer originalPrice, Integer price,
                                          Integer discountRate, boolean isPlusExclusive,
                                          LocalDate saleEndDate, boolean inCatalog) {
        GamePriceHistory history = new GamePriceHistory();
        history.game = game;
        history.originalPrice = originalPrice;
        history.price = price;
        history.discountRate = discountRate;
        history.isPlusExclusive = isPlusExclusive;
        history.saleEndDate = saleEndDate;
        history.inCatalog = inCatalog;
        history.recordedAt = LocalDateTime.now();
        return history;
    }
}
