package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.CrawlJobRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.service.GameReadService;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import com.pstracker.catalog_service.scraping.dto.HltbTargetResponse;
import com.pstracker.catalog_service.scraping.dto.HltbUpdateRequest;
import com.pstracker.catalog_service.scraping.dto.RatingTargetResponse;
import com.pstracker.catalog_service.scraping.dto.RatingUpdateRequest;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ScrapingJobLifecycleTest {

    @Autowired private RatingScrapingService ratingScrapingService;
    @Autowired private HltbScrapingService hltbScrapingService;
    @Autowired private ScrapingQueueManager scrapingQueueManager;
    @Autowired private GameRepository gameRepository;
    @Autowired private CrawlJobRepository crawlJobRepository;
    @Autowired private ScrapingRequestRepository scrapingRequestRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private EntityManager em;

    @MockitoSpyBean private GameReadService gameReadService;
    @MockitoBean private AiService aiService;

    @Test
    @DisplayName("Rating/HLTB 타겟 폴링은 삭제된 게임의 잡을 건너뛰고 정상 잡을 PROCESSING으로 전환하며, 완료 시 상세 캐시를 무효화한다")
    void pollingAndCompletion_evictsGameDetailCache() {
        Game game = gameRepository.save(Game.create(
                "PS-LOCK-001", "엘든 링", "Elden Ring", "FromSoftware",
                "img.jpg", "desc", LocalDate.of(2026, 1, 1)
        ));
        // 삭제된 게임(999999L) 잡과 정상 게임 잡을 순서대로 등록
        CrawlJob orphanMc = crawlJobRepository.save(CrawlJob.create(999999L, CrawlJob.TargetType.METACRITIC));
        CrawlJob validMc = crawlJobRepository.save(CrawlJob.create(game.getId(), CrawlJob.TargetType.METACRITIC));
        CrawlJob validHltb = crawlJobRepository.save(CrawlJob.create(game.getId(), CrawlJob.TargetType.HLTB));
        em.flush();
        em.clear();

        RatingTargetResponse mcTarget = ratingScrapingService.getPendingTarget();
        assertThat(mcTarget).isNotNull();
        assertThat(mcTarget.jobId()).isEqualTo(validMc.getId());
        assertThat(crawlJobRepository.findById(orphanMc.getId()).orElseThrow().getStatus())
                .isEqualTo(CrawlJob.JobStatus.FAILED);

        ratingScrapingService.updateRatingResult(new RatingUpdateRequest(
                validMc.getId(), game.getId(), "SUCCESS", 96, 100, 8.5, 500));
        verify(gameReadService).evictGameDetailCache(game.getId());

        HltbTargetResponse hltbTarget = hltbScrapingService.getPendingTarget();
        assertThat(hltbTarget).isNotNull();
        assertThat(hltbTarget.jobId()).isEqualTo(validHltb.getId());

        hltbScrapingService.updateHltbResult(new HltbUpdateRequest(
                validHltb.getId(), game.getId(), "SUCCESS", 60.0, 100.0, 135.0));
        verify(gameReadService, org.mockito.Mockito.times(2)).evictGameDetailCache(game.getId());
    }

    @Test
    @DisplayName("30분 이상 PROCESSING 에 고착된 CrawlJob은 PENDING으로 복구되고 ScrapingRequest는 FAILED로 전환된다")
    void recoverStuckProcessingJobs_resetsOnlyTimedOutRows() {
        Member member = memberRepository.save(Member.builder()
                .email("pioneer@test.com")
                .password("encoded")
                .nickname("개척자")
                .role(Role.USER)
                .build());

        CrawlJob stuckJob = crawlJobRepository.save(CrawlJob.create(1L, CrawlJob.TargetType.METACRITIC));
        stuckJob.updateStatus(CrawlJob.JobStatus.PROCESSING, null);
        CrawlJob freshJob = crawlJobRepository.save(CrawlJob.create(2L, CrawlJob.TargetType.HLTB));
        freshJob.updateStatus(CrawlJob.JobStatus.PROCESSING, null);

        ScrapingRequest stuckReq = scrapingRequestRepository.save(ScrapingRequest.builder()
                .member(member)
                .psStoreId("PS-STUCK-1")
                .targetUrl("https://store.playstation.com/ko-kr/product/PS-STUCK-1")
                .build());
        stuckReq.markAsProcessing();

        ScrapingRequest freshReq = scrapingRequestRepository.save(ScrapingRequest.builder()
                .member(member)
                .psStoreId("PS-FRESH-2")
                .targetUrl("https://store.playstation.com/ko-kr/product/PS-FRESH-2")
                .build());
        freshReq.markAsProcessing();

        em.flush();
        LocalDateTime fortyMinutesAgo = LocalDateTime.now().minusMinutes(40);
        em.createQuery("UPDATE CrawlJob c SET c.updatedAt = :t WHERE c.id = :id")
                .setParameter("t", fortyMinutesAgo).setParameter("id", stuckJob.getId()).executeUpdate();
        em.createQuery("UPDATE ScrapingRequest r SET r.updatedAt = :t WHERE r.id = :id")
                .setParameter("t", fortyMinutesAgo).setParameter("id", stuckReq.getId()).executeUpdate();
        em.clear();

        scrapingQueueManager.recoverStuckProcessingJobs();
        em.flush();
        em.clear();

        assertThat(crawlJobRepository.findById(stuckJob.getId()).orElseThrow().getStatus())
                .isEqualTo(CrawlJob.JobStatus.PENDING);
        assertThat(crawlJobRepository.findById(freshJob.getId()).orElseThrow().getStatus())
                .isEqualTo(CrawlJob.JobStatus.PROCESSING);

        ScrapingRequest recoveredReq = scrapingRequestRepository.findById(stuckReq.getId()).orElseThrow();
        assertThat(recoveredReq.getStatus()).isEqualTo(ScrapingRequestStatus.FAILED);
        assertThat(recoveredReq.getErrorMessage()).contains("시간 초과");
        assertThat(scrapingRequestRepository.findById(freshReq.getId()).orElseThrow().getStatus())
                .isEqualTo(ScrapingRequestStatus.PROCESSING);
    }
}
