package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long>, GameRepositoryCustom {
    Optional<Game> findByPsStoreId(String psStoreId);

    /**
     * [수집 원칙 제1조 - 기간 존중]
     * 갱신이 필요한 게임 목록을 조회합니다.
     *
     * 조건 1: 마지막 갱신일(lastUpdated)이 기준일(threshold)보다 오래된 게임.
     * 조건 2: "유효한 세일 기간(saleEndDate >= today)"이 남은 최신 가격 정보가 '없는' 게임.
     *
     * 즉, 세일이 아직 안 끝난 게임은 조회 대상에서 제외하여 불필요한 트래픽을 방지합니다.
     */
    @Query("SELECT g FROM Game g WHERE g.lastUpdated < :threshold " +
            "AND NOT EXISTS (" +
            "    SELECT 1 FROM GamePriceHistory ph " +
            "    WHERE ph.game = g " +
            "    AND ph.recordedAt = (SELECT MAX(sub.recordedAt) FROM GamePriceHistory sub WHERE sub.game = g) " +
            "    AND ph.saleEndDate >= :today " +
            ") " +
            "ORDER BY g.lastUpdated ASC")
    List<Game> findGamesToUpdate(
            @Param("threshold") LocalDateTime threshold,
            @Param("today") LocalDate today
    );

    // 설명이 'Full Data Crawler'인 게임 5개 조회 (최신순)
    List<Game> findTop5ByDescriptionOrderByIdDesc(String description);
}
