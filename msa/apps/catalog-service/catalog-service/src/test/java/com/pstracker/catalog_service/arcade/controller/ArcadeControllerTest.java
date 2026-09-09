package com.pstracker.catalog_service.arcade.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pstracker.catalog_service.arcade.dto.LeaderboardEntryDto;
import com.pstracker.catalog_service.arcade.dto.LeaderboardResponse;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitRequest;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitResponse;
import com.pstracker.catalog_service.arcade.service.ArcadeService;
import com.pstracker.catalog_service.global.config.SecurityConfig;
import com.pstracker.catalog_service.global.security.CustomAccessDeniedHandler;
import com.pstracker.catalog_service.global.security.JwtAuthenticationEntryPoint;
import com.pstracker.catalog_service.global.security.JwtTokenProvider;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.global.security.OAuth2AuthenticationSuccessHandler;
import com.pstracker.catalog_service.member.service.CustomOAuth2UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ArcadeController.class)
@Import(SecurityConfig.class)
class ArcadeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ArcadeService arcadeService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockitoBean
    private CustomAccessDeniedHandler customAccessDeniedHandler;

    @MockitoBean
    private CustomOAuth2UserService customOAuth2UserService;

    @MockitoBean
    private OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    @MockitoBean
    private ClientRegistrationRepository clientRegistrationRepository;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            HttpServletResponse response = invocation.getArgument(1);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
            return null;
        }).when(jwtAuthenticationEntryPoint).commence(any(), any(), any());
    }

    @Test
    @DisplayName("[리더보드 조회] 비로그인 게스트 사용자도 리더보드 조회가 가능하다 (permitAll)")
    void getLeaderboard_guestUser_success() throws Exception {
        // given
        LeaderboardResponse mockResponse = LeaderboardResponse.builder()
                .gameType("sichuan")
                .topList(List.of(
                        LeaderboardEntryDto.builder()
                                .rank(1)
                                .username("게이머닉네임") // 이메일이 아닌 닉네임
                                .score(15000)
                                .build()
                ))
                .myRank(null) // 비로그인 시 null
                .build();

        given(arcadeService.getLeaderboard(eq("sichuan"), eq(null)))
                .willReturn(mockResponse);

        // when & then
        mockMvc.perform(get("/api/v1/arcade/sichuan/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameType").value("sichuan"))
                .andExpect(jsonPath("$.topList[0].username").value("게이머닉네임"))
                .andExpect(jsonPath("$.topList[0].username").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("@"))))
                .andExpect(jsonPath("$.myRank").doesNotExist());
    }

    @Test
    @DisplayName("[리더보드 조회] 데이터가 0건일 때 topList 빈 배열과 myRank null을 안전하게 반환한다 (No-Data 방어)")
    void getLeaderboard_emptyData_success() throws Exception {
        // given
        LeaderboardResponse emptyResponse = LeaderboardResponse.builder()
                .gameType("reflex")
                .topList(Collections.emptyList())
                .myRank(null)
                .build();

        given(arcadeService.getLeaderboard(eq("reflex"), eq(null)))
                .willReturn(emptyResponse);

        // when & then
        mockMvc.perform(get("/api/v1/arcade/reflex/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameType").value("reflex"))
                .andExpect(jsonPath("$.topList").isArray())
                .andExpect(jsonPath("$.topList").isEmpty())
                .andExpect(jsonPath("$.myRank").doesNotExist());
    }

    @Test
    @DisplayName("[리더보드 조회] 로그인 사용자는 본인의 myRank가 포함되어 반환된다")
    void getLeaderboard_authenticatedUser_includesMyRank() throws Exception {
        // given
        Long memberId = 42L;
        MemberPrincipal principal = new MemberPrincipal(memberId, "user@test.com", "USER");

        LeaderboardResponse mockResponse = LeaderboardResponse.builder()
                .gameType("sichuan")
                .topList(Collections.emptyList())
                .myRank(LeaderboardEntryDto.builder()
                        .rank(3)
                        .username("내닉네임")
                        .score(12000)
                        .build())
                .build();

        given(arcadeService.getLeaderboard(eq("sichuan"), eq(memberId)))
                .willReturn(mockResponse);

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        // when & then
        mockMvc.perform(get("/api/v1/arcade/sichuan/leaderboard")
                        .with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myRank").isMap())
                .andExpect(jsonPath("$.myRank.rank").value(3))
                .andExpect(jsonPath("$.myRank.username").value("내닉네임"))
                .andExpect(jsonPath("$.myRank.username").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("@"))));
    }

    @Test
    @DisplayName("[점수 저장] 비로그인 사용자가 점수 저장을 요청하면 401 Unauthorized를 반환한다")
    void submitScore_unauthorized_returns401() throws Exception {
        ScoreSubmitRequest request = ScoreSubmitRequest.builder()
                .score(10000)
                .clearTimeSec(60)
                .build();

        mockMvc.perform(post("/api/v1/arcade/sichuan/score")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("[점수 저장] 로그인 사용자는 인증 주체의 memberId를 기준으로 점수가 안전하게 저장된다 (어뷰징 방지)")
    void submitScore_authenticatedUser_savesWithPrincipalMemberId() throws Exception {
        Long memberId = 77L;
        MemberPrincipal principal = new MemberPrincipal(memberId, "gamer@test.com", "USER");
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        ScoreSubmitRequest request = ScoreSubmitRequest.builder()
                .score(25000)
                .clearTimeSec(35)
                .build();

        ScoreSubmitResponse response = ScoreSubmitResponse.builder()
                .success(true)
                .isNewHighScore(true)
                .rank(1L)
                .score(25000)
                .message("최고 기록이 경신되었습니다!")
                .build();

        given(arcadeService.submitScore(eq(memberId), eq("sichuan"), any(ScoreSubmitRequest.class)))
                .willReturn(response);

        mockMvc.perform(post("/api/v1/arcade/sichuan/score")
                        .with(csrf())
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.newHighScore").value(true))
                .andExpect(jsonPath("$.rank").value(1))
                .andExpect(jsonPath("$.score").value(25000));

        // 검증: 서비스 호출 시 principal의 memberId(77L)가 확실히 사용되었는지 확인
        verify(arcadeService).submitScore(eq(memberId), eq("sichuan"), any(ScoreSubmitRequest.class));
    }

    @Test
    @DisplayName("[점수 저장] reflex 게임 타입도 정상적으로 저장 요청이 처리된다")
    void submitScore_reflexGameType_success() throws Exception {
        Long memberId = 88L;
        MemberPrincipal principal = new MemberPrincipal(memberId, "reflex_user@test.com", "USER");
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        ScoreSubmitRequest request = ScoreSubmitRequest.builder()
                .score(8500)
                .clearTimeSec(20)
                .build();

        ScoreSubmitResponse response = ScoreSubmitResponse.builder()
                .success(true)
                .isNewHighScore(false)
                .rank(5L)
                .score(8500)
                .message("기록이 등록되었습니다.")
                .build();

        given(arcadeService.submitScore(eq(memberId), eq("reflex"), any(ScoreSubmitRequest.class)))
                .willReturn(response);

        mockMvc.perform(post("/api/v1/arcade/reflex/score")
                        .with(csrf())
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.rank").value(5));

        verify(arcadeService).submitScore(eq(memberId), eq("reflex"), any(ScoreSubmitRequest.class));
    }
}
