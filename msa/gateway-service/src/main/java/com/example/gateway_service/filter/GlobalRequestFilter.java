package com.example.gateway_service.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class GlobalRequestFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // 1. "X-Request-ID" 헤더가 있는지 검사합니다.
        if (!request.getHeaders().containsKey("X-Request-ID")) {
            log.error("[GlobalFilter] ❌ X-Request-ID header is missing!");
            // 2. 헤더가 없으면 요청을 즉시 차단합니다.
            exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return exchange.getResponse().setComplete(); // Mono<Void> 반환
        }

        // 3. 헤더가 있다면, 요청을 계속 진행시킵니다.
        String requestId = request.getHeaders().getFirst("X-Request-ID");
        log.info("[GlobalFilter] ▶ Incoming request: {} {}", request.getMethod(), request.getURI());
        log.info("[GlobalFilter] X-Request-ID = {}", requestId);

        return chain.filter(exchange);
    }

    /**
     * 필터의 실행 순서를 지정합니다.
     * 값이 낮을수록 먼저 실행됩니다.
     * (Ordered.HIGHEST_PRECEDENCE는 맨 처음)
     */
    @Override
    public int getOrder() {
        // return -1; // (X) Spring의 기본 필터들보다 먼저 실행되어 Tracing을 방해
        // TracingWebFilter(-1), SecurityFilter(0) 이후 실행되도록 설정
        return 10;
    }
}
