package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByPsStoreId(String psStoreId);

    /**
     * [수집 3원칙 - 기간 존중 & 망루 감시]
     * 갱신이 필요한 게임 목록을 조회
     *
     * 조건 1: 마지막 갱신일(lastUpdated)이 기준일(threshold)보다 오래된 경우 (너무 오래된 데이터 갱신)
     * 조건 2: OR (최신 가격 정보의 saleEndDate가 오늘보다 이전인 경우 -> 할인 끝났으니 정가 복귀 확인 필요)
     *
     * 성능: limit을 걸어 한 번에 너무 많은 데이터를 수집하지 않도록 조절
     */
    @Query("SELECT g FROM Game g " +
            "LEFT JOIN g.priceHistories ph " +
            "WHERE g.lastUpdated < :threshold " +
            "OR (ph.saleEndDate < :today AND ph.saleEndDate IS NOT NULL) " +
            "ORDER BY g.lastUpdated ASC")
    List<Game> findGamesToUpdate(@Param("threshold") LocalDateTime threshold,
                                 @Param("today") LocalDate today);
}
