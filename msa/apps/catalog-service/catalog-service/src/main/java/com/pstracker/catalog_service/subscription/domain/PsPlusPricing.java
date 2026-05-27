package com.pstracker.catalog_service.subscription.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "ps_plus_pricing")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PsPlusPricing extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, unique = true)
    private PsPlusTier tier;

    // 현재 판매가 (프로모션 시 할인가, 평시 = originalPrice와 동일)
    @Column(name = "price_1month", nullable = false)
    private Integer price1Month;

    @Column(name = "price_3month", nullable = false)
    private Integer price3Month;

    @Column(name = "price_12month", nullable = false)
    private Integer price12Month;

    // 정가 (소니 공식 MSRP, 프로모션과 무관하게 유지)
    @Column(name = "original_price_1month")
    private Integer originalPrice1Month;

    @Column(name = "original_price_3month")
    private Integer originalPrice3Month;

    @Column(name = "original_price_12month")
    private Integer originalPrice12Month;

    // 할인 종료일 (프로모션 미진행 시 null)
    @Column(name = "sale_end_date_1month")
    private LocalDate saleEndDate1Month;

    @Column(name = "sale_end_date_3month")
    private LocalDate saleEndDate3Month;

    @Column(name = "sale_end_date_12month")
    private LocalDate saleEndDate12Month;

    public static PsPlusPricing create(PsPlusTier tier,
                                       Integer price1Month, Integer price3Month, Integer price12Month,
                                       Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                                       LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        PsPlusPricing pricing = new PsPlusPricing();
        pricing.tier = tier;
        pricing.price1Month = price1Month;
        pricing.price3Month = price3Month;
        pricing.price12Month = price12Month;
        pricing.originalPrice1Month = originalPrice1Month;
        pricing.originalPrice3Month = originalPrice3Month;
        pricing.originalPrice12Month = originalPrice12Month;
        pricing.saleEndDate1Month = saleEndDate1Month;
        pricing.saleEndDate3Month = saleEndDate3Month;
        pricing.saleEndDate12Month = saleEndDate12Month;
        return pricing;
    }

    public void updatePrices(Integer price1Month, Integer price3Month, Integer price12Month,
                             Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                             LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        this.price1Month = price1Month;
        this.price3Month = price3Month;
        this.price12Month = price12Month;
        this.originalPrice1Month = originalPrice1Month;
        this.originalPrice3Month = originalPrice3Month;
        this.originalPrice12Month = originalPrice12Month;
        this.saleEndDate1Month = saleEndDate1Month;
        this.saleEndDate3Month = saleEndDate3Month;
        this.saleEndDate12Month = saleEndDate12Month;
    }

    public boolean isSamePrice(Integer price1Month, Integer price3Month, Integer price12Month,
                               Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                               LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        return this.price1Month.equals(price1Month) &&
                this.price3Month.equals(price3Month) &&
                this.price12Month.equals(price12Month) &&
                java.util.Objects.equals(this.originalPrice1Month, originalPrice1Month) &&
                java.util.Objects.equals(this.originalPrice3Month, originalPrice3Month) &&
                java.util.Objects.equals(this.originalPrice12Month, originalPrice12Month) &&
                java.util.Objects.equals(this.saleEndDate1Month, saleEndDate1Month) &&
                java.util.Objects.equals(this.saleEndDate3Month, saleEndDate3Month) &&
                java.util.Objects.equals(this.saleEndDate12Month, saleEndDate12Month);
    }

    /** 정가 조회 — 정가 미수집 시 현재 판매가로 fallback */
    public Integer resolvedOriginalPrice1Month() {
        return originalPrice1Month != null ? originalPrice1Month : price1Month;
    }

    public Integer resolvedOriginalPrice3Month() {
        return originalPrice3Month != null ? originalPrice3Month : price3Month;
    }

    public Integer resolvedOriginalPrice12Month() {
        return originalPrice12Month != null ? originalPrice12Month : price12Month;
    }
}
