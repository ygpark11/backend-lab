package com.pstracker.catalog_service.member.api;

import com.pstracker.catalog_service.global.config.SecurityConfig;
import com.pstracker.catalog_service.global.security.AuthConstants;
import com.pstracker.catalog_service.global.security.CustomAccessDeniedHandler;
import com.pstracker.catalog_service.global.security.JwtAuthenticationEntryPoint;
import com.pstracker.catalog_service.global.security.JwtToken;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.global.security.OAuth2AuthenticationSuccessHandler;
import com.pstracker.catalog_service.member.controller.AuthController;
import com.pstracker.catalog_service.member.service.CustomOAuth2UserService;
import com.pstracker.catalog_service.member.service.MemberService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

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
    @DisplayName("유효한 Refresh Token 쿠키로 /reissue 요청 시 새 Access Token 쿠키를 발급한다")
    void reissue_validRefreshToken_setsNewAccessTokenCookie() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, "user@test.com", "USER");
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, "", principal.getAuthorities());

        when(jwtTokenProvider.validateRefreshToken("valid-refresh")).thenReturn(true);
        when(jwtTokenProvider.getAuthentication("valid-refresh")).thenReturn(auth);
        when(jwtTokenProvider.generateToken(auth)).thenReturn(
                JwtToken.builder()
                        .grantType("Bearer")
                        .accessToken("new-access-token")
                        .refreshToken("new-refresh-token")
                        .build()
        );

        mockMvc.perform(post("/api/v1/auth/reissue")
                        .cookie(new Cookie(AuthConstants.REFRESH_TOKEN, "valid-refresh")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("accessToken=new-access-token")));
    }

    @Test
    @DisplayName("Access Token 을 refreshToken 쿠키에 담아 /reissue 요청 시 401 을 반환한다")
    void reissue_invalidRefreshToken_returns401() throws Exception {
        when(jwtTokenProvider.validateRefreshToken("access-token-in-refresh-cookie")).thenReturn(false);

        mockMvc.perform(post("/api/v1/auth/reissue")
                        .cookie(new Cookie(AuthConstants.REFRESH_TOKEN, "access-token-in-refresh-cookie")))
                .andExpect(status().isUnauthorized());
    }
}
