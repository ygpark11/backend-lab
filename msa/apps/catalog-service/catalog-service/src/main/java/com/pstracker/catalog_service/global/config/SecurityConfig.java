package com.pstracker.catalog_service.global.config;

import com.pstracker.catalog_service.global.security.JwtAuthenticationFilter;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 비활성화
                .csrf(AbstractHttpConfigurer::disable)

                // 2. 세션 정책 설정 (Stateless)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 3. HTTP Basic & Form Login 비활성화
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)

                // 4. 요청별 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // 인증 없이 접근 허용
                        .requestMatchers(
                                "/api/v1/games/**",
                                "/api/v1/members/login",
                                "/api/v1/members/signup",
                                "/favicon.ico",
                                "/error"
                        ).permitAll()
                        // 관리자 전용 (수동 크롤링)
                        .requestMatchers("/api/v1/games/manual-crawl").hasRole("ADMIN")
                        // 그 외 모든 요청은 인증 필요
                        .anyRequest().authenticated()
                )
                // JWT 필터를 ID/PW 필터 앞에 배치
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}