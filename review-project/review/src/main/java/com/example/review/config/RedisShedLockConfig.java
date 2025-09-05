package com.example.review.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.redis.spring.RedisLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling // 스프링 스케줄러 활성화
@EnableSchedulerLock(defaultLockAtMostFor = "PT30S") // shedlock 활성화 및 기본 잠금 시간 설정
public class RedisShedLockConfig {

    // ShedLock이 Redis를 락 저장소로 사용하도록 설정하는 Bean
    @Bean
    public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
        return new RedisLockProvider(connectionFactory);
    }
}
