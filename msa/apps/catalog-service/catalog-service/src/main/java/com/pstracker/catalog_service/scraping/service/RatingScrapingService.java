package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.RatingTargetResponse;
import com.pstracker.catalog_service.catalog.dto.RatingUpdateDto;
import com.pstracker.catalog_service.catalog.repository.CrawlJobRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.util.GameTitleNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.springframework.util.StringUtils.hasText;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingScrapingService {

    private final CrawlJobRepository crawlJobRepository;
    private final GameRepository gameRepository;

    @Transactional
    public RatingTargetResponse getPendingTarget() {
        Optional<CrawlJob> jobOpt = crawlJobRepository.findFirstByStatusOrderByCreatedAtAsc(CrawlJob.JobStatus.PENDING);

        if (jobOpt.isEmpty()) return null;

        CrawlJob job = jobOpt.get();
        Optional<Game> gameOpt = gameRepository.findById(job.getGameId());

        if (gameOpt.isEmpty()) {
            log.warn("Job(ID:{}) 처리 전 게임(ID:{})이 삭제됨. FAILED 처리 후 다음 타겟 탐색", job.getId(), job.getGameId());
            job.updateStatus(CrawlJob.JobStatus.FAILED, "Game deleted before processing");
            return getPendingTarget();
        }

        Game game = gameOpt.get();
        job.updateStatus(CrawlJob.JobStatus.PROCESSING, null);

        String rawTitle = hasText(game.getEnglishName()) ? game.getEnglishName() : game.getName();

        String searchTitle = GameTitleNormalizer.cleanMojibakeOnly(rawTitle);

        log.debug("파이썬 타겟 정규화: 원본[{}] -> 변환[{}]", rawTitle, searchTitle);

        return new RatingTargetResponse(job.getId(), game.getId(), searchTitle);
    }

    @Transactional
    public void updateRatingResult(RatingUpdateDto dto) {
        CrawlJob job = crawlJobRepository.findById(dto.jobId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid Job ID: " + dto.jobId()));

        Optional<Game> gameOpt = gameRepository.findById(dto.gameId());

        // 파이썬이 크롤링하는 그 짧은 10초 사이에 관리자가 게임을 지울 수도 있으니, 그런 경우를 대비해 방어코드 작성. 그냥 실패 처리하고 끝냄.
        if (gameOpt.isEmpty()) {
            log.warn("크롤링 완료 후 업데이트 하려 했으나 게임(ID:{})이 삭제됨. Job 무효화.", dto.gameId());
            job.updateStatus(CrawlJob.JobStatus.FAILED, "Game deleted after processing");
            return;
        }

        if ("SUCCESS".equals(dto.status())) {
            Game game = gameOpt.get();
            game.updateMetacriticRatings(
                    dto.metaScore(), dto.metaCount(),
                    dto.userScore(), dto.userCount()
            );
            job.updateStatus(CrawlJob.JobStatus.DONE, null);
            log.debug("[메타크리틱 완료] {} -> Meta: {}, User: {}", game.getName(), dto.metaScore(), dto.userScore());
        } else {
            // NOT_FOUND, BLOCKED 등 파이썬이 던진 실패 사유 기록
            CrawlJob.JobStatus newStatus = CrawlJob.JobStatus.FAILED;
            try {
                newStatus = CrawlJob.JobStatus.valueOf(dto.status());
            } catch (Exception ignored) {}

            job.updateStatus(newStatus, "Crawler reported: " + dto.status());
            log.warn("[메타크리틱 실패] GameID: {} -> Reason: {}", dto.gameId(), dto.status());
        }
    }
}
