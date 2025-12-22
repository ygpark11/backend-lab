package com.pstracker.catalog_service.global.security;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

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

        // 6. 리다이렉트 (토큰을 가지고 프론트엔드/메인으로 이동)
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost")
                .queryParam("accessToken", jwtToken.getAccessToken())
                .queryParam("refreshToken", jwtToken.getRefreshToken())
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
