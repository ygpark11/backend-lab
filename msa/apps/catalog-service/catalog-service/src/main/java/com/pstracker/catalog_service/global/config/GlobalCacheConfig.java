package com.pstracker.catalog_service.global.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class GlobalCacheConfig {

    public static final String GAME_DETAIL_CACHE = "gameDetailCache";
    public static final String INSIGHTS_CACHE = "insightsCache";

    public static final String INSIGHT_KEY_ALL_TIME_LOW = "'allTimeLow'";
    public static final String INSIGHT_KEY_MUST_PLAY = "'mustPlay'";
    public static final String INSIGHT_KEY_TOTAL_TRACKED = "'totalTracked'";
    public static final String INSIGHT_KEY_DISCOUNT_SUMMARY = "'discountSummary'";
    public static final String INSIGHT_KEY_LAST_SYNC = "'lastSync'";
    public static final String INSIGHT_KEY_TOTAL_WISHED = "'totalWished'";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager simpleCacheManager = new SimpleCacheManager();

        // 1. 게임 상세 캐시
        CaffeineCache gameDetailCache = new CaffeineCache(GAME_DETAIL_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(24, TimeUnit.HOURS)
                        .maximumSize(1_000)
                        .recordStats()
                        .build());

        // 2. 인사이트 통계 캐시
        CaffeineCache insightsCache = new CaffeineCache(INSIGHTS_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(24, TimeUnit.HOURS)
                        .maximumSize(50)
                        .recordStats()
                        .build());

        simpleCacheManager.setCaches(
                List.of(gameDetailCache, insightsCache)
        );
        return simpleCacheManager;
    }
}
