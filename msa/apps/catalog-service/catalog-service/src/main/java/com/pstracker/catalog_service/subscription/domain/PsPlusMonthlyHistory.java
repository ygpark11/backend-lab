package com.pstracker.catalog_service.subscription.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "ps_plus_monthly_history",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_monthly_history_month_storeid_type",
                        columnNames = {"target_month", "ps_store_id", "benefit_type"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PsPlusMonthlyHistory extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_month", nullable = false, length = 7)
    private String targetMonth;

    @Column(name = "ps_store_id", nullable = false)
    private String psStoreId;

    @Enumerated(EnumType.STRING)
    @Column(name = "benefit_type", nullable = false, length = 20)
    private BenefitType benefitType;

    @Column(nullable = false)
    private String title;

    @Column(name = "image_url")
    private String imageUrl;

    public enum BenefitType {
        ESSENTIAL, CATALOG
    }

    public static PsPlusMonthlyHistory createPsPlusMonthlyHistory(String targetMonth, String psStoreId, BenefitType benefitType, String title, String imageUrl) {
        PsPlusMonthlyHistory history = new PsPlusMonthlyHistory();
        history.targetMonth = targetMonth;
        history.psStoreId = psStoreId;
        history.benefitType = benefitType;
        history.title = title;
        history.imageUrl = imageUrl;
        return history;
    }
}