package com.pstracker.catalog_service.subscription.repository;

import com.pstracker.catalog_service.subscription.dto.MonthlyGameArchiveResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PsPlusMonthlyHistoryRepositoryCustom {
    Page<MonthlyGameArchiveResponse> findMonthlyArchivePage(Pageable pageable);
}
