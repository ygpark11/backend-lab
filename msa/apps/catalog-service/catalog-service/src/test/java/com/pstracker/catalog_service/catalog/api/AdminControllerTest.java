package com.pstracker.catalog_service.catalog.api;

import com.pstracker.catalog_service.catalog.controller.AdminController;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.global.config.SecurityConfig;
import com.pstracker.catalog_service.global.security.CustomAccessDeniedHandler;
import com.pstracker.catalog_service.global.security.JwtAuthenticationEntryPoint;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.global.security.OAuth2AuthenticationSuccessHandler;
import com.pstracker.catalog_service.member.service.CustomOAuth2UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CatalogService catalogService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private CustomOAuth2UserService customOAuth2UserService;

    @MockitoBean
    private OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockitoBean
    private CustomAccessDeniedHandler customAccessDeniedHandler;

    @MockitoBean
    private ClientRegistrationRepository clientRegistrationRepository;

    @BeforeEach
    void setupSecurityMocks() throws Exception {
        // 1. 401(인증 실패) 핸들러가 호출되면 -> 응답에 401 상태 코드를 심어라!
        doAnswer(invocation -> {
            HttpServletResponse response = invocation.getArgument(1); // 메서드의 2번째 인자가 response
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED); // 401
            return null;
        }).when(jwtAuthenticationEntryPoint).commence(any(), any(), any());

        // 2. 403(권한 없음) 핸들러가 호출되면 -> 응답에 403 상태 코드를 심어라!
        doAnswer(invocation -> {
            HttpServletResponse response = invocation.getArgument(1);
            response.sendError(HttpServletResponse.SC_FORBIDDEN); // 403
            return null;
        }).when(customAccessDeniedHandler).handle(any(), any(), any());
    }

    @Test
    @DisplayName("성공: 관리자(ADMIN) 권한으로 삭제 요청 시 204 반환")
    @WithMockUser(username = "admin", roles = "ADMIN") // ADMIN 권한 부여
    void deleteGame_Success_Admin() throws Exception {
        // given
        Long gameId = 1L;
        doNothing().when(catalogService).deleteGame(gameId);

        // when & then
        mockMvc.perform(delete("/api/v1/admin/games/{gameId}", gameId)
                        .with(csrf())) // CSRF 토큰 주입
                .andExpect(status().isNoContent()); // 204 성공
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 삭제 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER") // USER 권한 부여
    void deleteGame_Fail_User() throws Exception {
        // when & then
        // SecurityConfig의 .requestMatchers("/api/v1/admin/**").hasRole("ADMIN") 규칙에 걸려야 함
        mockMvc.perform(delete("/api/v1/admin/games/{gameId}", 1L)
                        .with(csrf()))
                .andExpect(status().isForbidden()); // 403 실패 (성공!)
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 삭제 요청 시 401 Unauthorized")
    void deleteGame_Fail_Anonymous() throws Exception {
        // when & then
        mockMvc.perform(delete("/api/v1/admin/games/{gameId}", 1L)
                        .with(csrf()))
                .andExpect(status().isUnauthorized()); // 401 실패 (성공!)
    }
}
