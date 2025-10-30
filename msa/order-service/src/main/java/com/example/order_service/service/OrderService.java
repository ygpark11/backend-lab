package com.example.order_service.service;

import com.example.order_service.client.UserServiceClient;
import com.example.order_service.dto.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {

    private final UserServiceClient userServiceClient;

    public Mono<String> createOrder(String userId, String productId, String authenticatedUserId) {
        log.info("Creating order for user: {}, product: {}", userId, productId);

        // ★★★ UserServiceClient를 사용하여 user-service API 호출 ★★★
        return userServiceClient.getUserInfo(userId, authenticatedUserId)
                .flatMap(responseEntity -> {
                    // user-service로부터 응답을 성공적으로 받았을 때
                    UserDto userDto = responseEntity.getBody();
                    if (userDto != null) {
                        log.info("User info received: Name={}, Email={}", userDto.getName(), userDto.getEmail());
                        // (실제 로직) 사용자 등급에 따라 할인율 계산 등...
                        String orderResult = String.format("Order created for %s (Grade: ?). Product: %s",
                                userDto.getName(), productId);
                        return Mono.just(orderResult);
                    } else {
                        log.error("User info not found for user ID: {}", userId);
                        return Mono.error(new RuntimeException("User not found"));
                    }
                })
                .onErrorResume(e -> {
                    // user-service 호출 실패 시 (예: 서킷 브레이커 동작, 4xx/5xx 에러 등)
                    log.error("Failed to call user-service for user ID: {}", userId, e);
                    return Mono.error(new RuntimeException("Failed to retrieve user information"));
                });
    }
}
