package com.example.reactive_practice;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

@Slf4j
public class BackpressureTest {

    public static void main(String[] args) throws InterruptedException {
        Flux.<Integer>create(sink -> { // 1. 직접 데이터 발행을 제어하는 Flux 생성
                    log.info("요리사: 요리 시작!");
                    for (int i = 1; i <= 50; i++) {
                        log.info("요리사: {}번 요리 완성!", i);
                        sink.next(i); // 2. 소비자의 상태를 묻지 않고 요리를 보냄
                    }
                    sink.complete(); // 3. 요리가 모두 끝났음을 알림
                })
                .onBackpressureBuffer() // 소비자의 소비 속도에 맞춰 소비하도록 테이블에 요리를 쌓아놓는 배압전략
                //.onBackpressureDrop(data -> log.warn("! 요리 버림: {}", data)) // 테이블이 꽉 차면 요리 버림
                //.onBackpressureLatest() // 테이블이 꽉 차면 가장 최근 요리
                .publishOn(Schedulers.single(), 1)
                .subscribe(data -> {
                    log.info("손님: {}번 요리 받음", data);
                    try {
                        Thread.sleep(100); // 손님은 여전히 천천히 먹음
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    log.info("손님: {}번 요리 다 먹음!", data);
                });

        Thread.sleep(5000);
    }
}
