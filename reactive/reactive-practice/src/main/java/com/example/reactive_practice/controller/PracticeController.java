package com.example.reactive_practice.controller;

import com.example.reactive_practice.dto.Post;
import com.example.reactive_practice.dto.PostResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

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
                .bodyToMono(Post.class) // (2) 일단 Post 객체로 변환하고
                .map(post -> new PostResponse(post.getTitle(), post.getBody()));  // (3) map으로 PostResponse 객체로 가공
    }

    @GetMapping("/posts/{id}/error-resume")
    public Mono<Post> getPostOnErrorResume(@PathVariable int id) {
        return webClient.get()
                .uri("/posts/" + id)
                .retrieve()
                .bodyToMono(Post.class)
                .onErrorResume(error -> {
                    // (1) 넘어온 에러가 WebClientResponseException 타입인지 확인
                    if (error instanceof WebClientResponseException) {
                        WebClientResponseException ex = (WebClientResponseException) error;

                        // (2) HTTP 상태 코드로 분기 처리
                        if (ex.getStatusCode() == HttpStatus.NOT_FOUND) { // 404 에러일 경우
                            System.out.println("Error: Post not found (404)");
                            return Mono.just(new Post(id, 0, "Not Found", "The requested post was not found."));
                        }
                    }
                    // (3) 404가 아닌 다른 모든 에러일 경우
                    System.out.println("Error occurred: " + error.getMessage());
                    return Mono.just(new Post(id, 0, "Default Title", "Default Body"));
                });
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

    @GetMapping("/test-retry")
    public Flux<String> testRetry() {
        return Flux.<String>error(new RuntimeException("의도적인 에러 발생!")) // (1)
                .doOnError(error -> System.out.println("Error occurred: " + error.getMessage())) // (2)
                .retry(2); // (3)
    }

    @GetMapping("/test-retry-when")
    public Flux<String> testRetryWhen() {
        return Flux.<String>error(new RuntimeException("의도적인 에러 발생!"))
                .doOnError(error -> System.out.println("Error occurred at: " + java.time.LocalTime.now() + ", " + error.getMessage()))
                .retryWhen(Retry.backoff(2, Duration.ofSeconds(2)) // (1)
                        .doBeforeRetry(retrySignal -> { // (2)
                            System.out.println("Retry attempt #" + (retrySignal.totalRetries() + 1));
                        })
                        .onRetryExhaustedThrow((retryBackoffSpec, retrySignal) -> { // (3)
                            return retrySignal.failure();
                        })
                );
    }

    @GetMapping("/users/details")
    public Flux<String> findUserDetails() {
        return Flux.range(1, 5) // 1~5번 사용자 ID를 순차적으로 조회 시작
                .flatMap(this::findUserDetailsById) // (1) 각 ID로 상세 정보 조회)
                //.flatMap(this::findUserDetailsById, 2) // 동시에 실행될 수를 지정하고 싶으면 두번째 인자로 숫자를 넣기 - 동시에 2개 까지 실행
                .onErrorResume(error -> { // (5)
                    System.out.println("❌ 최종 에러 발생! 대체 응답을 반환합니다. 에러: " + error.getMessage());
                    return Flux.just("죄송합니다. 시스템에 일시적인 장애가 발생했습니다.");
                });
    }

    // 각 사용자의 상세 정보를 조회하는 외부 API 호출을 시뮬레이션하는 메소드
    private Mono<String> findUserDetailsById(long userId) {
        return Mono.defer(() -> {
            if (userId == 3) {
                // 3번 사용자는 데이터에 문제가 있어 항상 실패하는 경우
                return Mono.error(new RuntimeException("InvalidUserDataError"));
            }
            if (userId == 4) {
                // 4번 사용자는 네트워크가 불안정하여 가끔 실패하는 경우 (여기서는 항상 실패하도록 시뮬레이션)
                System.out.println("⏳ 4번 사용자 정보 조회 시도...");
                return Mono.error(new RuntimeException("TemporaryNetworkError"));
            }
            return Mono.just("사용자 정보 조회 성공! [ID: " + userId + "]");
        })
        .onErrorResume(error -> { // (1) 이 블록이 핵심입니다.
            if (error.getMessage().contains("InvalidUserDataError")) {
                System.out.println("‼️ 데이터 처리 불가, 건너뜁니다. ID: " + userId);
                return Mono.empty(); // (2) 파산 대신 '결과 없음'으로 보고하여 메인 스트림을 살립니다.
            }
            return Mono.error(error); // (3) 그 외의 에러는 다시 던져서 retryWhen이 처리하도록 합니다.
        })
        .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                .filter(error -> error.getMessage().contains("TemporaryNetworkError"))
                .doBeforeRetry(retrySignal -> {
                    System.out.println("🔁 네트워크 에러! 재시도를 수행합니다. (시도 횟수: " + (retrySignal.totalRetries() + 1) + ")");
                })
        );
    }

    public static void main(String[] args) {
        Flux.range(1, 5) // 1, 2, 3, 4, 5를 순서대로 발행하는 Flux
                .map(i -> {
                    if (i == 3) {
                        throw new RuntimeException("의도적인 에러 발생! 데이터: " + i);
                    }
                    return "성공적으로 처리된 데이터: " + i;
                })
                .onErrorContinue((error, data) -> {
                    // (1) 에러가 발생했을 때 실행되는 부분
                    System.out.println("문제가 발생했지만 건너뜁니다. 에러: " + error.getMessage() + ", 원인 데이터: " + data);
                })
                .subscribe(result -> System.out.println("최종 소비자에게 전달된 결과: " + result)); // (2)
    }
}
