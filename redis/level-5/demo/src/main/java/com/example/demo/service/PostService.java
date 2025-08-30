package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class PostService {

    // 이 메서드는 실행에 3초가 걸린다고 가정한다.
    @Cacheable(value = "popularPosts") // "popularPosts"라는 이름으로 결과를 캐싱
    public List<String> getPopularPosts() {
        log.info("DB에서 인기 게시물을 조회합니다... (3초 소요)");
        try {
            Thread.sleep(3_000); // 3초 대기
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return List.of("1위: Redis 마스터하기", "2위: Docker 완전 정복", "3위: Spring Boot 핵심 가이드");
    }
}
