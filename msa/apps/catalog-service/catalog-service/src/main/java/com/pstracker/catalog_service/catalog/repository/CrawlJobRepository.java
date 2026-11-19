package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CrawlJobRepository extends JpaRepository<CrawlJob, Long> {
    Optional<CrawlJob> findFirstByTargetTypeAndStatusOrderByCreatedAtAsc(CrawlJob.TargetType targetType, CrawlJob.JobStatus status);

    /**
     * 다중 수집기(Node 2·3) 동시 폴링 시 중복 할당 방지를 위해 SKIP LOCKED 비관적 락 적용.
     * jakarta.persistence.lock.timeout = -2 (Hibernate LockOptions.SKIP_LOCKED)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT c FROM CrawlJob c WHERE c.targetType = :targetType AND c.status = :status ORDER BY c.createdAt ASC")
    List<CrawlJob> findNextPendingForUpdate(
            @Param("targetType") CrawlJob.TargetType targetType,
            @Param("status") CrawlJob.JobStatus status,
            Pageable pageable
    );

    boolean existsByGameIdAndTargetTypeAndStatusIn(Long gameId, CrawlJob.TargetType targetType, java.util.List<CrawlJob.JobStatus> statuses);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM CrawlJob c WHERE c.gameId IN :gameIds")
    void deleteByGameIds(@Param("gameIds") List<Long> gameIds);

    @Modifying
    @Query("UPDATE CrawlJob c " +
            "SET c.status = :newStatus, c.errorMessage = null, c.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE c.gameId = :gameId " +
            "AND c.targetType = :targetType " +
            "AND c.status IN :oldStatuses")
    int requeueFinishedJob(
            @Param("gameId") Long gameId,
            @Param("targetType") CrawlJob.TargetType targetType,
            @Param("newStatus") CrawlJob.JobStatus newStatus,
            @Param("oldStatuses") List<CrawlJob.JobStatus> oldStatuses
    );

    @Modifying
    @Query("UPDATE CrawlJob c " +
            "SET c.status = :newStatus, c.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE c.status = :currentStatus AND c.updatedAt < :threshold")
    int resetStuckJobs(
            @Param("currentStatus") CrawlJob.JobStatus currentStatus,
            @Param("newStatus") CrawlJob.JobStatus newStatus,
            @Param("threshold") LocalDateTime threshold
    );
}
