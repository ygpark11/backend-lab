package com.pstracker.catalog_service.global.security;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.auth.redirect-uri}")
    private String redirectUri;

    @Value("${jwt.expiration.access}")
    private long accessTokenValidityTime;

    @Value("${jwt.expiration.refresh}")
    private long refreshTokenValidityTime;

    @Value("${app.auth.cookie-secure}")
    private boolean cookieSecure;

    private final JwtTokenProvider jwtTokenProvider;
    private final MemberRepository memberRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        // 1. 구글 인증 정보(OAuth2User)를 가져옴
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = (String) attributes.get("email");

        log.info("🎉 Google Login Success: {}", email);

        // 2. DB에서 Member 정보 조회 (ID를 얻기 위해)
        // (CustomOAuth2UserService에서 이미 저장/갱신했으므로 무조건 있음)
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found after OAuth2 login"));

        // 3. MemberPrincipal 생성 (JWT 발급을 위한 재료)
        // 우리는 토큰 발급 시 MemberPrincipal을 캐스팅해서 사용하므로, 여기서 변환해줘야 함!
        MemberPrincipal memberPrincipal = new MemberPrincipal(member);

        // 4. 새로운 Authentication 객체 생성
        Authentication newAuth = new UsernamePasswordAuthenticationToken(
                memberPrincipal,
                null,
                Collections.singleton(new SimpleGrantedAuthority(member.getRoleKey()))
        );

        // 5. JWT 토큰 발급
        JwtToken jwtToken = jwtTokenProvider.generateToken(newAuth);

        // 6. HttpOnly 쿠키 생성 (AccessToken)
        // 밀리초(ms) 단위를 초(s) 단위로 변환 (/ 1000)
        String encodedAccess = URLEncoder.encode(jwtToken.getAccessToken(), StandardCharsets.UTF_8);
        ResponseCookie accessTokenCookie = ResponseCookie.from(AuthConstants.ACCESS_TOKEN, encodedAccess)
                .path("/")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .maxAge(accessTokenValidityTime / 1000) // JWT 만료시간과 동일하게 설정
                .build();

        // 7. HttpOnly 쿠키 생성 (RefreshToken)
        String encodedRefresh = URLEncoder.encode(jwtToken.getRefreshToken(), StandardCharsets.UTF_8);
        ResponseCookie refreshTokenCookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN, encodedRefresh)
                .path("/")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .maxAge(refreshTokenValidityTime / 1000) // JWT 만료시간과 동일하게 설정
                .build();

        // 8. 응답 헤더에 쿠키 추가
        response.addHeader(HttpHeaders.SET_COOKIE, accessTokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());

        // 9. 리다이렉트
        getRedirectStrategy().sendRedirect(request, response, redirectUri);
    }
}
