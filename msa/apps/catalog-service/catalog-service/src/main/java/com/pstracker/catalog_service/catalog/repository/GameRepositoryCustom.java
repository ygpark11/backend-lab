package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.GameInsightStats;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResponse;
import com.pstracker.catalog_service.catalog.dto.GameSuggestResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface GameRepositoryCustom {
    Page<GameSearchResponse> searchGames(GameSearchCondition condition, Pageable pageable);

    List<GameSearchResponse> findRelatedGames(List<Long> genreIds, Long excludeGameId, int limit);

    GameInsightStats fetchGameInsightStats(LocalDate today, LocalDate tomorrow);

    List<GameSuggestResponse> suggestByName(String keyword, int limit);
}
