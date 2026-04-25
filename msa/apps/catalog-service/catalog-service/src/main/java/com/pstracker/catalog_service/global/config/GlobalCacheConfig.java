package com.pstracker.catalog_service.global.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.cache.CaffeineCacheMetrics;
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
    public static final String INSIGHT_KEY_CLOSING_SOON = "'closingSoon'";
    public static final String INSIGHT_KEY_NEW_DISCOUNT = "'newDiscount'";

    @Bean
    public CacheManager cacheManager(MeterRegistry meterRegistry) {
        // 네이티브 Caffeine Cache를 먼저 생성 후 Micrometer에 수동 등록
        // SimpleCacheManager는 CaffeineCacheManager와 달리 자동 메트릭 바인딩 미지원 → 직접 등록 필요

        // 1. 게임 상세 캐시 (전체 게임 수 ~2,000개 기준, 1GB 서버 메모리 고려)
        Cache<Object, Object> gameDetailNative = Caffeine.newBuilder()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maximumSize(2_000)
                .recordStats()
                .build();
        CaffeineCacheMetrics.monitor(meterRegistry, gameDetailNative, GAME_DETAIL_CACHE);
        CaffeineCache gameDetailCache = new CaffeineCache(GAME_DETAIL_CACHE, gameDetailNative);

        // 2. 인사이트 통계 캐시
        Cache<Object, Object> insightsNative = Caffeine.newBuilder()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maximumSize(50)
                .recordStats()
                .build();
        CaffeineCacheMetrics.monitor(meterRegistry, insightsNative, INSIGHTS_CACHE);
        CaffeineCache insightsCache = new CaffeineCache(INSIGHTS_CACHE, insightsNative);

        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(gameDetailCache, insightsCache));
        return manager;
    }
}
