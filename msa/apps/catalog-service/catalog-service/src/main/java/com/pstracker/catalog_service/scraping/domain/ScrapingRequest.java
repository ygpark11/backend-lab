package com.pstracker.catalog_service.scraping.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import com.pstracker.catalog_service.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "scraping_requests", indexes = {
        @Index(name = "idx_scraping_status_time", columnList = "status, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScrapingRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 아직 Game이 없으므로 String
    @Column(name = "ps_store_id", nullable = false, unique = true)
    private String psStoreId;

    @Column(name = "target_url", nullable = false, length = 500)
    private String targetUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScrapingRequestStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Builder
    public ScrapingRequest(Member member, String psStoreId, String targetUrl) {
        this.member = member;
        this.psStoreId = psStoreId;
        this.targetUrl = targetUrl;
        this.status = ScrapingRequestStatus.PENDING;
    }

    // --- [비즈니스 로직] ---
    public void markAsProcessing() {
        this.status = ScrapingRequestStatus.PROCESSING;
    }

    public void markAsCompleted() {
        this.status = ScrapingRequestStatus.COMPLETED;
    }

    public void markAsFailed(String errorMessage) {
        this.status = ScrapingRequestStatus.FAILED;
        this.errorMessage = errorMessage != null && errorMessage.length() > 500
                ? errorMessage.substring(0, 500) : errorMessage;
    }
}
