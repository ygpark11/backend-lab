package com.pstracker.catalog_service.member.api;

import com.pstracker.catalog_service.global.config.SecurityConfig;
import com.pstracker.catalog_service.global.security.AuthConstants;
import com.pstracker.catalog_service.global.security.CustomAccessDeniedHandler;
import com.pstracker.catalog_service.global.security.JwtAuthenticationEntryPoint;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.global.security.OAuth2AuthenticationSuccessHandler;
import com.pstracker.catalog_service.member.controller.MemberController;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.service.CustomOAuth2UserService;
import com.pstracker.catalog_service.member.service.MemberService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MemberController.class)
@Import(SecurityConfig.class)
class MemberControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private MemberService memberService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomOAuth2UserService customOAuth2UserService;
    @MockitoBean private OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    @MockitoBean private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    @MockitoBean private CustomAccessDeniedHandler customAccessDeniedHandler;
    @MockitoBean private ClientRegistrationRepository clientRegistrationRepository;

    @BeforeEach
    void setupSecurityMocks() throws Exception {
        doAnswer(invocation -> {
            HttpServletResponse response = invocation.getArgument(1);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return null;
        }).when(jwtAuthenticationEntryPoint).commence(any(), any(), any());
    }

    @Test
    @DisplayName("쿠키가 전혀 없는 비로그인 사용자는 204 — 프론트가 재발급을 시도하지 않음")
    void getMyInfo_noCookies_returns204() throws Exception {
        mockMvc.perform(get("/api/v1/members/me"))
                .andExpect(status().isNoContent());
        verifyNoInteractions(memberService);
    }

    @Test
    @DisplayName("액세스 토큰 만료(인증 없음) + 리프레시 토큰 쿠키 존재 시 401 — 기존 재발급 흐름 유지")
    void getMyInfo_expiredAccessWithRefreshCookie_returns401() throws Exception {
        when(jwtTokenProvider.validateToken(any())).thenReturn(false);

        mockMvc.perform(get("/api/v1/members/me")
                        .cookie(new Cookie(AuthConstants.ACCESS_TOKEN, "expired-access"),
                                new Cookie(AuthConstants.REFRESH_TOKEN, "some-refresh")))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(memberService);
    }

    @Test
    @DisplayName("빈 값의 리프레시 토큰 쿠키는 없는 것으로 보고 204")
    void getMyInfo_blankRefreshCookie_returns204() throws Exception {
        mockMvc.perform(get("/api/v1/members/me")
                        .cookie(new Cookie(AuthConstants.REFRESH_TOKEN, "")))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("유효한 액세스 토큰이면 200과 회원 정보")
    void getMyInfo_validAccessToken_returns200() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, "user@test.com", "ROLE_USER");
        when(jwtTokenProvider.validateToken("valid-access")).thenReturn(true);
        when(jwtTokenProvider.getAuthentication("valid-access"))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        when(memberService.findById(1L)).thenReturn(mock(Member.class));

        mockMvc.perform(get("/api/v1/members/me")
                        .cookie(new Cookie(AuthConstants.ACCESS_TOKEN, "valid-access")))
                .andExpect(status().isOk());
        verify(memberService).findById(1L);
    }

    @Test
    @DisplayName("/api/v1/members/me 하위 경로는 여전히 인증 필요 (보안 규칙 회귀 방지)")
    void membersMeSubPath_stillRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/members/me/profile"))
                .andExpect(status().isUnauthorized());
    }
}
