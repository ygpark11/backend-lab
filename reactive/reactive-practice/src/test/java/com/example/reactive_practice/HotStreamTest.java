package com.example.reactive_practice;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.ConnectableFlux;
import reactor.core.publisher.Flux;

import java.time.Duration;

@Slf4j
public class HotStreamTest {

    public static void main(String[] args) throws InterruptedException {
        ConnectableFlux<Long> hotFlux = Flux.interval(Duration.ofSeconds(1))
                .take(10)
                .doOnSubscribe(s -> log.info("## 원본 스트림 구독 발생 ##"))
                .publish();

        // A가 먼저 구독
        hotFlux.subscribe(data -> log.info("Subscriber A: {}", data));

        log.info("방송 시작!");
        hotFlux.connect(); // 'On-Air' 버튼 누름

        // B가 3.5초 늦게 참여하는 상황을 시뮬레이션
        Thread.sleep(3500);
        hotFlux.subscribe(data -> log.info("Subscriber B: {}", data));


        // hotFlux 스트림이 완료될 때까지 main 스레드가 대기
        hotFlux.blockLast();

        log.info("방송 종료!");
    }
}
