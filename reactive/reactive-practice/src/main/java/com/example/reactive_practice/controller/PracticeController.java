package com.example.reactive_practice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.Duration;

@RestController
public class PracticeController {

    @GetMapping("/test")
    public Flux<String> test() {
        // 1. 1부터 10까지 숫자를 발행하는 스트림(Flux)을 생성합니다.
        return Flux.range(1, 10)
                // 2. filter 오퍼레이터: 짝수만 통과시킵니다.
                .filter(n -> n % 2 == 0)
                // 3. map 오퍼레이터: 통과된 짝수들을 "결과: 숫자" 형태의 문자열로 변환합니다.
                .delayElements(Duration.ofSeconds(1)) // 각 요소 사이에 1초 지연을 추가합니다.
                .map(n -> "결과: " + n);
    }

    @GetMapping("/test-error")
    public Flux<String> testError() {
        // 1. 1부터 10까지 숫자를 발행하는 스트림(Flux)을 생성합니다.
        return Flux.range(1, 10)
                // 2. filter 오퍼레이터: 짝수만 통과시킵니다.
                .filter(n -> n % 2 == 0)
                // 3. map 오퍼레이터: 통과된 짝수들을 "결과: 숫자" 형태의 문자열로 변환합니다.
                .delayElements(Duration.ofSeconds(1)) // 각 요소 사이에 1초 지연을 추가합니다.
                .map(n -> {
                    if(n == 6) {
                        // 숫자 6을 만나면 강제로 에러를 발생시킵니다.
                        throw new RuntimeException("에러 발생!");
                    }
                    return "결과: " + n;
                })
                .onErrorReturn("에러 발생시 기본값"); // 에러 발생 시 기본값을 반환합니다.
    }

    // 2. merge 예제를 위한 새로운 메소드
    @GetMapping("/test-merge")
    public Flux<String> testMerge() {
        // 스트림 1: 홀수를 1초 간격으로 발행
        Flux<String> oddNumbersStream = Flux.range(1, 5)
                .filter(n -> n % 2 != 0)
                .delayElements(Duration.ofSeconds(1))
                .map(n -> "홀수: " + n);

        // 스트림 2: 짝수를 2초 간격으로 발행
        Flux<String> evenNumbersStream = Flux.range(1, 5)
                .filter(n -> n % 2 == 0)
                .delayElements(Duration.ofSeconds(2))
                .map(n -> "짝수: " + n);

        // 두 스트림을 merge로 합칩니다.
        return Flux.merge(oddNumbersStream, evenNumbersStream);
    }

    @GetMapping("/test-concat")
    public Flux<String> testConcat() {
        // 스트림 1: 홀수를 1초 간격으로 발행
        Flux<String> oddNumbersStream = Flux.range(1, 5)
                .filter(n -> n % 2 != 0)
                .delayElements(Duration.ofSeconds(1))
                .map(n -> "홀수: " + n);

        // 스트림 2: 짝수를 2초 간격으로 발행
        Flux<String> evenNumbersStream = Flux.range(1, 5)
                .filter(n -> n % 2 == 0)
                .delayElements(Duration.ofSeconds(2))
                .map(n -> "짝수: " + n);

        // 두 스트림을 concat으로 합칩니다.
        return Flux.concat(oddNumbersStream, evenNumbersStream);
    }

    @GetMapping("/test-flatmap")
    public Flux<String> testFlatMap() {
        return Flux.just("A", "B", "C") // A, B, C 세 개의 주문서 발행
                .flatMap(order -> {
                    // 각 주문서(order)를 받아서 새로운 스트림(배달 과정)을 생성합니다.
                    // 이 안의 작업은 비동기적으로 실행될 수 있습니다.
                    return Flux.just(order + "-상품1", order + "-상품2")
                            .delayElements(Duration.ofMillis(500));
                });
    }

    @GetMapping("/test-concatmap")
    public Flux<String> testConcatMap() {
        return Flux.just("A", "B", "C") // A, B, C 세 개의 주문서 발행
                .concatMap(order -> {
                    // 각 주문서(order)를 받아서 새로운 스트림(배달 과정)을 생성합니다.
                    return Flux.just(order + "-상품1", order + "-상품2")
                            .delayElements(Duration.ofMillis(500));
                });
    }
}
