package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GamePriceHistoryRepository extends JpaRepository<GamePriceHistory, Long> {
}
