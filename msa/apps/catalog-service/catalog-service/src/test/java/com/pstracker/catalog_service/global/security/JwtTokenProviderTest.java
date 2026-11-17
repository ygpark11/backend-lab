package com.pstracker.catalog_service.global.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String TEST_SECRET = Base64.getEncoder().encodeToString(
            "test-jwt-secret-key-must-be-at-least-32-bytes-long!".getBytes(StandardCharsets.UTF_8)
    );
    private static final String OTHER_SECRET = Base64.getEncoder().encodeToString(
            "other-jwt-secret-key-must-be-at-least-32-bytes-long!".getBytes(StandardCharsets.UTF_8)
    );

    private JwtTokenProvider jwtTokenProvider;
    private Authentication sampleAuth;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(TEST_SECRET, 3_600_000L, 1_209_600_000L);
        MemberPrincipal principal = new MemberPrincipal(42L, "user@test.com", "USER");
        sampleAuth = new UsernamePasswordAuthenticationToken(principal, "", principal.getAuthorities());
    }

    @Test
    @DisplayName("생성된 Access/Refresh 토큰은 각자의 검증 메서드만 통과하고 서로 혼용될 수 없다")
    void generateToken_enforcesTokenType() {
        JwtToken token = jwtTokenProvider.generateToken(sampleAuth);

        assertThat(jwtTokenProvider.validateAccessToken(token.getAccessToken())).isTrue();
        assertThat(jwtTokenProvider.validateRefreshToken(token.getRefreshToken())).isTrue();

        // 역할 혼용 차단
        assertThat(jwtTokenProvider.validateAccessToken(token.getRefreshToken())).isFalse();
        assertThat(jwtTokenProvider.validateRefreshToken(token.getAccessToken())).isFalse();
    }

    @Test
    @DisplayName("다른 키로 서명되거나 변조된 JWT는 예외를 던지지 않고 false 를 반환한다")
    void validateToken_wrongSignature_returnsFalseInsteadOfThrowing() {
        JwtTokenProvider otherProvider = new JwtTokenProvider(OTHER_SECRET, 3_600_000L, 1_209_600_000L);
        JwtToken forgedToken = otherProvider.generateToken(sampleAuth);

        assertThat(jwtTokenProvider.validateToken(forgedToken.getAccessToken())).isFalse();
        assertThat(jwtTokenProvider.validateAccessToken(forgedToken.getAccessToken())).isFalse();
        assertThat(jwtTokenProvider.validateRefreshToken(forgedToken.getRefreshToken())).isFalse();
    }

    @Test
    @DisplayName("만료·형식 오류·빈 문자열 토큰은 모두 false 를 반환한다")
    void validateToken_invalidOrExpired_returnsFalse() {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(TEST_SECRET, -1_000L, -1_000L);
        JwtToken expired = expiredProvider.generateToken(sampleAuth);

        assertThat(jwtTokenProvider.validateAccessToken(expired.getAccessToken())).isFalse();
        assertThat(jwtTokenProvider.validateRefreshToken(expired.getRefreshToken())).isFalse();
        assertThat(jwtTokenProvider.validateAccessToken("not.a.jwt")).isFalse();
        assertThat(jwtTokenProvider.validateAccessToken("")).isFalse();
        assertThat(jwtTokenProvider.validateAccessToken(null)).isFalse();
    }

    @Test
    @DisplayName("토큰에서 MemberPrincipal(memberId, email, role)을 DB 조회 없이 복원한다")
    void getAuthentication_restoresPrincipal() {
        JwtToken token = jwtTokenProvider.generateToken(sampleAuth);

        Authentication restored = jwtTokenProvider.getAuthentication(token.getAccessToken());
        MemberPrincipal principal = (MemberPrincipal) restored.getPrincipal();

        assertThat(principal.getMemberId()).isEqualTo(42L);
        assertThat(principal.getUsername()).isEqualTo("user@test.com");
        assertThat(restored.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_USER");
    }
}
