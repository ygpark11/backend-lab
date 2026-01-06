package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.global.security.AuthConstants;
import com.pstracker.catalog_service.global.security.JwtToken;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.member.dto.MemberLoginDto;
import com.pstracker.catalog_service.member.service.MemberService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final MemberService memberService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${jwt.expiration.access}")
    private long accessTokenValidityTime;

    @Value("${jwt.expiration.refresh}")
    private long refreshTokenValidityTime;

    @Value("${app.auth.cookie-secure}")
    private boolean cookieSecure;

    /**
     * 로그인 API
     */
    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody MemberLoginDto request, HttpServletResponse response) {
        // 1. 서비스 로직은 그대로 사용 (인증 및 토큰 생성)
        JwtToken jwtToken = memberService.login(request);

        // 2. Access Token 쿠키 생성
        ResponseCookie accessTokenCookie = createTokenCookie(AuthConstants.ACCESS_TOKEN, jwtToken.getAccessToken(), accessTokenValidityTime);
        ResponseCookie refreshTokenCookie = createTokenCookie(AuthConstants.REFRESH_TOKEN, jwtToken.getRefreshToken(), refreshTokenValidityTime);

        // 4. 응답 헤더에 설정
        response.addHeader(HttpHeaders.SET_COOKIE, accessTokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());

        return ResponseEntity.ok().build();
    }

    /**
     * 로그아웃 API
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        // Access Token 삭제
        ResponseCookie accessTokenCookie = createTokenCookie(AuthConstants.ACCESS_TOKEN, "", 0);
        ResponseCookie refreshTokenCookie = createTokenCookie(AuthConstants.REFRESH_TOKEN, "", 0);

        response.addHeader(HttpHeaders.SET_COOKIE, accessTokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());

        return ResponseEntity.ok().build();
    }

    /**
     * 토큰 재발급 API
     */
    @PostMapping("/reissue")
    public ResponseEntity<Void> reissue(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = getCookieValue(request, AuthConstants.REFRESH_TOKEN);

        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(401).build();
        }

        Authentication authentication = jwtTokenProvider.getAuthentication(refreshToken);
        JwtToken newTokens = jwtTokenProvider.generateToken(authentication);

        ResponseCookie newAccessTokenCookie = createTokenCookie(AuthConstants.ACCESS_TOKEN, newTokens.getAccessToken(), accessTokenValidityTime);

        response.addHeader(HttpHeaders.SET_COOKIE, newAccessTokenCookie.toString());
        return ResponseEntity.ok().build();
    }

    private ResponseCookie createTokenCookie(String name, String value, long maxAge) {
        // 쿠키 값 인코딩 (공백이나 특수문자 처리)
        String encodedValue = (value == null || value.isEmpty()) ? "" :
                URLEncoder.encode(value, StandardCharsets.UTF_8);

        return ResponseCookie.from(name, encodedValue)
                .path("/")
                .httpOnly(true) // 자바스크립트 접근 불가 (XSS 방지)
                .secure(cookieSecure) // HTTPS 환경에서만 전송 (로컬은 false여야 함)
                .sameSite("Lax") // CSRF 방지, Cross-Origin 허용 여부
                .maxAge(maxAge / 1000)
                .build();
    }

    private String getCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> name.equals(cookie.getName()))
                .map(cookie -> {
                    try {
                        // 쿠키 값 디코딩 (읽을 때 필수)
                        return URLDecoder.decode(cookie.getValue(), StandardCharsets.UTF_8);
                    } catch (Exception e) {
                        return cookie.getValue();
                    }
                })
                .findFirst()
                .orElse(null);
    }
}