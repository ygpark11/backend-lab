package com.pstracker.catalog_service.subscription.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ps_plus_history", indexes = {
        @Index(name = "idx_ps_plus_tier_date", columnList = "tier, created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PsPlusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false)
    private PsPlusTier tier;

    // 수집 당시 판매가 (프로모션 시 할인가)
    @Column(name = "price_1month", nullable = false)
    private Integer price1Month;

    @Column(name = "price_3month", nullable = false)
    private Integer price3Month;

    @Column(name = "price_12month", nullable = false)
    private Integer price12Month;

    // 수집 당시 정가 (프로모션과 무관한 소니 공식 MSRP)
    @Column(name = "original_price_1month")
    private Integer originalPrice1Month;

    @Column(name = "original_price_3month")
    private Integer originalPrice3Month;

    @Column(name = "original_price_12month")
    private Integer originalPrice12Month;

    // 수집 당시 할인 종료일 (프로모션 미진행 시 null)
    @Column(name = "sale_end_date_1month")
    private LocalDate saleEndDate1Month;

    @Column(name = "sale_end_date_3month")
    private LocalDate saleEndDate3Month;

    @Column(name = "sale_end_date_12month")
    private LocalDate saleEndDate12Month;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static PsPlusHistory create(PsPlusTier tier,
                                       Integer price1Month, Integer price3Month, Integer price12Month,
                                       Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                                       LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        PsPlusHistory history = new PsPlusHistory();
        history.tier = tier;
        history.price1Month = price1Month;
        history.price3Month = price3Month;
        history.price12Month = price12Month;
        history.originalPrice1Month = originalPrice1Month;
        history.originalPrice3Month = originalPrice3Month;
        history.originalPrice12Month = originalPrice12Month;
        history.saleEndDate1Month = saleEndDate1Month;
        history.saleEndDate3Month = saleEndDate3Month;
        history.saleEndDate12Month = saleEndDate12Month;
        return history;
    }

    /** 정가 조회 — 정가 미수집 시 현재 판매가로 fallback */
    public int resolvedOriginalPrice1Month() {
        return originalPrice1Month != null ? originalPrice1Month : price1Month;
    }

    public int resolvedOriginalPrice3Month() {
        return originalPrice3Month != null ? originalPrice3Month : price3Month;
    }

    public int resolvedOriginalPrice12Month() {
        return originalPrice12Month != null ? originalPrice12Month : price12Month;
    }
}
