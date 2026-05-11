package com.pstracker.catalog_service.subscription.repository;

import com.pstracker.catalog_service.subscription.domain.PsPlusMonthlyHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PsPlusMonthlyHistoryRepository extends JpaRepository<PsPlusMonthlyHistory, Long>, PsPlusMonthlyHistoryRepositoryCustom {
    Optional<PsPlusMonthlyHistory> findFirstByOrderByTargetMonthDesc();

    @Query("SELECT p.psStoreId FROM PsPlusMonthlyHistory p WHERE p.targetMonth = :targetMonth")
    List<String> findPsStoreIdsByTargetMonth(@Param("targetMonth") String targetMonth);
}
