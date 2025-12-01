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

    // [New] PS Plus 전용 할인 여부
    @Column(name = "is_plus_exclusive")
    private boolean isPlusExclusive;

    // [New] 할인 종료일
    @Column(name = "sale_end_date")
    private LocalDate saleEndDate;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    // --- [생성 메서드] ---
    public static GamePriceHistory create(Game game, Integer originalPrice, Integer price, Integer discountRate, boolean isPlusExclusive, LocalDate saleEndDate) {
        GamePriceHistory history = new GamePriceHistory();
        history.game = game;
        history.originalPrice = originalPrice;
        history.price = price;
        history.discountRate = discountRate;
        history.isPlusExclusive = isPlusExclusive;
        history.saleEndDate = saleEndDate;
        history.recordedAt = LocalDateTime.now();
        return history;
    }
}
