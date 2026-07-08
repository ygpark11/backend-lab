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
    public static final String CURATION_CACHE = "curationCache";
    public static final String PS_PLUS_PRICING_CACHE = "psPlusPricingCache";

    public static final String INSIGHT_KEY_ALL_TIME_LOW = "'allTimeLow'";
    public static final String INSIGHT_KEY_MUST_PLAY = "'mustPlay'";
    public static final String INSIGHT_KEY_TOTAL_TRACKED = "'totalTracked'";
    public static final String INSIGHT_KEY_DISCOUNT_SUMMARY = "'discountSummary'";
    public static final String INSIGHT_KEY_LAST_SYNC = "'lastSync'";
    public static final String INSIGHT_KEY_TOTAL_WISHED = "'totalWished'";
    public static final String INSIGHT_KEY_CLOSING_SOON = "'closingSoon'";
    public static final String INSIGHT_KEY_NEW_DISCOUNT = "'newDiscount'";
    public static final String INSIGHT_KEY_PS5_PRO = "'insight_ps5_pro'";
    public static final String INSIGHT_KEY_IN_CATALOG = "'insight_in_catalog'";
    public static final String INSIGHT_KEY_PLUS_EXCLUSIVE = "'insight_plus_exclusive'";

    public static final String INSIGHT_KEY_PT_SHORT = "'ptShort'";
    public static final String INSIGHT_KEY_PT_MEDIUM = "'ptMedium'";
    public static final String INSIGHT_KEY_PT_LONG = "'ptLong'";
    public static final String INSIGHT_KEY_PT_EPIC = "'ptEpic'";

    @Bean
    public CacheManager cacheManager(MeterRegistry meterRegistry) {
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

        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(gameDetailCache, insightsCache, psPlusPricingCache, curationCache));
        return manager;
    }
}
