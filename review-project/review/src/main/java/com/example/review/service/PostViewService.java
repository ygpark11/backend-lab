package com.example.review.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostViewService {

    private final StringRedisTemplate redisTemplate;
    private static final String VIEW_COUNT_KEY_PREFIX = "post:view:count:";

    // 1. 조회수를 1 증가시키는 메서드 (API 호출)
    public void incrementViewCount(Long postId) {
        String key = VIEW_COUNT_KEY_PREFIX + postId;
        // INCR 명령어 실행
        redisTemplate.opsForValue().increment(key);
        log.info("게시물 {}의 조회수가 증가했습니다.", postId);
    }

    // 2. Redis의 모든 조회수를 "DB에 저장" 하는 스케줄러 (5분마다 실행)
    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "syncViewCountsToDB", lockAtMostFor = "PT4M50S", lockAtLeastFor = "PT1M")
    public void syncViewCountsToDB() {
        log.info("--- 조회수 DB 동기화 작업 시작 ---");

        // SCAN 옵션을 설정합니다. post:view:count:* 패턴에 맞는 키를 찾습니다.
        ScanOptions options = ScanOptions.scanOptions().match(VIEW_COUNT_KEY_PREFIX + "*").build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            List<String> keys = new ArrayList<>();
            while (cursor.hasNext()) {
                keys.add(cursor.next());
            }

            if (!keys.isEmpty()) {
                for (String key : keys) {
                    String viewCount = redisTemplate.opsForValue().get(key);
                    log.info("DB에 저장 >> {} | 조회수: {}", key, viewCount);
                    // 실제로는 여기서 DB에 업데이트하는 로직이 들어갑니다.
                }
            }
        }

        log.info("--- 조회수 DB 동기화 작업 완료 ---");
    }
}
