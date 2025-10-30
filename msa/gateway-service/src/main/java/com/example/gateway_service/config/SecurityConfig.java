package com.example.gateway_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity; // WebFlux용
import org.springframework.security.config.web.server.ServerHttpSecurity; // WebFlux용
import org.springframework.security.web.server.SecurityWebFilterChain; // WebFlux용

@Configuration
@EnableWebFluxSecurity // ★★★ WebFlux 기반 Security 활성화
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
                // 1. CSRF 보호 비활성화
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                // ★★★ 기본 응답 보안 헤더 비활성화 추가 ★★★
                .headers(headers -> headers
                                .frameOptions(ServerHttpSecurity.HeaderSpec.FrameOptionsSpec::disable) // X-Frame-Options 비활성화
                                .cache(ServerHttpSecurity.HeaderSpec.CacheSpec::disable) // Cache-Control, Pragma, Expires 비활성화 (필요시)
                        // 다른 헤더들도 필요에 따라 비활성화 가능 (hsts, contentTypeOptions 등)
                )
                // 2. ★★★ 모든 요청 허용 ★★★
                .authorizeExchange(exchange -> exchange
                        .anyExchange().permitAll() // 모든 경로에 대해 인증 요구하지 않음
                );

        return http.build();
    }
}
