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
import org.springframework.core.Ordered;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching(order = Ordered.HIGHEST_PRECEDENCE)
public class GlobalCacheConfig {

    public static final String GAME_DETAIL_CACHE = "gameDetailCache";
    public static final String INSIGHTS_CACHE = "insightsCache";
    public static final String CURATION_CACHE = "curationCache";
    public static final String PS_PLUS_PRICING_CACHE = "psPlusPricingCache";

    public static final String INSIGHT_KEY_SUMMARY = "'summary'";

    public static final String TRENDING_CACHE = "trendingCache";
    public static final String TRENDING_KEY_TOP_GAMES = "'trendingTopGames'";

    @Bean
    public CacheManager cacheManager(MeterRegistry meterRegistry) {
        // 1. 게임 상세 캐시 (전체 카탈로그 및 신규 수집 증가 여유분 반영)
        Cache<Object, Object> gameDetailNative = Caffeine.newBuilder()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maximumSize(5_000)
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

        // 3. PS Plus 구독 가격 캐시 (단일 항목, 가격 변경 시 또는 일배치 완료 시 초기화)
        Cache<Object, Object> psPlusPricingNative = Caffeine.newBuilder()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maximumSize(1)
                .recordStats()
                .build();
        CaffeineCacheMetrics.monitor(meterRegistry, psPlusPricingNative, PS_PLUS_PRICING_CACHE);
        CaffeineCache psPlusPricingCache = new CaffeineCache(PS_PLUS_PRICING_CACHE, psPlusPricingNative);

        // 4. 큐레이션 테마 미리보기 캐시 (테마 20개 고정, 일배치 완료 시 초기화)
        Cache<Object, Object> curationNative = Caffeine.newBuilder()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maximumSize(30)
                .recordStats()
                .build();
        CaffeineCacheMetrics.monitor(meterRegistry, curationNative, CURATION_CACHE);
        CaffeineCache curationCache = new CaffeineCache(CURATION_CACHE, curationNative);

        // 5. 트렌딩(찜 TOP N) 캐시 (1시간 TTL — 찜 변화에 빠르게 반응)
        Cache<Object, Object> trendingNative = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.HOURS)
                .maximumSize(1)
                .recordStats()
                .build();
        CaffeineCacheMetrics.monitor(meterRegistry, trendingNative, TRENDING_CACHE);
        CaffeineCache trendingCache = new CaffeineCache(TRENDING_CACHE, trendingNative);

        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(gameDetailCache, insightsCache, psPlusPricingCache, curationCache, trendingCache));
        return manager;
    }
}
