package com.example.reactive_practice.service;

import com.example.reactive_practice.event.CommentEventBus;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.scheduler.Schedulers;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final CommentEventBus commentEventBus;

    // 1. 애플리케이션 시작 후, 이벤트 스트림을 구독 시작
    @PostConstruct
    public void subscribeToEvents() {
        commentEventBus.getEventStream()
                .publishOn(Schedulers.boundedElastic()) // 2. 별도의 스레드에서 알림 처리
                .subscribe(comment -> {
                    log.info("📬 [알림 서비스] '{}' 댓글 감지! 알림 발송 시작...", comment.getContent());
                    try {
                        // 3. 알림 발송에 1초가 걸린다고 가정
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    log.info("✅ [알림 서비스] 게시물 작성자에게 알림 발송 완료!");
                });
    }
}
