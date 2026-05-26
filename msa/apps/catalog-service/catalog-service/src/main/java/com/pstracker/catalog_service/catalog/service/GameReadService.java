package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.config.GlobalCacheConfig;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameReadService {

    private static final int RECOMMEND_GAME_COUNT = 4;

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final CacheManager cacheManager;

    public void evictGameDetailCache(Long gameId) {
        if (gameId != null) {
            var cache = cacheManager.getCache(GlobalCacheConfig.GAME_DETAIL_CACHE);
            if (cache != null) {
                cache.evict(gameId);
                log.debug("🧹 Cache Evicted for Game ID: {}", gameId);
            }
        }
    }

    @Cacheable(value = GlobalCacheConfig.GAME_DETAIL_CACHE, key = "#gameId")
    public GameDetailResponse getBaseGameDetail(Long gameId) {
        Game game = gameRepository.findByIdWithGenres(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found: " + gameId));

        // 1. 가격 이력 → 차트 DTO + 판정에 필요한 컨텍스트
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(gameId);
        int historySize = histories.size();
        Integer originalPrice = game.getOriginalPrice() != null ? game.getOriginalPrice() : 0;
        Integer lowestPrice = game.getAllTimeLowPrice() != null ? game.getAllTimeLowPrice() : 0;

        List<GameDetailResponse.PriceHistoryDto> historyDtos = histories.stream()
                .map(h -> new GameDetailResponse.PriceHistoryDto(
                        h.getCreatedAt().toLocalDate(),
                        h.getPrice(),
                        h.getDiscountRate(),
                        PriceVerdictCalculator.forGame(h.getPrice(), originalPrice, lowestPrice, historySize)
                ))
                .toList();

        // 2. 패밀리 게임 (같은 시리즈/에디션) — 정가 오름차순
        List<GameDetailResponse.FamilyGameDto> familyGames = buildFamilyGames(game.getFamilyId());

        // 3. 연관 게임 (장르 기반 추천)
        List<GameDetailResponse.RelatedGameDto> relatedGames = buildRelatedGames(game);

        return GameDetailResponse.from(game, historyDtos, false, familyGames, relatedGames);
    }

    private List<GameDetailResponse.FamilyGameDto> buildFamilyGames(String familyId) {
        List<Game> familyList = gameRepository.findByFamilyIdOrderByOriginalPriceAsc(familyId);
        if (familyList.isEmpty()) return List.of();

        Map<Long, Integer> historyCountMap = countHistoryByGameIds(
                familyList.stream().map(Game::getId).toList());

        return familyList.stream()
                .map(g -> {
                    PriceVerdict verdict = PriceVerdictCalculator.forGame(
                            g.getCurrentPrice(), g.getOriginalPrice(), g.getAllTimeLowPrice(),
                            historyCountMap.getOrDefault(g.getId(), 0)
                    );
                    return new GameDetailResponse.FamilyGameDto(
                            g.getId(), g.getName(), g.getOriginalPrice(),
                            g.getCurrentPrice(), g.getDiscountRate(), g.isPlusExclusive(),
                            verdict
                    );
                })
                .toList();
    }

    private List<GameDetailResponse.RelatedGameDto> buildRelatedGames(Game game) {
        List<GameSearchResultDto> rawList = getRelatedGames(game);
        if (rawList.isEmpty()) return List.of();

        Map<Long, Integer> historyCountMap = countHistoryByGameIds(
                rawList.stream().map(GameSearchResultDto::getId).toList());

        return rawList.stream()
                .map(r -> {
                    PriceVerdict verdict = PriceVerdictCalculator.forGame(
                            r.getPrice(), r.getOriginalPrice(), r.getAllTimeLowPrice(),
                            historyCountMap.getOrDefault(r.getId(), 0)
                    );
                    return new GameDetailResponse.RelatedGameDto(
                            r.getId(), r.getName(), r.getImageUrl(),
                            r.getOriginalPrice(), r.getPrice(), r.getDiscountRate(),
                            r.getSaleEndDate(), r.getDisplayScore(), verdict
                    );
                })
                .toList();
    }

    /** gameId 목록으로 가격 이력 건수를 일괄 조회해 Map으로 반환 */
    private Map<Long, Integer> countHistoryByGameIds(List<Long> gameIds) {
        return priceHistoryRepository.countGroupByGameId(gameIds)
                .stream()
                .collect(Collectors.toMap(
                        arr -> (Long) arr[0],
                        arr -> ((Long) arr[1]).intValue()
                ));
    }

    private List<GameSearchResultDto> getRelatedGames(Game game) {
        List<Long> genreIds = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getId())
                .toList();
        if (genreIds.isEmpty()) return List.of();
        return gameRepository.findRelatedGames(genreIds, game.getId(), RECOMMEND_GAME_COUNT);
    }
}
