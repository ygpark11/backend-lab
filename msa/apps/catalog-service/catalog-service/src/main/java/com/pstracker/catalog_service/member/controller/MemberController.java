package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.global.security.AuthConstants;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.dto.MemberInfoResponse;
import com.pstracker.catalog_service.member.dto.MemberSignupRequest;
import com.pstracker.catalog_service.member.service.MemberService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@Slf4j
@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<Long> signup(@RequestBody MemberSignupRequest request) {
        return ResponseEntity.ok(memberService.signup(request));
    }

    /**
     * [실무용] 내 정보 상세 조회 API
     * 역할: 로그인 체크 + 사용자 정보(닉네임, 권한 등) 제공
     */
    @GetMapping("/me")
    public ResponseEntity<MemberInfoResponse> getMyInfo(@AuthenticationPrincipal MemberPrincipal principal,
                                                        HttpServletRequest request) {
        // 1. 시큐리티 컨텍스트에 인증 정보가 없는 경우
        if (principal == null) {
            // 재발급용 토큰 쿠키가 있으면 액세스 토큰 만료 → 401로 응답해 프론트가 /auth/reissue 후 재시도 (기존 흐름 유지)
            // 쿠키가 없으면 처음부터 비로그인 → 204로 응답해 불필요한 재발급 호출과 콘솔 에러를 막음
            return hasRefreshTokenCookie(request)
                    ? ResponseEntity.status(401).build()
                    : ResponseEntity.noContent().build();
        }

        // 2. MemberPrincipal에서 실제 Member 엔티티를 꺼냄
        Member member = memberService.findById(principal.getMemberId());

        // 3. DTO로 변환하여 반환 (JSON)
        return ResponseEntity.ok(MemberInfoResponse.from(member));
    }

    // 값은 검증하지 않고 존재 여부만 확인 (토큰 검증은 /auth/reissue 에서 수행)
    private boolean hasRefreshTokenCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return false;
        return Arrays.stream(cookies)
                .anyMatch(c -> AuthConstants.REFRESH_TOKEN.equals(c.getName())
                        && c.getValue() != null && !c.getValue().isBlank());
    }
}
