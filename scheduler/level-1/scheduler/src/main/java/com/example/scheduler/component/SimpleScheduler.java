package com.example.scheduler.component;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
public class SimpleScheduler {

    // 5초에 한 번씩 실행됩니다.
    @Scheduled(fixedRate = 5_000)
    public void runPeriodically() {
        log.info("fixedRate 스케줄러 실행: {}", LocalDateTime.now());
    }

    // 매 분 10초 마다 실행됩니다. (예: 1:00:10, 1:01:10, 1:02:10, ...)
    @Scheduled(cron = "10 * * * * *")
    public void runAtSpecificTime() {
        log.info("cron 스케줄러 실행: {}", LocalDateTime.now());
    }
}
