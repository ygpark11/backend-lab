package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GamePriceHistoryRepository extends JpaRepository<GamePriceHistory, Long> {
    // 특정 게임의 가장 최근 가격 이력 1건 조회
    Optional<GamePriceHistory> findTopByGameOrderByRecordedAtDesc(Game game);
}
