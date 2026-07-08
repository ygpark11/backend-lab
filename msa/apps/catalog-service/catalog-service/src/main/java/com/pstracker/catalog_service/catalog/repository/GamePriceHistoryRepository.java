package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GamePriceHistoryRepository extends JpaRepository<GamePriceHistory, Long> {
    // 특정 게임의 가장 최근 가격 이력 1건 조회

    /**
     * 특정 게임의 가장 최근 가격 이력 1건 조회
     * @param game 게임 엔티티
     * @return 가장 최근의 GamePriceHistory 객체 (없을 경우 Optional.empty() 반환)
     */
    Optional<GamePriceHistory> findTopByGameOrderByCreatedAtDesc(Game game);

    /**
     * 특정 게임의 모든 가격 이력을 기록일자 오름차순으로 조회
     * @param gameId 게임 ID
     * @return 가격 이력 리스트
     */
    @Query("SELECT h FROM GamePriceHistory h WHERE h.game.id = :gameId ORDER BY h.createdAt ASC")
    List<GamePriceHistory> findAllByGameIdOrderByCreatedAtAsc(Long gameId);

    @Query("SELECT h.game.id, COUNT(h) FROM GamePriceHistory h WHERE h.game.id IN :gameIds GROUP BY h.game.id")
    List<Object[]> countGroupByGameId(@Param("gameIds") List<Long> gameIds);
}
