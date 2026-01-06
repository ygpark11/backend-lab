package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.dto.MemberInfoResponse;
import com.pstracker.catalog_service.member.dto.MemberSignupDto;
import com.pstracker.catalog_service.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<Long> signup(@RequestBody MemberSignupDto request) {
        return ResponseEntity.ok(memberService.signup(request));
    }

    /**
     * [실무용] 내 정보 상세 조회 API
     * 역할: 로그인 체크 + 사용자 정보(닉네임, 권한 등) 제공
     */
    @GetMapping("/me")
    public ResponseEntity<MemberInfoResponse> getMyInfo(@AuthenticationPrincipal MemberPrincipal principal) {
        // 1. 시큐리티 컨텍스트에 인증 정보가 없는 경우 (혹은 익명 사용자)
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        // 2. MemberPrincipal에서 실제 Member 엔티티를 꺼냄
        Member member = memberService.findById(principal.getMemberId());

        // 3. DTO로 변환하여 반환 (JSON)
        return ResponseEntity.ok(MemberInfoResponse.from(member));
    }
}
