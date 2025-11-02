package com.example.order_service.service;

import com.example.order_service.client.UserServiceClient;
import com.example.order_service.dto.UserDto;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Slf4j
public class OrderService {

    private final UserServiceClient userServiceClient;
    private final CircuitBreaker circuitBreaker;

    public OrderService(UserServiceClient userServiceClient, CircuitBreakerRegistry circuitBreakerRegistry) {
        this.userServiceClient = userServiceClient;
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("user-service-breaker");
    }

    public Mono<String> createOrder(String userId, String productId, String authenticatedUserId) {
        log.info("Creating order for user: {}, product: {}", userId, productId);

        // user-service 호출 결과를 Mono<UserDto>로 변환하는 로직을 분리
        Mono<UserDto> userDtoMono = userServiceClient.getUserInfo(userId, authenticatedUserId)
                .flatMap(responseEntity -> {
                    UserDto userDto = responseEntity.getBody();
                    if (userDto != null) {
                        return Mono.just(userDto);
                    } else {
                        log.error("User info not found for user ID: {}", userId);
                        return Mono.error(new RuntimeException("User not found"));
                    }
                })
                // ★★★ AOP 대신, Mono 스트림에 직접 서킷 브레이커 적용 ★★★
                // this.circuitBreaker 인스턴스가 yml 설정을 읽어서 동작함
                .transformDeferred(CircuitBreakerOperator.of(this.circuitBreaker))
                // ★★★ 스트림 내부의 Fallback 처리 ★★★
                // .transform()이 실패(모든 예외)하면 이 메서드가 실행됨
                .onErrorResume(e -> {
                    log.warn("[Fallback] Order service fallback executed for user: {}. Error: {}",
                            userId, e.getMessage());
                    // Fallback DTO 반환
                    return Mono.just(new UserDto(userId, "Unknown User", "N/A"));
                });

        // userDtoMono는 '정상 UserDto' 또는 'Fallback UserDto'를 갖게 됨
        // 이 Mono를 기반으로 최종 주문 결과 문자열을 생성
        return userDtoMono.map(userDto -> {
            log.info("User info for order: Name={}", userDto.getName());
            return String.format("Order created for %s. Product: %s",
                    userDto.getName(), productId);
        });
    }
}
