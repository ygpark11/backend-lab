package com.example.reactive_practice;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.ConnectableFlux;
import reactor.core.publisher.Flux;

import java.time.Duration;

@Slf4j
public class HotStreamAutoConnectTest {

    public static void main(String[] args) throws InterruptedException {
        Flux<Long> hotFlux = Flux.interval(Duration.ofSeconds(1))
                .take(10)
                .publish()
                .autoConnect(2); // 1. 2명이 구독해야 방송 시작!

        hotFlux.subscribe(data -> log.info("Subscriber A: {}", data));
        log.info("A 구독 완료. 아직 방송은 시작되지 않음.");

        Thread.sleep(2000);

        hotFlux.subscribe(data -> log.info("Subscriber B: {}", data));
        log.info("B 구독 완료. 2명이 모였으므로 방송이 시작됩니다!");


        hotFlux.blockLast();
        log.info("방송 종료!");
    }
}
