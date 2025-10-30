package com.example.order_service.controller;

import com.example.order_service.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/user/{userId}/product/{productId}")
    public Mono<ResponseEntity<String>> createOrder(
            @PathVariable String userId,
            @PathVariable String productId,
            Principal principal // ★★★ 인증된 사용자 정보 주입
    ) {

        log.info("[CTRL] Enter userId={}, principal={}", userId, principal != null ? principal.getName() : "null");

        // (선택적 인가) 자신의 주문만 생성 가능하도록 체크 (user-service와 유사)
        String authenticatedUserId = principal.getName();
        if (!userId.equals(authenticatedUserId)) {
            log.info("[CTRL] Forbidden branch userId={}, principal={}", userId, authenticatedUserId);
            return Mono.just(ResponseEntity.status(HttpStatus.FORBIDDEN).body("자신의 주문만 생성할 수 있습니다."));
        }

        return orderService.createOrder(userId, productId, authenticatedUserId)
                .map(ResponseEntity::ok) // 성공 시 200 OK 와 결과 문자열 반환
                .onErrorResume(e -> {
                    log.error("[CTRL] Error", e);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body("주문 생성 중 오류 발생: " + e.getMessage()));
                }); // 실패 시 500 에러 반환
    }
}
