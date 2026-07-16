package com.pstracker.catalog_service.insights.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.insights.dto.TrendingGameResponse;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import com.pstracker.catalog_service.insights.dto.DiscountSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
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

import static com.pstracker.catalog_service.global.config.GlobalCacheConfig.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InsightsService {

    private final GameRepository gameRepository;
    private final WishlistRepository wishlistRepository;
    private final CacheManager cacheManager;

    /**
     * 역대 최저가 타이틀 수 조회
     * @return 역대 최저가 타이틀 수
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_ALL_TIME_LOW)
    public long getAllTimeLowCount() {
        return gameRepository.countAllTimeLowGamesFast();
    }

    /**
     * 머스트 플레이 타이틀 수 조회
     * @return 머스트 플레이 타이틀 수
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_MUST_PLAY)
    public long getMustPlayCount() {
        return gameRepository.countMustPlayGames();
    }

    /**
     * 총 트래킹 타이틀 수 조회
     * @return 총 트래킹 타이틀 수
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_TOTAL_TRACKED)
    public long getTotalTrackedCount() {
        return gameRepository.count();
    }

    /**
     * 할인 요약 정보 조회
     * @return 할인 요약 정보 (총 할인 타이틀 수, 총 할인 금액 등)
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_DISCOUNT_SUMMARY)
    public DiscountSummaryResponse getDiscountSummary() {
        long totalDiscounted = gameRepository.countTotalDiscountedGames();
        Long dbTotalAmount = gameRepository.sumTotalDiscountAmount();
        long actualTotalAmount = (dbTotalAmount != null) ? dbTotalAmount : 0L;
        return new DiscountSummaryResponse(totalDiscounted, actualTotalAmount);
    }

    /**
     * 인사이트 캐시 초기화 (관리자 기능 + 배치 스케줄러 종료 후 호출)
     */
    public void refreshInsightsCache() {
        var cache = cacheManager.getCache(INSIGHTS_CACHE);
        if (cache != null) {
            cache.clear();
            log.info("Insights 로컬 캐시(Caffeine) 전체 초기화 완료.");
        }
    }

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_LAST_SYNC)
    public String getLastSyncTime() {
        LocalDateTime lastUpdateTime = gameRepository.findLatestUpdateDateTime();
        return lastUpdateTime != null ? lastUpdateTime.toString() : "기록 없음";
    }

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_TOTAL_WISHED)
    public long getTotalWishlistCount() {
        return wishlistRepository.count();
    }

    /**
     * 마감 임박(오늘 또는 내일 할인 종료) 게임 수 조회
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_CLOSING_SOON)
    public long getClosingSoonCount() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        return gameRepository.countClosingSoonGames(tomorrow);
    }

    /**
     * 오늘 새롭게 할인이 시작된 게임 수 조회
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_NEW_DISCOUNT)
    public long getNewDiscountCount() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return gameRepository.countNewDiscountGames(startOfDay, endOfDay);
    }

    /**
     * 할인 중인 PS5 Pro 향상 게임 수 조회
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_PS5_PRO)
    public long getPs5ProEnhancedCount() {
        return gameRepository.countPs5ProEnhancedDeals();
    }

    /**
     * 할인 중인 스페셜 카탈로그 게임 수 조회
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_IN_CATALOG)
    public long getInCatalogCount() {
        return gameRepository.countInCatalogDeals();
    }

    /**
     * PLUS 전용 할인 게임 수 조회
     */
    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_PLUS_EXCLUSIVE)
    public long getPlusExclusiveCount() {
        return gameRepository.countPlusExclusiveDeals();
    }

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_PT_SHORT)
    public long getShortPlayTimeCount() {
        return gameRepository.countShortPlayTimeGames();
    }

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_PT_MEDIUM)
    public long getMediumPlayTimeCount() {
        return gameRepository.countMediumPlayTimeGames();
    }

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_PT_LONG)
    public long getLongPlayTimeCount() {
        return gameRepository.countLongPlayTimeGames();
    }

    @Cacheable(cacheNames = INSIGHTS_CACHE, key = INSIGHT_KEY_PT_EPIC)
    public long getEpicPlayTimeCount() {
        return gameRepository.countEpicPlayTimeGames();
    }

    @Cacheable(cacheNames = TRENDING_CACHE, key = TRENDING_KEY_TOP_GAMES)
    public List<TrendingGameResponse> getTrendingGames() {
        List<Long> topGameIds = wishlistRepository.findTopGameIdsByWishlistCount(PageRequest.of(0, 20));
        if (topGameIds.isEmpty()) return List.of();

        Map<Long, Game> gameMap = gameRepository.findAllById(topGameIds).stream()
                .collect(Collectors.toMap(Game::getId, g -> g));

        List<TrendingGameResponse> result = new ArrayList<>();
        for (int i = 0; i < topGameIds.size(); i++) {
            Game game = gameMap.get(topGameIds.get(i));
            if (game == null) continue;
            PriceVerdict verdict = PriceVerdictCalculator.forGame(
                    game.getCurrentPrice(), game.getOriginalPrice(), game.getAllTimeLowPrice(), 5);
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
