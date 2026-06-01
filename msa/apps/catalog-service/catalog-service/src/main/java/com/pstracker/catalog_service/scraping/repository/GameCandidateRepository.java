package com.pstracker.catalog_service.scraping.repository;

import com.pstracker.catalog_service.scraping.domain.GameCandidate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface GameCandidateRepository extends JpaRepository<GameCandidate, Long> {

    // 게임 후보군 목록 조회 (최근 발견된 순, 페이지네이션)
    Slice<GameCandidate> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 수집 요청 시 대상 검증용
    Optional<GameCandidate> findByPsStoreId(String psStoreId);

    boolean existsByPsStoreId(String psStoreId);

    // 누군가 수집을 요청하면 진열장에서 즉시 삭제 (중복 클릭 방어)
    // @Modifying 벌크 DELETE: derived delete(em.remove 스케줄링)와 달리 즉시 SQL 실행
    // → Hibernate flush 순서(INSERT 우선)로 인한 unique constraint 위반 방지
    @Modifying
    @Query("DELETE FROM GameCandidate g WHERE g.psStoreId = :psStoreId")
    void deleteByPsStoreId(@Param("psStoreId") String psStoreId);

    // [정리 스케줄러] Game 테이블에 이미 수집된 후보 제거 (서브쿼리)
    @Modifying
    @Query("DELETE FROM GameCandidate g WHERE EXISTS (SELECT 1 FROM Game game WHERE game.psStoreId = g.psStoreId)")
    int deleteAlreadyCollected();

    // [정리 스케줄러] 기준 날짜보다 오래된 후보 삭제
    @Modifying
    @Query("DELETE FROM GameCandidate g WHERE g.createdAt < :threshold")
    int deleteByCreatedAtBefore(@Param("threshold") LocalDateTime threshold);
}
