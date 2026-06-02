package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.GameIdMappingDto;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long>, GameRepositoryCustom {
    Optional<Game> findByPsStoreId(String psStoreId);

    /**
     * 게임 상세 조회 시 gameGenres → genre 까지 한 번에 fetch join
     * default_batch_fetch_size 의존 없이 SELECT 1방으로 처리
     */
    @EntityGraph(attributePaths = {"gameGenres", "gameGenres.genre"})
    @Query("SELECT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findByIdWithGenres(@Param("gameId") Long gameId);

    /**
     * upsert 시 장르 동기화를 위해 gameGenres 까지 한 번에 fetch join
     */
    @EntityGraph(attributePaths = {"gameGenres", "gameGenres.genre"})
    @Query("SELECT g FROM Game g WHERE g.psStoreId = :psStoreId")
    Optional<Game> findByPsStoreIdWithGenres(@Param("psStoreId") String psStoreId);

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

    long countByPioneerMemberId(Long pioneerMemberId);

    List<Game> findAllByPioneerMemberIdOrderByCreatedAtDesc(Long pioneerMemberId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.likeCount = g.likeCount + 1 WHERE g.id = :id")
    void incrementLikeCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.likeCount = CASE WHEN g.likeCount > 0 THEN g.likeCount - 1 ELSE 0 END WHERE g.id = :id")
    void decrementLikeCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.dislikeCount = g.dislikeCount + 1 WHERE g.id = :id")
    void incrementDislikeCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.dislikeCount = CASE WHEN g.dislikeCount > 0 THEN g.dislikeCount - 1 ELSE 0 END WHERE g.id = :id")
    void decrementDislikeCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.pioneerName = :newNickname WHERE g.pioneerMemberId = :memberId")
    void updatePioneerNameByMemberId(@Param("memberId") Long memberId, @Param("newNickname") String newNickname);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.bestSellerRank = null")
    void clearBestSellerRanks();

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.mostDownloadedRank = null")
    void clearMostDownloadedRanks();

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.bestSellerRank = :rank WHERE g.psStoreId = :psStoreId")
    int updateBestSellerRank(@Param("psStoreId") String psStoreId, @Param("rank") Integer rank);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Game g SET g.mostDownloadedRank = :rank WHERE g.psStoreId = :psStoreId")
    int updateMostDownloadedRank(@Param("psStoreId") String psStoreId, @Param("rank") Integer rank);

    @Query("SELECT g FROM Game g WHERE g.description = :description OR g.vibeTags IS NULL OR g.searchKeywords IS NULL ORDER BY g.id ASC")
    List<Game> findTop5NeedingAiUpdate(@Param("description") String description, Pageable pageable);

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.saleEndDate BETWEEN CURRENT_DATE AND :tomorrow")
    long countClosingSoonGames(@Param("tomorrow") LocalDate tomorrow);

    @Query("SELECT COUNT(DISTINCT h.game.id) FROM GamePriceHistory h " +
            "WHERE h.discountRate > 0 " +
            "AND h.createdAt BETWEEN :startOfDay AND :endOfDay")
    long countNewDiscountGames(@Param("startOfDay") LocalDateTime startOfDay,
                               @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.isPs5ProEnhanced = true")
    long countPs5ProEnhancedDeals();

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.inCatalog = true")
    long countInCatalogDeals();

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.isPlusExclusive = true AND g.discountRate > 0")
    long countPlusExclusiveDeals();

    @Query("SELECT new com.pstracker.catalog_service.catalog.dto.GameIdMappingDto(g.psStoreId, g.id) " +
            "FROM Game g WHERE g.psStoreId IN :psStoreIds")
    List<GameIdMappingDto> findGameIdsByPsStoreIds(@Param("psStoreIds") List<String> psStoreIds);

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.hltbMainStory > 0 AND g.hltbMainStory <= 10")
    long countShortPlayTimeGames();

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.hltbMainStory > 10 AND g.hltbMainStory <= 30")
    long countMediumPlayTimeGames();

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.hltbMainStory > 30 AND g.hltbMainStory <= 100")
    long countLongPlayTimeGames();

    @Query("SELECT COUNT(g.id) FROM Game g WHERE g.hltbMainStory > 100")
    long countEpicPlayTimeGames();
}
