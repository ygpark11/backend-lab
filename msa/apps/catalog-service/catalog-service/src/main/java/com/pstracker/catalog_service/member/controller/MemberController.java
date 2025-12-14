package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.global.security.JwtToken;
import com.pstracker.catalog_service.member.dto.MemberLoginDto;
import com.pstracker.catalog_service.member.dto.MemberSignupDto;
import com.pstracker.catalog_service.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<JwtToken> login(@RequestBody MemberLoginDto request) {
        JwtToken token = memberService.login(request);
        return ResponseEntity.ok(token);
    }

    // [테스트용] 내 정보 확인 (토큰 필요)
    @GetMapping("/me")
    public ResponseEntity<String> getMyInfo() {
        // SecurityContext에 저장된 ID 꺼내기
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok("Hello! Your Email is: " + currentEmail);
    }
}
