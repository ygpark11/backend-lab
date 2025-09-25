package com.example.reactive_practice.controller;

import com.example.reactive_practice.dto.Post;
import com.example.reactive_practice.dto.PostResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;

@RestController
public class PracticeController {

    private final WebClient webClient;

    // 생성자를 통해 WebClient Bean을 주입받습니다.
    public PracticeController(WebClient webClient) {
        this.webClient = webClient;
    }

    @GetMapping("/posts/{id}")
    public Mono<PostResponse> getPost(@PathVariable int id) { // (1) 반환 타입 변경
        return webClient.get()
                .uri("/posts/" + id) // baseUrl 뒤에 붙는 경로
                .retrieve() // 응답을 받기 위한 메소드
                .bodyToMono(Post.class) // // (2) 일단 Post 객체로 변환하고
                .map(post -> new PostResponse(post.getTitle(), post.getBody()));  // (3) map으로 PostResponse 객체로 가공
    }

    @GetMapping("/posts/multiple")
    public Mono<String> getMultiplePosts() {
        // API 호출 1: /posts/1 (결과를 Mono<Post>로 받음)
        Mono<Post> post1 = webClient.get()
                .uri("/posts/1")
                .retrieve()
                .bodyToMono(Post.class);

        // API 호출 2: /posts/2 (결과를 Mono<Post>로 받음)
        Mono<Post> post2 = webClient.get()
                .uri("/posts/2")
                .retrieve()
                .bodyToMono(Post.class);

        // (1) 두 Mono 작업이 모두 끝날 때까지 기다렸다가 결과를 합칩니다.
        return Mono.zip(post1, post2)
                .map(tuple -> {
                    // (2) 결과는 Tuple 형태로 전달됩니다. (tuple.getT1(), tuple.getT2())
                    Post p1 = tuple.getT1();
                    Post p2 = tuple.getT2();
                    // (3) 두 Post 객체의 제목을 합쳐서 새로운 문자열로 반환합니다.
                    return "Post 1 Title: " + p1.getTitle() + "\n" +
                            "Post 2 Title: " + p2.getTitle();
                });
    }

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
