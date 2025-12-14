package com.pstracker.catalog_service.global.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.stream.Collectors;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenValidityTime;
    private final long refreshTokenValidityTime;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secretKey,
            @Value("${jwt.expiration.access}") long accessTokenValidityTime,
            @Value("${jwt.expiration.refresh}") long refreshTokenValidityTime
    ) {
        // 비밀키를 디코딩하여 Key 객체로 변환 (HMAC-SHA 알고리즘용)
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenValidityTime = accessTokenValidityTime;
        this.refreshTokenValidityTime = refreshTokenValidityTime;
    }

    /**
     * [토큰 생성]
     * 사용자의 인증 정보(Authentication)를 받아서 Access/Refresh Token을 생성
     */
    public JwtToken generateToken(Authentication authentication) {
        // 권한 가져오기 (ROLE_USER, ROLE_ADMIN 등)
        String authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        long now = (new Date()).getTime();

        // Access Token 생성
        String accessToken = Jwts.builder()
                .subject(authentication.getName())          // payload "sub": "user@email.com"
                .claim("auth", authorities)           // payload "auth": "ROLE_USER"
                .expiration(new Date(now + accessTokenValidityTime)) // 유효기간
                .signWith(key)                              // 서명 (Header + Payload + SecretKey)
                .compact();

        // Refresh Token 생성
        String refreshToken = Jwts.builder()
                .expiration(new Date(now + refreshTokenValidityTime))
                .signWith(key)
                .compact();

        return JwtToken.builder()
                .grantType("Bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    /**
     * [인증 정보 조회]
     * 토큰을 복호화하여 Spring Security가 이해할 수 있는 Authentication 객체를 만들어냄
     * (이 과정 덕분에 DB를 거치지 않고도 "로그인 상태"로 인정받음 -> Stateless)
     */
    public Authentication getAuthentication(String accessToken) {
        // 1. 토큰 복호화
        Claims claims = parseClaims(accessToken);

        if (claims.get("auth") == null) {
            throw new RuntimeException("권한 정보가 없는 토큰입니다.");
        }

        // 2. 클레임에서 권한 정보 가져오기
        Collection<? extends GrantedAuthority> authorities =
                Arrays.stream(claims.get("auth").toString().split(","))
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());

        // 3. UserDetails 객체를 만들어서 Authentication 리턴
        // 검증 단계라 빈 문자열 비밀번호 사용
        UserDetails principal = new User(claims.getSubject(), "", authorities);
        return new UsernamePasswordAuthenticationToken(principal, "", authorities);
    }

    /**
     * [토큰 검증]
     * 토큰이 위조되었거나 만료되지 않았는지 확인
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key) // 비밀키로 서명 검증
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.info("Invalid JWT Token", e);
        } catch (ExpiredJwtException e) {
            log.info("Expired JWT Token", e);
        } catch (UnsupportedJwtException e) {
            log.info("Unsupported JWT Token", e);
        } catch (IllegalArgumentException e) {
            log.info("JWT claims string is empty.", e);
        }
        return false;
    }

    // 토큰 복호화 내부 메서드
    private Claims parseClaims(String accessToken) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(accessToken)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims(); // 만료되어도 정보는 가져옴
        }
    }
}
