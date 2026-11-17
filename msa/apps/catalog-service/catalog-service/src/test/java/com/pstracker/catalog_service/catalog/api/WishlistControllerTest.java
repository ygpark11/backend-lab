package com.pstracker.catalog_service.catalog.api;

import com.pstracker.catalog_service.catalog.controller.WishlistController;
import com.pstracker.catalog_service.catalog.dto.WishlistStatusResponse;
import com.pstracker.catalog_service.catalog.service.WishlistService;
import com.pstracker.catalog_service.global.config.SecurityConfig;
import com.pstracker.catalog_service.global.exception.BusinessException;
import com.pstracker.catalog_service.global.exception.ErrorCode;
import com.pstracker.catalog_service.global.security.AuthConstants;
import com.pstracker.catalog_service.global.security.CustomAccessDeniedHandler;
import com.pstracker.catalog_service.global.security.JwtAuthenticationEntryPoint;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.global.security.OAuth2AuthenticationSuccessHandler;
import com.pstracker.catalog_service.member.service.CustomOAuth2UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WishlistController.class)
@Import(SecurityConfig.class)
class WishlistControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private WishlistService wishlistService;
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

        MemberPrincipal principal = new MemberPrincipal(1L, "user@test.com", "USER");
        when(jwtTokenProvider.validateAccessToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getAuthentication("valid-token"))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, "", principal.getAuthorities()));
    }

    private Cookie validAuthCookie() {
        return new Cookie(AuthConstants.ACCESS_TOKEN, "valid-token");
    }

    @Test
    @DisplayName("비로그인 사용자가 PUT / DELETE 요청 시 401 Unauthorized 를 반환한다")
    void unauthenticatedRequests_return401() throws Exception {
        mockMvc.perform(put("/api/v1/wishlists/10"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/v1/wishlists/10"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/v1/wishlists/{gameId} 호출 시 JSON {liked, targetPrice, message} 를 반환한다")
    void upsertWishlist_returnsJsonStatus() throws Exception {
        given(wishlistService.upsertWishlist(1L, 10L, 25000))
                .willReturn(WishlistStatusResponse.saved(25000, "목표가가 설정되었습니다."));

        mockMvc.perform(put("/api/v1/wishlists/10")
                        .cookie(validAuthCookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetPrice\": 25000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.targetPrice").value(25000))
                .andExpect(jsonPath("$.message").value("목표가가 설정되었습니다."));
    }

    @Test
    @DisplayName("PUT 요청 본문이 없어도 기본 찜 추가가 동작한다")
    void upsertWishlist_withoutBody_succeeds() throws Exception {
        given(wishlistService.upsertWishlist(1L, 10L, null))
                .willReturn(WishlistStatusResponse.saved(null, "찜 목록에 추가되었습니다."));

        mockMvc.perform(put("/api/v1/wishlists/10")
                        .cookie(validAuthCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.targetPrice").value(nullValue()))
                .andExpect(jsonPath("$.message").value("찜 목록에 추가되었습니다."));
    }

    @Test
    @DisplayName("DELETE /api/v1/wishlists/{gameId} 호출 시 JSON {liked: false, message} 를 반환한다")
    void removeWishlist_returnsJsonStatus() throws Exception {
        given(wishlistService.removeWishlist(1L, 10L))
                .willReturn(WishlistStatusResponse.removed("찜 목록에서 삭제되었습니다."));

        mockMvc.perform(delete("/api/v1/wishlists/10")
                        .cookie(validAuthCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.targetPrice").value(nullValue()))
                .andExpect(jsonPath("$.message").value("찜 목록에서 삭제되었습니다."));
    }

    @Test
    @DisplayName("예외 코드가 HTTP 상태 코드(404/409/400)로 일관되게 매핑된다")
    void errorMapping_consistentHttpStatus() throws Exception {
        given(wishlistService.removeWishlist(1L, 999L))
                .willThrow(new BusinessException(ErrorCode.GAME_NOT_FOUND));
        given(wishlistService.upsertWishlist(1L, 10L, null))
                .willThrow(new IllegalStateException("위시리스트는 최대 30개까지만 등록 가능합니다."));
        given(wishlistService.upsertWishlist(1L, 10L, 0))
                .willThrow(new IllegalArgumentException("목표가는 0원보다 커야 합니다."));

        mockMvc.perform(delete("/api/v1/wishlists/999").cookie(validAuthCookie()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(ErrorCode.GAME_NOT_FOUND.getDefaultMessage()));

        mockMvc.perform(put("/api/v1/wishlists/10").cookie(validAuthCookie()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("위시리스트는 최대 30개까지만 등록 가능합니다."));

        mockMvc.perform(put("/api/v1/wishlists/10")
                        .cookie(validAuthCookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetPrice\": 0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("목표가는 0원보다 커야 합니다."));
    }
}
