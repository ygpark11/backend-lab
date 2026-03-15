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
     * [수집 원칙 제1조 - 효율성 및 기간 존중 (완전판)]
     * 1. 갱신 주기 도래: 오늘 자정(todayStart) 이전에 갱신된 게임 (하루 1회 보장)
     * 2. 세일 중인 게임 제외: 정가(NULL)이거나, 할인이 어제부로 종료된 게임만 조회
     */
    @Query("SELECT g FROM Game g WHERE g.lastUpdated < :todayStart " +
            "AND (g.saleEndDate IS NULL OR g.saleEndDate < :today) " +
            "ORDER BY g.lastUpdated ASC")
    List<Game> findGamesToUpdate(
            @Param("todayStart") LocalDateTime todayStart,
            @Param("today") LocalDate today
    );

    // 설명이 'Full Data Crawler'인 게임 20개 조회 (최신순)
    List<Game> findTop20ByDescriptionOrderByIdDesc(String description);

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.discountRate > 0 AND g.currentPrice <= g.allTimeLowPrice")
    long countAllTimeLowGamesFast();

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.discountRate > 0")
    long countTotalDiscountedGames();

    @Query("SELECT SUM(g.originalPrice - g.currentPrice) FROM Game g WHERE g.saleEndDate IS NOT NULL AND g.saleEndDate >= CURRENT_DATE")
    Long sumTotalDiscountAmount();

    @Query("SELECT MAX(g.lastUpdated) FROM Game g")
    LocalDateTime findLatestUpdateDateTime();

    List<Game> findByFamilyIdOrderByOriginalPriceAsc(String familyId);

    boolean existsByPsStoreId(String psStoreId);
}
