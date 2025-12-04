package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByPsStoreId(String psStoreId);

    /**
     * [수집 원칙 - 기간 존중]
     * 갱신이 필요한 게임 목록을 조회합니다.
     *
     * 정책: 마지막 갱신일(lastUpdated)이 기준일(threshold, 1일 전)보다 오래된 게임을 우선 조회합니다.
     * (시스템 안정화를 위해 복잡한 할인 종료일 체크 로직은 제외하고, 단순 갱신 주기 확인으로 변경함)
     *
     * @param threshold 기준 시간 (보통 1일 전)
     * @return 갱신 대상 게임 목록 (오래된 순 정렬)
     */
    @Query("SELECT g FROM Game g WHERE g.lastUpdated < :threshold ORDER BY g.lastUpdated ASC")
    List<Game> findGamesToUpdate(@Param("threshold") LocalDateTime threshold);
}
