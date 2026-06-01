package com.pstracker.catalog_service.scraping.repository;

import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScrapingRequestRepository extends JpaRepository<ScrapingRequest, Long> {

    // PENDING 상태인 요청 중 가장 오래된 1건만 가져오기 (Limit 1로 메모리 과부하 방지)
    Optional<ScrapingRequest> findFirstByStatusOrderByCreatedAtAsc(ScrapingRequestStatus status);

    // 특정 유저가 특정 시간 이후에 요청한 횟수 카운트
    int countByMemberIdAndCreatedAtAfter(Long memberId, LocalDateTime time);

    // 진행 중인 요청(PENDING/PROCESSING)이 있는지 확인 — FAILED는 재시도 허용을 위해 제외
    boolean existsByPsStoreIdAndStatusIn(String psStoreId, List<ScrapingRequestStatus> statuses);

    // FAILED 재시도 시 기존 레코드 제거 (unique 제약 충돌 방지)
    // @Modifying 벌크 DELETE: 이후 INSERT와 flush 순서 충돌 없이 즉시 SQL 실행
    @Modifying
    @Query("DELETE FROM ScrapingRequest r WHERE r.psStoreId = :psStoreId AND r.status = :status")
    void deleteByPsStoreIdAndStatus(@Param("psStoreId") String psStoreId, @Param("status") ScrapingRequestStatus status);

    boolean existsByPsStoreId(String psStoreId);
}
