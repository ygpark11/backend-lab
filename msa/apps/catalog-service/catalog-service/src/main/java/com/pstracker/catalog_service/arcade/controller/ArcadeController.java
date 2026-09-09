package com.pstracker.catalog_service.arcade.controller;

import com.pstracker.catalog_service.arcade.dto.LeaderboardResponse;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitRequest;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitResponse;
import com.pstracker.catalog_service.arcade.service.ArcadeService;
import com.pstracker.catalog_service.global.security.MemberPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/arcade")
@RequiredArgsConstructor
public class ArcadeController {

    private final ArcadeService arcadeService;

    /**
     * 아케이드 점수 등록 (로그인 유저 전용)
     */
    @PostMapping("/{gameType}/score")
    public ResponseEntity<ScoreSubmitResponse> submitScore(
            @PathVariable String gameType,
            @Valid @RequestBody ScoreSubmitRequest request,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        ScoreSubmitResponse response = arcadeService.submitScore(principal.getMemberId(), gameType, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 아케이드 리더보드 조회 (비로그인 사용자도 TOP 10 열람 가능)
     */
    @GetMapping("/{gameType}/leaderboard")
    public ResponseEntity<LeaderboardResponse> getLeaderboard(
            @PathVariable String gameType,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = (principal != null) ? principal.getMemberId() : null;
        LeaderboardResponse response = arcadeService.getLeaderboard(gameType, memberId);
        return ResponseEntity.ok(response);
    }
}
