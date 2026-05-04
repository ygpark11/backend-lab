package com.pstracker.catalog_service.subscription.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "ps_plus_pricing")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PsPlusPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, unique = true)
    private PsPlusTier tier;

    @Column(name = "price_1month", nullable = false)
    private Integer price1Month;

    @Column(name = "price_3month", nullable = false)
    private Integer price3Month;

    @Column(name = "price_12month", nullable = false)
    private Integer price12Month;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static PsPlusPricing create(PsPlusTier tier, Integer price1Month, Integer price3Month, Integer price12Month) {
        PsPlusPricing pricing = new PsPlusPricing();
        pricing.tier = tier;
        pricing.price1Month = price1Month;
        pricing.price3Month = price3Month;
        pricing.price12Month = price12Month;
        pricing.updatedAt = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        return pricing;
    }

    public void updatePrices(Integer price1Month, Integer price3Month, Integer price12Month) {
        this.price1Month = price1Month;
        this.price3Month = price3Month;
        this.price12Month = price12Month;
        this.updatedAt = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
    }

    public boolean isSamePrice(Integer price1Month, Integer price3Month, Integer price12Month) {
        return this.price1Month.equals(price1Month) &&
                this.price3Month.equals(price3Month) &&
                this.price12Month.equals(price12Month);
    }
}
