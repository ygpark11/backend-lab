package com.pstracker.catalog_service.insights.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.GameInsightStats;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.event.BatchCompletedEvent;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import com.pstracker.catalog_service.insights.dto.InsightsSummaryResponse;
import com.pstracker.catalog_service.insights.dto.TrendingGameResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.pstracker.catalog_service.global.config.GlobalCacheConfig.INSIGHTS_CACHE;
import static com.pstracker.catalog_service.global.config.GlobalCacheConfig.INSIGHT_KEY_SUMMARY;
import static com.pstracker.catalog_service.global.config.GlobalCacheConfig.TRENDING_CACHE;
import static com.pstracker.catalog_service.global.config.GlobalCacheConfig.TRENDING_KEY_TOP_GAMES;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InsightsService {

    private final GameRepository gameRepository;
    private final WishlistRepository wishlistRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final CacheManager cacheManager;

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_SUMMARY)
    public InsightsSummaryResponse getInsightsSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        GameInsightStats gameStats = gameRepository.fetchGameInsightStats(today, today.plusDays(1));
        long totalWishlistCount = wishlistRepository.count();
        long newDiscountCount = gameRepository.countNewDiscountGames(startOfDay, endOfDay);

        return InsightsSummaryResponse.of(gameStats, totalWishlistCount, newDiscountCount);
    }

    @EventListener
    public void onBatchCompleted(BatchCompletedEvent event) {
        refreshInsightsCache();
    }

    public void refreshInsightsCache() {
        var cache = cacheManager.getCache(INSIGHTS_CACHE);
        if (cache != null) {
            cache.clear();
            log.info("Insights 로컬 캐시(Caffeine) 전체 초기화 완료.");
        }
    }

    public void refreshTrendingCache() {
        var cache = cacheManager.getCache(TRENDING_CACHE);
        if (cache != null) {
            cache.clear();
            log.info("Trending 로컬 캐시(Caffeine) 전체 초기화 완료.");
        }
    }

    @Cacheable(cacheNames = TRENDING_CACHE, key = TRENDING_KEY_TOP_GAMES)
    public List<TrendingGameResponse> getTrendingGames() {
        List<Long> topGameIds = wishlistRepository.findTopGameIdsByWishlistCount(PageRequest.of(0, 20));
        if (topGameIds.isEmpty()) return List.of();

        Map<Long, Game> gameMap = gameRepository.findAllById(topGameIds).stream()
                .collect(Collectors.toMap(Game::getId, g -> g));

        Map<Long, Integer> historyCountMap = priceHistoryRepository.countMapByGameIds(topGameIds);

        List<TrendingGameResponse> result = new ArrayList<>();
        for (int i = 0; i < topGameIds.size(); i++) {
            Game game = gameMap.get(topGameIds.get(i));
            if (game == null) continue;
            int historySize = historyCountMap.getOrDefault(game.getId(), 0);
            PriceVerdict verdict = PriceVerdictCalculator.forGame(
                    game.getCurrentPrice(), game.getOriginalPrice(), game.getAllTimeLowPrice(), historySize);
            result.add(new TrendingGameResponse(
                    i + 1,
                    game.getId(),
                    game.getName(),
                    game.getImageUrl(),
                    game.getCurrentPrice(),
                    game.getDiscountRate(),
                    verdict.name()
            ));
        }
        return result;
    }
}
