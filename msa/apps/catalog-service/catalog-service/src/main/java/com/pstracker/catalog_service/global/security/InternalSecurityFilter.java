package com.pstracker.catalog_service.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
public class InternalSecurityFilter extends OncePerRequestFilter {

    private final String internalSecretKey;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    private final List<String> internalUris = List.of(
            "/api/internal/**",                     // 파이썬 -> 자바 동기화 및 콜백
            "/api/v1/games/batch-complete",         // 캐시 초기화
            "/api/v1/subscriptions/ps-plus/collect" // 구독권 수집
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestUri = request.getRequestURI();

        // 현재 요청이 보호 대상 내부 URI인지 확인
        boolean isInternalUri = internalUris.stream().anyMatch(pattern -> pathMatcher.match(pattern, requestUri));

        if (isInternalUri) {
            // 헤더에서 시크릿 키 추출 및 검증
            String secretHeader = request.getHeader("X-Internal-Secret");

            if (secretHeader == null || !secretHeader.equals(internalSecretKey)) {
                log.warn("비정상적인 내부 API 접근 시도 차단! URI: {}, IP: {}", requestUri, request.getRemoteAddr());
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied");
                return; // 실패 시 필터 체인 즉시 중단 (컨트롤러 진입 불가)
            }
        }

        filterChain.doFilter(request, response);
    }
}
