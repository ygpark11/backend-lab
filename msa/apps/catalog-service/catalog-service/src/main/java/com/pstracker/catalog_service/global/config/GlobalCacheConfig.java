package com.pstracker.catalog_service.global.config;

import com.github.benmanes.caffeine.cache.Cache;
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

    @Bean
    public Cache<Object, Object> caffeineConfig() {
        return Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.HOURS)
                .maximumSize(1_000)
                .recordStats()
                .build();
    }

    @Bean
    public CacheManager cacheManager(Cache<Object, Object> caffeineConfig) {
        SimpleCacheManager simpleCacheManager = new SimpleCacheManager();
        simpleCacheManager.setCaches(
                List.of(new CaffeineCache(GAME_DETAIL_CACHE, caffeineConfig))
        );
        return simpleCacheManager;
    }
}
