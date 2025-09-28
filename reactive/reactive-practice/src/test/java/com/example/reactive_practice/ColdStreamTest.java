package com.example.reactive_practice;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;

@Slf4j
public class ColdStreamTest {

    public static void main(String[] args) throws InterruptedException {
        Flux<Long> coldFlux = Flux.interval(Duration.ofSeconds(1)).take(3);

        coldFlux.subscribe(data -> log.info("Subscriber A: {}", data));

        Thread.sleep(4000); // 4초 후

        coldFlux.subscribe(data -> log.info("Subscriber B: {}", data));

        Thread.sleep(4000);
    }
}
