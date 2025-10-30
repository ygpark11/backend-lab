package com.example.order_service.config;

import com.example.order_service.filter.RequestHeaderAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        RequestHeaderAuthenticationFilter requestHeaderAuthenticationFilter = new RequestHeaderAuthenticationFilter();

        http
                // 1. CSRF 보호 비활성화 (Stateless JWT 사용 시 불필요)
                .csrf(AbstractHttpConfigurer::disable)
                // 2. 세션 관리 정책: Stateless (세션 사용 안 함)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // ★★★ 커스텀 필터를 UsernamePasswordAuthenticationFilter 앞에 추가 ★★★
                .addFilterBefore(requestHeaderAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // 3. HTTP 요청 권한 설정
                .authorizeHttpRequests(authorize -> authorize
                        // ★★★ Actuator 경로 명시적 허용 ★★★
                        .requestMatchers("/actuator/**").permitAll()
                        // 그 외 모든 요청도 일단 인증 요구 (필요시 조정)
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
