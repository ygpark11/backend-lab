package com.pstracker.catalog_service.subscription.repository;

import com.pstracker.catalog_service.subscription.domain.PsPlusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PsPlusHistoryRepository extends JpaRepository<PsPlusHistory, Long> {
}
