package com.pstracker.catalog_service.scraping.repository;

import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ScrapingRequestRepository extends JpaRepository<ScrapingRequest, Long> {

    // PENDING 상태인 요청 중 가장 오래된 1건만 가져오기 (Limit 1로 메모리 과부하 방지)
    Optional<ScrapingRequest> findFirstByStatusOrderByCreatedAtAsc(ScrapingRequestStatus status);

    // 특정 유저가 특정 시간 이후에 요청한 횟수 카운트
    int countByMemberIdAndCreatedAtAfter(Long memberId, LocalDateTime time);

    // 이미 대기열이나 수집 완료된 동일 게임이 있는지 확인
    boolean existsByPsStoreId(String psStoreId);
}
