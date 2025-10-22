package com.example.gateway_service.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

@Component
@Slf4j
public class AuthenticationHeaderFilter extends AbstractGatewayFilterFactory<AuthenticationHeaderFilter.Config> {

    private final SecretKey jwtSecretKey;

    // ★★★ 생성자: yml에서 비밀키 주입 ★★★
    public AuthenticationHeaderFilter(@Value("${token.secret}") String secret) {
        super(Config.class); // Config 클래스가 필요 없어도 부모 생성자 호출
        this.jwtSecretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // 이 필터는 설정 클래스가 필요 없으므로 비워둡니다.
    public static class Config {
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. Authorization 헤더가 있는지 확인
            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange, "No Authorization header", HttpStatus.UNAUTHORIZED);
            }

            // 2. 헤더에서 토큰 추출 (Bearer 접두사 제거)
            String authorizationHeader = Objects.requireNonNull(request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                return onError(exchange, "Authorization header is invalid", HttpStatus.UNAUTHORIZED);
            }
            String jwt = authorizationHeader.substring(7); // "Bearer " 7글자 제거

            // 3. ★★★ JWT 검증 (핵심) ★★★
            if (!isJwtValid(jwt)) {
                return onError(exchange, "JWT token is not valid", HttpStatus.UNAUTHORIZED);
            }

            // 4. 검증 성공: 다음 필터로 진행
            log.info("JWT validation successful.");
            return chain.filter(exchange);
        };
    }

    // JWT를 파싱하고 서명을 검증하는 메서드
    private boolean isJwtValid(String jwt) {
        try {
            // Jwts.parser()가 Deprecated 되어 Jwts.parser() 사용
            // build() 메서드가 Deprecated 되어 verifyWith() 사용
            Jwts.parser()
                    .verifyWith(jwtSecretKey) // 1. 비밀키로 서명 검증
                    .build()
                    .parseSignedClaims(jwt); // 2. 토큰 파싱 (실패 시 예외 발생)

            return true; // 검증 성공

        } catch (Exception e) {
            log.error("JWT validation failed: {}", e.getMessage());
            return false; // 검증 실패
        }
    }

    // 에러 발생 시 공통 응답 처리
    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        log.error(err);
        exchange.getResponse().setStatusCode(httpStatus);
        return exchange.getResponse().setComplete();
    }
}