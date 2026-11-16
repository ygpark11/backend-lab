package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.AdminGameUpdateRequest;
import com.pstracker.catalog_service.catalog.repository.CrawlJobRepository;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.GameVoteRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.global.client.collector.CollectorClientManager;
import com.pstracker.catalog_service.global.client.collector.dto.SingleCrawlRequest;
import com.pstracker.catalog_service.global.exception.BusinessException;
import com.pstracker.catalog_service.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogAdminService {

    private static final String PS_STORE_BASE_URL = "https://store.playstation.com/ko-kr/product/";

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final WishlistRepository wishlistRepository;
    private final GameVoteRepository gameVoteRepository;
    private final CrawlJobRepository crawlJobRepository;
    private final GameReadService gameReadService;
    private final CollectorClientManager clientManager;

    @Transactional
    public void deleteGame(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND, "해당 게임을 찾을 수 없습니다. id=" + gameId));

        gameRepository.delete(game);
        gameReadService.evictGameDetailCache(gameId);
    }

    @Transactional
    public void bulkDeleteGames(List<Long> gameIds) {
        // 1. DB cascade 대상 테이블을 JPQL IN절로 선행 삭제 (성능 최적화)
        priceHistoryRepository.deleteByGameIds(gameIds);
        wishlistRepository.deleteByGameIds(gameIds);
        gameVoteRepository.deleteByGameIds(gameIds);
        crawlJobRepository.deleteByGameIds(gameIds);

        // 2. Game 엔티티 삭제 — JPA cascade로 game_genres(CascadeType.ALL), game_platforms(@ElementCollection) 처리
        List<Game> games = gameRepository.findAllById(gameIds);
        for (Game game : games) {
            gameRepository.delete(game);
            gameReadService.evictGameDetailCache(game.getId());
        }
    }

    @Transactional
    public void adminUpdateGame(Long gameId, AdminGameUpdateRequest req) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND, "게임을 찾을 수 없습니다. id=" + gameId));

        game.adminUpdateBasicInfo(req.name(), req.englishName(), req.imageUrl());
        game.adminUpdateIgdbRatings(req.igdbCriticScore(), req.igdbCriticCount(),
                req.igdbUserScore(), req.igdbUserCount());
        game.adminUpdateMetacriticRatings(req.mcMetaScore(), req.mcMetaCount(),
                req.mcUserScore(), req.mcUserCount());

        if (req.searchKeywords() != null) {
            game.updateSearchKeywords(req.searchKeywords());
        }

        game.updatePlayTimes(req.hltbMainStory(), req.hltbMainExtra(), req.hltbCompletionist());
        gameReadService.evictGameDetailCache(gameId);
    }

    /**
     * 단일 게임 수동 크롤러 트리거.
     * 외부 HTTP 호출 중 DB 커넥션/트랜잭션을 점유하지 않도록 @Transactional을 적용하지 않는다.
     */
    public void triggerSingleGameRefresh(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND, "게임을 찾을 수 없습니다. id=" + gameId));

        String targetUrl = PS_STORE_BASE_URL + game.getPsStoreId();
        log.info("Triggering manual crawl for: {} ({})", game.getName(), targetUrl);

        try {
            String response = clientManager.getPrimary()
                    .triggerSingleCrawl(new SingleCrawlRequest(targetUrl, internalSecretKey));
            log.info("Crawler Response: {}", response);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 429) {
                log.warn("크롤러 작업 충돌 (429): {}", e.getMessage());
                throw new IllegalStateException("다른 수집 작업이 실행 중입니다. 잠시 후 시도해주세요.");
            }
            log.error("Crawler Trigger Failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.CRAWLER_UNAVAILABLE, "크롤러 서버 연결 실패: " + e.getMessage());
        } catch (Exception e) {
            log.error("Crawler Trigger Failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.CRAWLER_UNAVAILABLE, "크롤러 서버 연결 실패: " + e.getMessage());
        }
    }
}
