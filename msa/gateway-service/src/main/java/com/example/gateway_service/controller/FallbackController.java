package com.example.gateway_service.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class FallbackController {

    @GetMapping("/fallback/user")
    public Mono<String> userServiceFallback() {
        return Mono.just("죄송합니다. 현재 사용자 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
}
