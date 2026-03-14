package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import com.pstracker.catalog_service.scraping.domain.GameCandidate;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.repository.GameCandidateRepository;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapingQueueService {

    private final GameCandidateRepository gameCandidateRepository;
    private final ScrapingRequestRepository scrapingRequestRepository;
    private final GameRepository gameRepository;
    private final MemberRepository memberRepository;

    private static final int MAX_REQUESTS_PER_HOUR = 3; // 도배 방지 리미트

    @Transactional
    public void requestScraping(Long memberId, String psStoreId) {
        // 1. 도배 방어: 1시간 이내 요청 횟수 체크
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        int recentRequests = scrapingRequestRepository.countByMemberIdAndCreatedAtAfter(memberId, oneHourAgo);
        if (recentRequests >= MAX_REQUESTS_PER_HOUR) {
            throw new IllegalStateException("1시간에 최대 3개의 게임만 개척할 수 있습니다. 잠시 후 다시 시도해주세요!");
        }

        // 2. 중복 방어 1: 이미 트래커(Game 테이블)에 수집 완료된 게임인가?
        if (gameRepository.existsByPsStoreId(psStoreId)) {
            throw new IllegalStateException("앗! 이미 누군가 트래커에 등록한 게임입니다.");
        }

        // 3. 중복 방어 2: 이미 누군가 먼저 버튼을 눌러 큐에 대기 중인가?
        if (scrapingRequestRepository.existsByPsStoreId(psStoreId)) {
            throw new IllegalStateException("다른 개척자님이 방금 수집을 요청하여 진행 중입니다!");
        }

        // 4. 후보군(GameCandidate)에서 대상 조회
        GameCandidate candidate = gameCandidateRepository.findByPsStoreId(psStoreId)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않거나 이미 요청된 게임입니다."));

        // 유저 정보 조회
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        // 5. 큐(ScrapingRequest)에 PENDING 상태로 등록
        ScrapingRequest request = ScrapingRequest.builder()
                .member(member)
                .psStoreId(candidate.getPsStoreId())
                .targetUrl("https://store.playstation.com/ko-kr/product/" + candidate.getPsStoreId())
                .build();
        scrapingRequestRepository.save(request);

        // 6. GameCandidate에서 삭제하여 타 유저 노출 차단
        gameCandidateRepository.deleteByPsStoreId(psStoreId);

        log.debug("수집 대기열 등록 완료: 유저 {} -> 게임 {}", member.getNickname(), candidate.getTitle());
    }
}
