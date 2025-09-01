package com.example.shedlock.component;

import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@EnableScheduling // (3) 스케줄링 기능 활성화
public class DistributedScheduler {

    @Scheduled(cron = "*/10 * * * * *") // (4) 10초마다 실행
    @SchedulerLock(name = "sendEmailTask", lockAtMostFor = "PT9S", lockAtLeastFor = "PT9S") // (5) 메서드 단위로 락 설정
    public void sendEmailToUsers() {
        log.info("분산 락 성공! 이메일 발송 작업을 시작합니다.");
        // ... 실제 이메일 발송 로직 ...
    }
}
