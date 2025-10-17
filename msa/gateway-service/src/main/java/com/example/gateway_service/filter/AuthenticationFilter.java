package com.example.gateway_service.filter;

import com.example.gateway_service.client.UserServiceClient;
import com.example.gateway_service.dto.UserDto;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreaker;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreakerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
@Slf4j
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    private final UserServiceClient userServiceClient;
    private final ReactiveCircuitBreaker circuitBreaker;

    public AuthenticationFilter(@Lazy UserServiceClient userServiceClient, ReactiveCircuitBreakerFactory circuitBreakerFactory) {
        super(Config.class);
        this.userServiceClient = userServiceClient;
        this.circuitBreaker = circuitBreakerFactory.create("user-service-breaker");
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. 요청 헤더에 "X-USER-ID"가 포함되어 있는지 확인
            if (!request.getHeaders().containsKey("X-USER-ID")) {
                return onError(exchange, "No User ID header", HttpStatus.UNAUTHORIZED);
            }

            // 2. 헤더에서 사용자 ID 추출
            String userId = request.getHeaders().get("X-USER-ID").get(0);
            log.info("사용자 ID 헤더 발견: {}", userId);

            return userServiceClient.getUserInfo(userId) // 1. API 호출 계획(Mono) 생성
                    .transform(it -> circuitBreaker.run(it)) // 2. 서킷 브레이커라는 보호막 적용
                    .flatMap(responseEntity -> { // 3. 성공 시에만 실행될 로직
                        log.info("사용자 정보 조회 성공. 응답 상태 코드: {}", responseEntity.getStatusCode());
                        return chain.filter(exchange); // 다음 필터로 체인 계속
                    })
                    .onErrorResume(throwable -> { // 4. 위 과정에서 어떤 에러든 발생하면 실행될 안전망
                        if (throwable instanceof CallNotPermittedException) {
                            log.warn("서킷 브레이커가 열렸습니다. 요청을 차단합니다.");
                        } else {
                            log.error("user-service 호출 중 에러 발생: ", throwable);
                        }
                        return handleFallback(exchange); // Fallback 응답 처리
                    });
        };
    }

    private Mono<Void> handleFallback(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String fallbackMessage = "{\"message\":\"죄송합니다. 사용자 서비스가 현재 응답할 수 없습니다.\"}";
        DataBuffer buffer = response.bufferFactory().wrap(fallbackMessage.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    // 에러 발생 시 응답을 처리하는 헬퍼 메서드
    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        log.error(err);
        return response.setComplete();
    }

    public static class Config {
        // 설정 클래스가 필요하면 여기에 정의
    }

    // OpenFeign 방식 실습 내용
    /*@Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. 요청 헤더에 "X-USER-ID"가 포함되어 있는지 확인
            if (!request.getHeaders().containsKey("X-USER-ID")) {
                return onError(exchange, "No User ID header", HttpStatus.UNAUTHORIZED);
            }

            // 2. 헤더에서 사용자 ID 추출
            String userId = request.getHeaders().get("X-USER-ID").get(0);
            log.info("사용자 ID 헤더 발견: {}", userId);

            // 3. OpenFeign 클라이언트로 user-service 호출
            // ★★★ 핵심: 블로킹 호출을 리액티브 방식으로 전환 ★★★
            return Mono.fromCallable(() -> {
                        log.info("인증 시작: user-service 호출 (별도 스레드에서)");
                        // 이 블록 안의 코드는 블로킹이 허용되는 별도의 스레드에서 실행됩니다.
                        return userServiceClient.getUserInfo(userId);
                    })
                    .subscribeOn(Schedulers.boundedElastic()) // ★★★ 블로킹 I/O 작업을 위한 스레드 풀 지정
                    .flatMap(responseEntity -> {
                        // user-service 호출 성공 후 실행될 로직
                        log.info("사용자 정보 조회 성공. 응답 상태 코드: {}", responseEntity.getStatusCode());
                        return chain.filter(exchange); // 원래의 요청을 다음 필터로 전달
                    })
                    .onErrorResume(e -> {
                        // user-service 호출 실패 시 실행될 로직
                        log.error("user-service 호출 실패: ", e);
                        return onError(exchange, "User service call failed", HttpStatus.INTERNAL_SERVER_ERROR);
                    });
        };
    }*/
}
