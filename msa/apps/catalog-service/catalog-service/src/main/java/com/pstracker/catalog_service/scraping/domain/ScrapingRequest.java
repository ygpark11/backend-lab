package com.pstracker.catalog_service.scraping.domain;

import com.pstracker.catalog_service.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "scraping_requests", indexes = {
        @Index(name = "idx_scraping_status_time", columnList = "status, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScrapingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 아직 Game이 없으므로 String
    @Column(name = "ps_store_id", nullable = false)
    private String psStoreId;

    @Column(name = "target_url", nullable = false, length = 500)
    private String targetUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScrapingRequestStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public ScrapingRequest(Member member, String psStoreId, String targetUrl) {
        this.member = member;
        this.psStoreId = psStoreId;
        this.targetUrl = targetUrl;
        this.status = ScrapingRequestStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // --- [비즈니스 로직] ---
    public void markAsProcessing() {
        this.status = ScrapingRequestStatus.PROCESSING;
        this.updatedAt = LocalDateTime.now();
    }

    public void markAsCompleted() {
        this.status = ScrapingRequestStatus.COMPLETED;
        this.updatedAt = LocalDateTime.now();
    }

    public void markAsFailed(String errorMessage) {
        this.status = ScrapingRequestStatus.FAILED;
        this.errorMessage = errorMessage != null && errorMessage.length() > 500
                ? errorMessage.substring(0, 500) : errorMessage;
        this.updatedAt = LocalDateTime.now();
    }
}
