package com.example.user_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 보호 비활성화 (Stateless JWT 사용 시 불필요)
                .csrf(AbstractHttpConfigurer::disable)
                // 2. 세션 관리 정책: Stateless (세션 사용 안 함)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 3. HTTP 요청 권한 설정
                .authorizeHttpRequests(authorize -> authorize
                                // 임시로 모든 요청을 허용
                                .anyRequest().permitAll()
                        // 임시 주석
                        /*// 로그인 API는 누구나 접근 가능
                        .requestMatchers("/login").permitAll()
                        // RabbitMQ 테스트 API도 임시로 허용
                        .requestMatchers("/test-mq/**").permitAll()
                        // Actuator 엔드포인트는 상태 확인 등을 위해 필요할 수 있음 (선택 사항)
                        .requestMatchers("/actuator/**").permitAll()
                        // 그 외 모든 요청은 인증 필요
                        .anyRequest().authenticated()*/
                );
        // 4. (추가) 게이트웨이가 추가한 헤더를 신뢰하도록 설정하는 부분
        //    -> 여기서는 간단하게 모든 요청을 허용하고, 컨트롤러에서 Principal을 통해 확인

        return http.build();
    }
}
