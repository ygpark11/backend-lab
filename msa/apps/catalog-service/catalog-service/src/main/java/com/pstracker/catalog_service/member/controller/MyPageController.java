package com.pstracker.catalog_service.member.controller;

import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.member.dto.MyPagePioneeredGameDto;
import com.pstracker.catalog_service.member.dto.MyPageProfileDto;
import com.pstracker.catalog_service.member.dto.MyPageSettingsDto;
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
    public ResponseEntity<MyPageProfileDto> getMyProfile(@AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(myPageService.getMyProfile(principal.getMemberId()));
    }

    @GetMapping("/pioneered")
    public ResponseEntity<List<MyPagePioneeredGameDto>> getMyPioneeredGames(@AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(myPageService.getMyPioneeredGames(principal.getMemberId()));
    }

    @GetMapping("/settings")
    public ResponseEntity<MyPageSettingsDto> getMySettings(@AuthenticationPrincipal MemberPrincipal principal) {
        return ResponseEntity.ok(myPageService.getMySettings(principal.getMemberId()));
    }

    @PutMapping("/settings")
    public ResponseEntity<MyPageSettingsDto> updateMySettings(
            @AuthenticationPrincipal MemberPrincipal principal,
            @RequestBody MyPageSettingsDto requestDto) {
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
