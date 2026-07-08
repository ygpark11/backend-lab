package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.catalog.dto.GameSearchResponse;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.member.dto.MyPagePioneeredGameResponse;
import com.pstracker.catalog_service.member.dto.MyPageProfileResponse;
import com.pstracker.catalog_service.member.dto.MyPageSettings;
import com.pstracker.catalog_service.member.service.MyPageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/members/me")
@RequiredArgsConstructor
public class MyPageController {

    private final MyPageService myPageService;

    @GetMapping("/profile")
    public ResponseEntity<MyPageProfileResponse> getMyProfile(@AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(myPageService.getMyProfile(principal.getMemberId()));
    }

    @GetMapping("/pioneered")
    public ResponseEntity<List<MyPagePioneeredGameResponse>> getMyPioneeredGames(@AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(myPageService.getMyPioneeredGames(principal.getMemberId()));
    }

    @GetMapping("/settings")
    public ResponseEntity<MyPageSettings> getMySettings(@AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(myPageService.getMySettings(principal.getMemberId()));
    }

    @PutMapping("/settings")
    public ResponseEntity<MyPageSettings> updateMySettings(
            @AuthenticationPrincipal MemberPrincipal principal,
            @RequestBody MyPageSettings requestDto) {
        return ResponseEntity.ok(myPageService.updateMySettings(principal.getMemberId(), requestDto));
    }

    @PutMapping("/nickname")
    public ResponseEntity<String> updateNickname(
            @AuthenticationPrincipal MemberPrincipal principal,
            @RequestBody java.util.Map<String, String> request) {

        String newNickname = request.get("nickname");
        String updatedNickname = myPageService.updateNickname(principal.getMemberId(), newNickname);

        return ResponseEntity.ok(updatedNickname);
    }
}
