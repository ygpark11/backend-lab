package com.pstracker.catalog_service.scraping.controller;

import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.scraping.dto.GameCandidateResponse;
import com.pstracker.catalog_service.scraping.repository.GameCandidateRepository;
import com.pstracker.catalog_service.scraping.service.ScrapingQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/scraping")
@RequiredArgsConstructor
public class ScrapingController {

    private final GameCandidateRepository gameCandidateRepository;
    private final ScrapingQueueService scrapingQueueService;

    @GetMapping("/candidates")
    public ResponseEntity<List<GameCandidateResponse>> getCandidates() {
        List<GameCandidateResponse> responses = gameCandidateRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(GameCandidateResponse::from)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/request/{psStoreId}")
    public ResponseEntity<String> requestScraping(
            @AuthenticationPrincipal MemberPrincipal principal,
            @PathVariable("psStoreId") String psStoreId) {

        scrapingQueueService.requestScraping(principal.getMemberId(), psStoreId);

        return ResponseEntity.ok("수집 대기열에 안전하게 등록되었습니다.");
    }
}
