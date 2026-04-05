package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CrawlJobRepository extends JpaRepository<CrawlJob, Long> {
    Optional<CrawlJob> findFirstByStatusOrderByCreatedAtAsc(CrawlJob.JobStatus status);
    boolean existsByGameIdAndTargetTypeAndStatusIn(Long gameId, String targetType, java.util.List<CrawlJob.JobStatus> statuses);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE CrawlJob c " +
            "SET c.status = :newStatus, c.errorMessage = null, c.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE c.gameId = :gameId " +
            "AND c.targetType = :targetType " +
            "AND c.status IN :oldStatuses")
    int requeueFinishedJob(
            @Param("gameId") Long gameId,
            @Param("targetType") String targetType,
            @Param("newStatus") CrawlJob.JobStatus newStatus,
            @Param("oldStatuses") List<CrawlJob.JobStatus> oldStatuses
    );
}
