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
                // 2. ★★★ 모든 요청 허용 ★★★
                .authorizeExchange(exchange -> exchange
                        .anyExchange().permitAll() // 모든 경로에 대해 인증 요구하지 않음
                );

        return http.build();
    }
}
