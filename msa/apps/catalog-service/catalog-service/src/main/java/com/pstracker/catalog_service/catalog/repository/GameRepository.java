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
     * [수집 원칙 제1조 - 효율성 및 기간 존중]
     * 크롤링(갱신) 대상 게임 목록을 조회합니다.
     * 불필요한 트래픽을 방지하기 위해 다음 두 가지 조건을 모두 만족하는 게임만 선별합니다.
     *
     * 1. 갱신 주기 도래 (Time Check):
     * - 마지막 갱신일(lastUpdated)이 기준일(threshold)보다 과거인 게임.
     *
     * 2. 세일 중인 게임 제외 (Optimization - NOT EXISTS):
     * - 현재 진행 중인 세일(saleEndDate >= today)이 있다면 가격이 변동될 확률이 없으므로 수집 대상에서 제외합니다.
     * - 즉, '정가 판매 중(NULL)'이거나 '세일이 막 종료된' 게임만 조회하여 갱신합니다.
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

    // 설명이 'Full Data Crawler'인 게임 20개 조회 (최신순)
    List<Game> findTop20ByDescriptionOrderByIdDesc(String description);
}
