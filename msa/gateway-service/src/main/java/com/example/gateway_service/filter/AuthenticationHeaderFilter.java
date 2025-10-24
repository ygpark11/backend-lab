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

            // 1. Authorization 헤더 확인 (기존 로직)
            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange, "No Authorization header", HttpStatus.UNAUTHORIZED);
            }

            // 2. 토큰 추출 (기존 로직)
            String authorizationHeader = Objects.requireNonNull(request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
            if (!authorizationHeader.startsWith("Bearer ")) {
                return onError(exchange, "Authorization header is invalid", HttpStatus.UNAUTHORIZED);
            }
            String jwt = authorizationHeader.substring(7);

            // 3. JWT 검증 후 'subject' 추출 (★★★ 로직 변경 ★★★)
            String subject = getSubjectFromJwt(jwt);
            if (subject == null) {
                return onError(exchange, "JWT token is not valid", HttpStatus.UNAUTHORIZED);
            }

            // 4. ★★★ 새로운 헤더를 추가하여 요청 변조 ★★★
            ServerHttpRequest newRequest = request.mutate()
                    .header("X-Authenticated-User-ID", subject) // 신뢰할 수 있는 헤더 추가
                    .build();

            ServerWebExchange newExchange = exchange.mutate()
                    .request(newRequest)
                    .build();

            // 5. 변조된 요청으로 다음 필터 체인 실행
            log.info("JWT validation successful. User ID: {}", subject);
            return chain.filter(newExchange);
        };
    }

    // JWT를 파싱하고 subject를 반환하는 메서드 (isJwtValid를 대체/수정)
    private String getSubjectFromJwt(String jwt) {
        try {
            return Jwts.parser()
                    .verifyWith(jwtSecretKey)
                    .build()
                    .parseSignedClaims(jwt)
                    .getPayload() // Claims 객체 가져오기
                    .getSubject(); // subject (사용자 ID) 반환
        } catch (Exception e) {
            log.error("JWT validation failed: {}", e.getMessage());
            return null; // 검증 실패 시 null 반환
        }
    }

    // 에러 발생 시 공통 응답 처리
    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        log.error(err);
        exchange.getResponse().setStatusCode(httpStatus);
        return exchange.getResponse().setComplete();
    }
}