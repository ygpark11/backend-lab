package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.GameHistoryCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public interface GamePriceHistoryRepository extends JpaRepository<GamePriceHistory, Long> {

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM GamePriceHistory h WHERE h.game.id IN :gameIds")
    void deleteByGameIds(@Param("gameIds") List<Long> gameIds);

    Optional<GamePriceHistory> findTopByGameOrderByCreatedAtDesc(Game game);

    @Query("SELECT h FROM GamePriceHistory h WHERE h.game.id = :gameId ORDER BY h.createdAt ASC")
    List<GamePriceHistory> findAllByGameIdOrderByCreatedAtAsc(Long gameId);

    @Query("SELECT new com.pstracker.catalog_service.catalog.dto.GameHistoryCount(h.game.id, COUNT(h)) " +
            "FROM GamePriceHistory h WHERE h.game.id IN :gameIds GROUP BY h.game.id")
    List<GameHistoryCount> countGroupByGameId(@Param("gameIds") List<Long> gameIds);

    default Map<Long, Integer> countMapByGameIds(List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) {
            return Map.of();
        }
        return countGroupByGameId(gameIds).stream()
                .collect(Collectors.toMap(
                        GameHistoryCount::gameId,
                        item -> Math.toIntExact(item.count())
                ));
    }
}
