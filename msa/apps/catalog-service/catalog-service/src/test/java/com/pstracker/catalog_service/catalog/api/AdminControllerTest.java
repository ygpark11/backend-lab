package com.pstracker.catalog_service.catalog.api;

import com.pstracker.catalog_service.catalog.controller.AdminController;
import com.pstracker.catalog_service.catalog.dto.AdminGameDetailResponse;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.catalog.service.GameReadService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CatalogService catalogService;

    @MockitoBean
    private GameReadService gameReadService;

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

    // ── bulkDeleteGames ──────────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 다중 삭제 요청 시 204 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void bulkDeleteGames_Success_Admin() throws Exception {
        doNothing().when(catalogService).bulkDeleteGames(any());

        mockMvc.perform(delete("/api/v1/admin/games/bulk")
                        .contentType("application/json")
                        .content("[1, 2, 3]")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("실패: 빈 배열로 다중 삭제 요청 시 400 Bad Request")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void bulkDeleteGames_Fail_EmptyBody() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/games/bulk")
                        .contentType("application/json")
                        .content("[]")
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 다중 삭제 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void bulkDeleteGames_Fail_User() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/games/bulk")
                        .contentType("application/json")
                        .content("[1]")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 다중 삭제 요청 시 401 Unauthorized")
    void bulkDeleteGames_Fail_Anonymous() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/games/bulk")
                        .contentType("application/json")
                        .content("[1]")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // ── getAdminGameDetail ───────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 게임 상세 조회 시 200 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void getAdminGameDetail_Success_Admin() throws Exception {
        given(gameReadService.getAdminGameDetail(1L)).willReturn(
                new AdminGameDetailResponse(1L, "테스트 게임", "Test Game", "img.jpg",
                        null, null, null, null, null, null, null, null,
                        null, null, null, java.util.List.of())
        );

        mockMvc.perform(get("/api/v1/admin/games/{gameId}", 1L))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 관리자 게임 상세 조회 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void getAdminGameDetail_Fail_User() throws Exception {
        mockMvc.perform(get("/api/v1/admin/games/{gameId}", 1L))
                .andExpect(status().isForbidden());
    }

    // ── updateGame ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 게임 수정 요청 시 204 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void updateGame_Success_Admin() throws Exception {
        doNothing().when(catalogService).adminUpdateGame(any(), any());

        mockMvc.perform(patch("/api/v1/admin/games/{gameId}", 1L)
                        .contentType("application/json")
                        .content("{\"name\":\"수정된 게임\"}")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 게임 수정 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void updateGame_Fail_User() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/games/{gameId}", 1L)
                        .contentType("application/json")
                        .content("{\"name\":\"수정된 게임\"}")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ── getScrapingRequests ──────────────────────────────────────────────────

    @Test
    @DisplayName("성공: 관리자(ADMIN)가 수집 현황 조회 시 200 반환")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void getScrapingRequests_Success_Admin() throws Exception {
        given(scrapingQueueService.getAdminScrapingRequests(any()))
                .willReturn(org.springframework.data.domain.Page.empty());

        mockMvc.perform(get("/api/v1/admin/scraping/requests"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("실패: 일반 유저(USER)가 수집 현황 조회 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void getScrapingRequests_Fail_User() throws Exception {
        mockMvc.perform(get("/api/v1/admin/scraping/requests"))
                .andExpect(status().isForbidden());
    }

    // ── registerGame ─────────────────────────────────────────────────────────
    // 성공 케이스는 @AuthenticationPrincipal MemberPrincipal을 @WithMockUser로 대체할 수 없어
    // 권한 검증(403/401)만 테스트합니다.

    @Test
    @DisplayName("실패: 일반 유저(USER)가 게임 등록 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void registerGame_Fail_User() throws Exception {
        mockMvc.perform(post("/api/v1/admin/games/register")
                        .contentType("application/json")
                        .content("{\"psStoreId\":\"PPSA-001\"}")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 게임 등록 요청 시 401 Unauthorized")
    void registerGame_Fail_Anonymous() throws Exception {
        mockMvc.perform(post("/api/v1/admin/games/register")
                        .contentType("application/json")
                        .content("{\"psStoreId\":\"PPSA-001\"}")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // ── retryScrapingRequest ─────────────────────────────────────────────────
    // 성공 케이스는 @AuthenticationPrincipal MemberPrincipal을 @WithMockUser로 대체할 수 없어
    // 권한 검증(403/401)만 테스트합니다.

    @Test
    @DisplayName("실패: 일반 유저(USER)가 수집 재시도 요청 시 403 Forbidden")
    @WithMockUser(username = "user", roles = "USER")
    void retryScrapingRequest_Fail_User() throws Exception {
        mockMvc.perform(post("/api/v1/admin/scraping/requests/{requestId}/retry", 1L)
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("실패: 로그인 안 한 사용자가 수집 재시도 요청 시 401 Unauthorized")
    void retryScrapingRequest_Fail_Anonymous() throws Exception {
        mockMvc.perform(post("/api/v1/admin/scraping/requests/{requestId}/retry", 1L)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }
}
