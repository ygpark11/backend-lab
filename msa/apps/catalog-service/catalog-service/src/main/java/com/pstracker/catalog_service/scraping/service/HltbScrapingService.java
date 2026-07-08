package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.CrawlJobRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.util.GameTitleNormalizer;
import com.pstracker.catalog_service.scraping.dto.HltbTargetResponse;
import com.pstracker.catalog_service.scraping.dto.HltbUpdateRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.springframework.util.StringUtils.hasText;

@Slf4j
@Service
@RequiredArgsConstructor
public class HltbScrapingService {

    private final CrawlJobRepository crawlJobRepository;
    private final GameRepository gameRepository;

    @Transactional
    public HltbTargetResponse getPendingTarget() {
        Optional<CrawlJob> jobOpt = crawlJobRepository.findFirstByTargetTypeAndStatusOrderByCreatedAtAsc(
                CrawlJob.TargetType.HLTB, CrawlJob.JobStatus.PENDING
        );

        if (jobOpt.isEmpty()) return null;

        CrawlJob job = jobOpt.get();
        Optional<Game> gameOpt = gameRepository.findById(job.getGameId());

        if (gameOpt.isEmpty()) {
            log.warn("[HLTB] Job(ID:{}) 처리 전 게임(ID:{})이 삭제됨. FAILED 처리 후 다음 타겟 탐색", job.getId(), job.getGameId());
            job.updateStatus(CrawlJob.JobStatus.FAILED, "Game deleted before processing");
            return getPendingTarget();
        }

        Game game = gameOpt.get();
        job.updateStatus(CrawlJob.JobStatus.PROCESSING, null);

        String rawTitle = hasText(game.getEnglishName()) ? game.getEnglishName() : game.getName();
        String searchTitle = GameTitleNormalizer.cleanMojibakeOnly(rawTitle, false);

        log.debug("[HLTB] 파이썬 타겟 할당: 원본[{}] -> 변환[{}]", rawTitle, searchTitle);

        return new HltbTargetResponse(job.getId(), game.getId(), searchTitle);
    }

    @Transactional
    public void updateHltbResult(HltbUpdateRequest dto) {
        CrawlJob job = crawlJobRepository.findById(dto.jobId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid Job ID: " + dto.jobId()));

        Optional<Game> gameOpt = gameRepository.findById(dto.gameId());

        if (gameOpt.isEmpty()) {
            log.warn("[HLTB] 크롤링 완료 후 업데이트 하려 했으나 게임(ID:{})이 삭제됨. Job 무효화.", dto.gameId());
            job.updateStatus(CrawlJob.JobStatus.FAILED, "Game deleted after processing");
            return;
        }

        if ("SUCCESS".equals(dto.status())) {
            Game game = gameOpt.get();

            game.updatePlayTimes(dto.mainStory(), dto.mainExtra(), dto.completionist());

            job.updateStatus(CrawlJob.JobStatus.DONE, null);
            log.debug("[HLTB 수집 완료] {} -> Main: {}h, Extra: {}h, 100%: {}h",
                    game.getName(), dto.mainStory(), dto.mainExtra(), dto.completionist());
        } else {
            CrawlJob.JobStatus newStatus = CrawlJob.JobStatus.FAILED;
            try {
                newStatus = CrawlJob.JobStatus.valueOf(dto.status());
            } catch (Exception ignored) {}

            job.updateStatus(newStatus, "Crawler reported: " + dto.status());
            log.warn("[HLTB 수집 실패] GameID: {} -> Reason: {}", dto.gameId(), dto.status());
        }
    }
}
