package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.domain.PriceVerdict;
import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.config.GlobalCacheConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameReadService {

    private static final Integer RECOMMEND_GAME_COUNT = 4;

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final CacheManager cacheManager;

    /**
     * 게임 상세 캐시 삭제
     * @param gameId 게임 ID
     */
    public void evictGameDetailCache(Long gameId) {
        if (gameId != null) {
            var cache = cacheManager.getCache(GlobalCacheConfig.GAME_DETAIL_CACHE);
            if (cache != null) {
                cache.evict(gameId);
                log.debug("🧹 Cache Evicted for Game ID: {}", gameId);
            }
        }
    }

    /**
     * 기본 게임 상세 조회 (캐시 사용)
     * @param gameId 게임 ID
     * @return 게임 상세 응답 DTO
     */
    @Cacheable(value = GlobalCacheConfig.GAME_DETAIL_CACHE, key = "#gameId")
    public GameDetailResponse getBaseGameDetail(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found: " + gameId));

        // 가격 이력 조회
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(gameId);

        Integer originalPrice = (game.getOriginalPrice() != null) ? game.getOriginalPrice() : 0;
        Integer lowestPrice = (game.getAllTimeLowPrice() != null) ? game.getAllTimeLowPrice() : 0;
        int historySize = histories.size();

        List<GameDetailResponse.FamilyGameDto> familyGames =
                gameRepository.findByFamilyIdOrderByOriginalPriceAsc(game.getFamilyId())
                        .stream()
                        .map(g -> {
                            int approxHistorySize = (g.getAllTimeLowPrice() != null && g.getAllTimeLowPrice() > 0) ? 2 : 1;
                            PriceVerdict verdict = GameDetailResponse.calculateVerdict(
                                    g.getCurrentPrice(), g.getOriginalPrice(), g.getAllTimeLowPrice(), approxHistorySize
                            );

                            return new GameDetailResponse.FamilyGameDto(
                                    g.getId(), g.getName(), g.getOriginalPrice(),
                                    g.getCurrentPrice(), g.getDiscountRate(), g.isPlusExclusive(),
                                    verdict
                            );
                        }).toList();

        // DTO 변환
        List<GameDetailResponse.PriceHistoryDto> historyDtos = histories.stream()
                .map(h -> new GameDetailResponse.PriceHistoryDto(
                        h.getRecordedAt().toLocalDate(),
                        h.getPrice(),
                        h.getDiscountRate(),
                        GameDetailResponse.calculateVerdict(h.getPrice(), originalPrice, lowestPrice, historySize)
                ))
                .toList();

        // 연관 게임 추천
        List<GameSearchResultDto> relatedGames = getRelatedGames(game);

        return GameDetailResponse.from(game, historyDtos, false, familyGames, relatedGames);
    }

    /**
     * 연관 게임 추천 조회
     * @param game 게임 엔티티
     * @return 연관 게임 리스트
     */
    private List<GameSearchResultDto> getRelatedGames(Game game) {
        List<Long> genreIds = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getId())
                .toList();

        if (genreIds.isEmpty()) return List.of();
        return gameRepository.findRelatedGames(genreIds, game.getId(), RECOMMEND_GAME_COUNT);
    }
}