package com.pstracker.catalog_service.subscription.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

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

    @Column(name = "price_1month", nullable = false)
    private Integer price1Month;

    @Column(name = "price_3month", nullable = false)
    private Integer price3Month;

    @Column(name = "price_12month", nullable = false)
    private Integer price12Month;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static PsPlusHistory create(PsPlusTier tier, Integer price1Month, Integer price3Month, Integer price12Month) {
        PsPlusHistory history = new PsPlusHistory();
        history.tier = tier;
        history.price1Month = price1Month;
        history.price3Month = price3Month;
        history.price12Month = price12Month;
        return history;
    }
}
