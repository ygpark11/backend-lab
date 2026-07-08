package com.pstracker.catalog_service.catalog.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "crawl_jobs", indexes = {
        @Index(name = "idx_crawl_job_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CrawlJob extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private TargetType targetType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public enum JobStatus {
        PENDING, PROCESSING, DONE, FAILED, NOT_FOUND, SKIP, ERROR
    }

    public enum TargetType {
        METACRITIC,
        HLTB
    }

    public static CrawlJob create(Long gameId, CrawlJob.TargetType targetType) {
        CrawlJob job = new CrawlJob();
        job.gameId = gameId;
        job.targetType = targetType;
        job.status = JobStatus.PENDING;
        return job;
    }

    public void updateStatus(JobStatus newStatus, String errorMessage) {
        this.status = newStatus;
        this.errorMessage = errorMessage;
    }
}
