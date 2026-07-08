package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResponse;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.config.GlobalCacheConfig;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /**
     * 큐레이션 테마 미리보기 검색 (캐시 적용).
     * enrichSearchResults(장르·가격판정·찜 여부 세팅)를 거치지 않은 raw 결과를 캐싱.
     * CurationPage 미리보기는 imageUrl·name만 사용하므로 enrichment 불필요.
     * sort가 달라도 다른 캐시 항목이 되도록 pageable.sort를 키에 포함.
     */
    @Cacheable(cacheNames = GlobalCacheConfig.CURATION_CACHE,
               key = "#condition.curationCacheKey() + '_' + #pageable.sort.toString()")
    public Page<GameSearchResponse> searchGamesForCuration(GameSearchCondition condition, Pageable pageable) {
        return gameRepository.searchGames(condition, pageable);
    }

    public void refreshCurationCache() {
        var cache = cacheManager.getCache(GlobalCacheConfig.CURATION_CACHE);
        if (cache != null) {
            cache.clear();
            log.info("큐레이션 로컬 캐시(Caffeine) 전체 초기화 완료.");
        }
    }

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
     * 같은 familyId를 공유하는 다른 에디션들의 캐시를 일괄 무효화.
     * editionContents가 변경된 경우에만 호출해야 함.
     * 이미 단건 evict된 currentGameId는 제외.
     */
    public void evictFamilyGameDetailCaches(String familyId, Long currentGameId) {
        if (familyId == null) return;
        var cache = cacheManager.getCache(GlobalCacheConfig.GAME_DETAIL_CACHE);
        if (cache == null) return;

        gameRepository.findIdsByFamilyId(familyId).stream()
                .filter(id -> !id.equals(currentGameId))
                .forEach(id -> {
                    cache.evict(id);
                    log.debug("🧹 Family Cache Evicted for Game ID: {}", id);
                });
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
                            verdict, g.getEditionContents()
                    );
                })
                .toList();
    }

    private List<GameDetailResponse.RelatedGameDto> buildRelatedGames(Game game) {
        List<GameSearchResponse> rawList = getRelatedGames(game);
        if (rawList.isEmpty()) return List.of();

        Map<Long, Integer> historyCountMap = countHistoryByGameIds(
                rawList.stream().map(GameSearchResponse::getId).toList());

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

    private List<GameSearchResponse> getRelatedGames(Game game) {
        List<Long> genreIds = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getId())
                .toList();
        if (genreIds.isEmpty()) return List.of();
        return gameRepository.findRelatedGames(genreIds, game.getId(), RECOMMEND_GAME_COUNT);
    }
}
