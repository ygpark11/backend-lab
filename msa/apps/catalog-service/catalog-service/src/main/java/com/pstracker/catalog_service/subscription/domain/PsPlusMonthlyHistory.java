package com.pstracker.catalog_service.subscription.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ps_plus_monthly_history",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_monthly_history_target_month_ps_store_id",
                        columnNames = {"target_month", "ps_store_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PsPlusMonthlyHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_month", nullable = false, length = 7)
    private String targetMonth;

    @Column(name = "ps_store_id", nullable = false)
    private String psStoreId;

    @Column(nullable = false)
    private String title;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public static PsPlusMonthlyHistory createPsPlusMonthlyHistory(String targetMonth, String psStoreId, String title, String imageUrl) {
        PsPlusMonthlyHistory history = new PsPlusMonthlyHistory();
        history.targetMonth = targetMonth;
        history.psStoreId = psStoreId;
        history.title = title;
        history.imageUrl = imageUrl;
        history.createdAt = LocalDateTime.now();
        return history;
    }
}