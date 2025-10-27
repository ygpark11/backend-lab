package com.example.user_service.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Gateway로부터 전달받은 X-Authenticated-User-ID 헤더를 읽어
 * Spring Security Context에 Authentication 객체를 설정하는 필터.
 */
@Slf4j
public class RequestHeaderAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "X-Authenticated-User-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String userId = request.getHeader(HEADER_NAME);

        if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            log.debug("Request Header Authentication Filter: Found user ID '{}' in header.", userId);

            // 1. 헤더 값으로 Authentication 객체 생성
            //    (여기서는 간단히 USER 권한만 부여. 실제로는 DB 조회 등으로 권한 설정 가능)
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId, // Principal (주체) - 사용자 ID
                    null,   // Credentials (자격 증명) - 헤더 방식이므로 보통 null
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")) // Authorities (권한)
            );

            // 2. SecurityContextHolder에 Authentication 객체 설정
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Authentication object set for user '{}'", userId);

        } else {
            if (userId == null) {
                log.trace("Request Header Authentication Filter: No {} header found.", HEADER_NAME);
            } else {
                log.trace("Request Header Authentication Filter: SecurityContext already contains Authentication.");
            }
        }

        // 3. 다음 필터로 체인 계속
        filterChain.doFilter(request, response);
    }
}
