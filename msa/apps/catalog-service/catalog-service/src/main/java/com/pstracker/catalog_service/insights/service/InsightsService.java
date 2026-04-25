package com.pstracker.catalog_service.insights.service;

import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.insights.dto.DiscountSummaryDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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
    public DiscountSummaryDto getDiscountSummary() {
        long totalDiscounted = gameRepository.countTotalDiscountedGames();
        Long dbTotalAmount = gameRepository.sumTotalDiscountAmount();
        long actualTotalAmount = (dbTotalAmount != null) ? dbTotalAmount : 0L;
        return new DiscountSummaryDto(totalDiscounted, actualTotalAmount);
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
}
