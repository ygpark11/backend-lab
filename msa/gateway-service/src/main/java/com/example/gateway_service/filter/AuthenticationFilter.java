package com.example.gateway_service.filter;

import com.example.gateway_service.client.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    private final UserServiceClient userServiceClient;

    public AuthenticationFilter(@Lazy UserServiceClient userServiceClient) {
        super(Config.class);
        this.userServiceClient = userServiceClient;
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

            // 3. OpenFeign 클라이언트로 user-service 호출
            // ★★★ 핵심: 블로킹 호출을 리액티브 방식으로 전환 ★★★
            /*return Mono.fromCallable(() -> {
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
                    });*/

            // UserServiceClient가 이제 WebClient 기반이므로, 호출 결과가 바로 Mono<T> 타입입니다.
            // 따라서 복잡한 스레드 전환 없이 바로 리액티브 체이닝을 할 수 있습니다.
            return userServiceClient.getUserInfo(userId)
                    .flatMap(responseEntity -> {
                        log.info("사용자 정보 조회 성공 (WebClient). 응답 상태 코드: {}", responseEntity.getStatusCode());
                        return chain.filter(exchange); // 원래 요청을 다음 필터로 전달
                    })
                    .onErrorResume(e -> {
                        log.error("user-service 호출 실패 (WebClient): ", e);
                        return onError(exchange, "User service call failed", HttpStatus.INTERNAL_SERVER_ERROR);
                    });
        };
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
}
