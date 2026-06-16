package com.pstracker.catalog_service.catalog.api;

import com.pstracker.catalog_service.catalog.controller.AdminController;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.global.config.SecurityConfig;
import com.pstracker.catalog_service.global.security.CustomAccessDeniedHandler;
import com.pstracker.catalog_service.global.security.JwtAuthenticationEntryPoint;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.global.security.OAuth2AuthenticationSuccessHandler;
import com.pstracker.catalog_service.insights.service.InsightsService;
import com.pstracker.catalog_service.member.service.CustomOAuth2UserService;
import com.pstracker.catalog_service.scraping.service.ScrapingQueueService;
import com.pstracker.catalog_service.subscription.service.SubscriptionService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CatalogService catalogService;

    @MockitoBean
    private InsightsService insightsService;

    @MockitoBean
    private ScrapingQueueService scrapingQueueService;

    @MockitoBean
    private SubscriptionService subscriptionService;

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
        doAnswer(invocation -> {
            HttpServletResponse response = invocation.getArgument(1);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return null;
        }).when(jwtAuthenticationEntryPoint).commence(any(), any(), any());

        doAnswer(invocation -> {
            HttpServletResponse response = invocation.getArgument(1);
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return null;
        }).when(customAccessDeniedHandler).handle(any(), any(), any());
    }

    // ── deleteGame ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN) 권한으로 게임 삭제 요청 시 204 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void deleteGame_Success_Admin() throws Exception {
        Long gameId = 1L;
        doNothing().when(catalogService).deleteGame(gameId);

        mockMvc.perform(delete("/api/v1/admin/games/{gameId}", gameId)
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 게임 삭제 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void deleteGame_Fail_User() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/games/{gameId}", 1L)
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 게임 삭제 요청 시 401 Unauthorized")
    void deleteGame_Fail_Anonymous() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/games/{gameId}", 1L)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // ── refreshGame ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 단일 게임 재수집 요청 시 200 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void refreshGame_Success_Admin() throws Exception {
        Long gameId = 1L;
        doNothing().when(catalogService).triggerSingleGameRefresh(gameId);

        mockMvc.perform(post("/api/v1/admin/games/{gameId}/refresh", gameId)
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 단일 게임 재수집 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void refreshGame_Fail_User() throws Exception {
        mockMvc.perform(post("/api/v1/admin/games/{gameId}/refresh", 1L)
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 단일 게임 재수집 요청 시 401 Unauthorized")
    void refreshGame_Fail_Anonymous() throws Exception {
        mockMvc.perform(post("/api/v1/admin/games/{gameId}/refresh", 1L)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // ── refreshAllCaches ─────────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 전체 캐시 초기화 요청 시 200 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void refreshAllCaches_Success_Admin() throws Exception {
        doNothing().when(insightsService).refreshInsightsCache();
        doNothing().when(catalogService).refreshCurationCache();
        doNothing().when(subscriptionService).refreshPsPlusPricingCache();

        mockMvc.perform(post("/api/v1/admin/cache/refresh")
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 전체 캐시 초기화 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void refreshAllCaches_Fail_User() throws Exception {
        mockMvc.perform(post("/api/v1/admin/cache/refresh")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 전체 캐시 초기화 요청 시 401 Unauthorized")
    void refreshAllCaches_Fail_Anonymous() throws Exception {
        mockMvc.perform(post("/api/v1/admin/cache/refresh")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // ── deleteCandidate ──────────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 후보 게임 삭제 요청 시 204 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void deleteCandidate_Success_Admin() throws Exception {
        String psStoreId = "PPSA-TEST-001";
        doNothing().when(scrapingQueueService).deleteCandidate(psStoreId);

        mockMvc.perform(delete("/api/v1/admin/scraping/candidates/{psStoreId}", psStoreId)
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 후보 게임 삭제 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void deleteCandidate_Fail_User() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/scraping/candidates/{psStoreId}", "PPSA-TEST-001")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 후보 게임 삭제 요청 시 401 Unauthorized")
    void deleteCandidate_Fail_Anonymous() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/scraping/candidates/{psStoreId}", "PPSA-TEST-001")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }
}
