package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.*;
import com.pstracker.catalog_service.catalog.dto.*;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.repository.*;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogService {

    private static final String PS_STORE_BASE_URL = "https://store.playstation.com/ko-kr/product/";

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final GameGenreRepository gameGenreRepository;
    private final WishlistRepository wishlistRepository;
    private final GenreRepository genreRepository;
    private final GameVoteRepository gameVoteRepository;
    private final CrawlJobRepository crawlJobRepository;
    private final ApplicationEventPublisher eventPublisher;

    private final GameReadService gameReadService;
    private final GameScouterService gameScouterService;

    @Transactional
    public void upsertGameData(CollectRequest request) {

        // 가격 정보가 없거나 0원이면 아예 로직을 시작하지 않음
        if (request.currentPrice() == null || request.currentPrice() == 0) {
            log.warn("Invalid price data (0 or null). Skipping upsert for: {}", request.title());
            return;
        }

        Set<Genre> genreEntities = resolveGenres(request.genreIds());
        Game game = findOrCreateGame(request);
        boolean isNewGame = game.getId() == null;
        Integer oldOriginalPrice = game.getOriginalPrice();

        updateGameMetadata(game, request, genreEntities);
        boolean editionContentsChanged = game.updateEditionContents(request.editionContents());

        game.updatePriceSearchInfo(
                request.originalPrice(),
                request.currentPrice(),
                request.discountRate(),
                request.isPlusExclusive(),
                request.saleEndDate(),
                request.inCatalog()
        );

        // 정가가 영구 인하된 경우, 모순된 목표가를 가진 위시리스트 일괄 초기화
        Integer newOriginalPrice = request.originalPrice();
        if (oldOriginalPrice != null && newOriginalPrice != null && newOriginalPrice < oldOriginalPrice) {
            wishlistRepository.resetInvalidTargetPrices(game.getId(), newOriginalPrice);
            log.debug("정가 영구 인하 감지 ({} -> {}). 관련 목표 가격 초기화 완료.", oldOriginalPrice, newOriginalPrice);
        }

        gameRepository.save(game);
        processPriceInfo(game, request);
        gameReadService.evictGameDetailCache(game.getId());

        // editionContents 변경 시에만 같은 family 게임들의 캐시도 무효화
        // (다른 에디션 상세 페이지의 familyGames 배열 안에 있는 이 게임의 contents가 stale해지기 때문)
        if (editionContentsChanged) {
            gameReadService.evictFamilyGameDetailCaches(game.getFamilyId(), game.getId());
        }

        // 신규 게임 또는 최근 출시(1개월 이내)면 메타크리틱/HLTB 스크래핑 큐에 등록
        boolean isRecentRelease = request.releaseDate() != null
                && request.releaseDate().isAfter(LocalDate.now().minusMonths(1));
        if (isNewGame || isRecentRelease) {
            requeueRecentGameForScraping(game.getId(), CrawlJob.TargetType.METACRITIC);
            requeueRecentGameForScraping(game.getId(), CrawlJob.TargetType.HLTB);
        }
    }

    private Set<Genre> resolveGenres(String genreIds) {
        if (!StringUtils.hasText(genreIds)) return new HashSet<>();

        List<String> names = Arrays.stream(genreIds.split(","))
                .map(String::strip)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();

        if (names.isEmpty()) return new HashSet<>();

        Map<String, Genre> existingByName = genreRepository.findByNameIn(names)
                .stream()
                .collect(Collectors.toMap(Genre::getName, g -> g));

        List<Genre> toSave = names.stream()
                .filter(name -> !existingByName.containsKey(name))
                .map(Genre::new)
                .toList();

        if (!toSave.isEmpty()) {
            try {
                genreRepository.saveAll(toSave)
                        .forEach(g -> existingByName.put(g.getName(), g));
            } catch (Exception e) {
                // 동시 수집 시 unique 충돌 가능 → 재조회로 마무리
                log.warn("장르 저장 중 충돌 감지, 재조회합니다: {}", e.getMessage());
                genreRepository.findByNameIn(toSave.stream().map(Genre::getName).toList())
                        .forEach(g -> existingByName.put(g.getName(), g));
            }
        }

        return new HashSet<>(existingByName.values());
    }

    private Game findOrCreateGame(CollectRequest request) {
        return gameRepository.findByPsStoreIdWithGenres(request.psStoreId())
                .orElseGet(() -> Game.create(
                        request.psStoreId(),
                        request.title(),
                        request.englishTitle(),
                        request.publisher(),
                        request.imageUrl(),
                        request.description(),
                        request.releaseDate()
                ));
    }

    private void updateGameMetadata(Game game, CollectRequest request, Set<Genre> genres) {
        game.updateInfo(
                request.title(),
                request.englishTitle(),
                request.publisher(),
                request.imageUrl(),
                request.description(),
                request.releaseDate(),
                genres,
                request.isPs5ProEnhanced()
        );

        Set<Platform> platforms = resolvePlatforms(request.platforms());
        game.updatePlatforms(platforms);
    }

    private Set<Platform> resolvePlatforms(List<String> platformNames) {
        Set<Platform> platforms = new HashSet<>();
        if (platformNames == null || platformNames.isEmpty()) {
            return platforms;
        }

        for (String name : platformNames) {
            try {
                platforms.add(Platform.valueOf(name.toUpperCase().trim()));
            } catch (IllegalArgumentException e) {
                log.warn("Unknown Platform detected: {}", name);
            }
        }
        return platforms;
    }

    private void processPriceInfo(Game game, CollectRequest request) {
        Optional<GamePriceHistory> latestHistoryOpt = priceHistoryRepository.findTopByGameOrderByCreatedAtDesc(game);

        if (!shouldSaveHistory(latestHistoryOpt, request)) {
            return;
        }

        priceHistoryRepository.save(GamePriceHistory.create(
                game,
                request.originalPrice(),
                request.currentPrice(),
                request.discountRate(),
                request.isPlusExclusive(),
                request.saleEndDate(),
                request.inCatalog()
        ));
        log.debug("Price Updated: {} ({} KRW)", game.getName(), request.currentPrice());

        publishAlertIfDropped(game, latestHistoryOpt, request.currentPrice(), request.discountRate());
    }

    private boolean shouldSaveHistory(Optional<GamePriceHistory> latestHistoryOpt, CollectRequest request) {
        return latestHistoryOpt
                .map(history -> !history.isSameCondition(
                        request.currentPrice(),
                        request.discountRate(),
                        request.isPlusExclusive(),
                        request.saleEndDate(),
                        request.inCatalog()))
                .orElse(true); // 이력이 없으면 무조건 저장
    }

    private void publishAlertIfDropped(Game game, Optional<GamePriceHistory> oldHistoryOpt, int newPrice, int newDiscountRate) {
        if (oldHistoryOpt.isEmpty()) return;

        Integer oldPrice = oldHistoryOpt.get().getPrice();
        if (newPrice < oldPrice) {
            log.info("Price Drop! {} ({} -> {})", game.getName(), oldPrice, newPrice);
            eventPublisher.publishEvent(new GamePriceChangedEvent(
                    game.getId(), game.getName(), game.getPsStoreId(),
                    oldPrice, newPrice, newDiscountRate, game.getImageUrl()
            ));
        }
    }

    @Transactional(readOnly = true)
    public List<GameTargetResponse> getGamesToUpdate() {
        LocalDate today = LocalDate.now();
        return gameRepository.findGamesToUpdate(today.atStartOfDay(), today).stream()
                .map(game -> new GameTargetResponse(game.getId(), PS_STORE_BASE_URL + game.getPsStoreId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GameSuggestResponse> suggestGames(String keyword, int limit) {
        return gameRepository.suggestByName(keyword, limit);
    }

    @Transactional(readOnly = true)
    public Page<GameSearchResponse> searchGames(GameSearchCondition condition, Pageable pageable, Long memberId) {
        Pageable safe = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 50), pageable.getSort());

        if (Boolean.TRUE.equals(condition.getCuration())) {
            return gameReadService.searchGamesForCuration(condition, safe);
        }

        Page<GameSearchResponse> result = gameRepository.searchGames(condition, safe);
        if (result.isEmpty()) {
            return result;
        }
        return enrichSearchResults(result, memberId);
    }

    @Transactional(readOnly = true)
    public GameDetailResponse getGameDetail(Long gameId, Long memberId) {
        // 1. 순수 게임 정보 가져오기 (캐시 적용됨)
        GameDetailResponse baseResponse = gameReadService.getBaseGameDetail(gameId);

        // 2. 유저별 동적 데이터 순차 조회
        Optional<Wishlist> myWish = memberId != null
                ? wishlistRepository.findByMemberIdAndGameId(memberId, gameId)
                : Optional.empty();
        Optional<GameVote> myVote = memberId != null
                ? gameVoteRepository.findByMemberIdAndGameId(memberId, gameId)
                : Optional.empty();
        int totalWatchers = wishlistRepository.countByGameId(gameId);

        // 3. 결과 조합
        boolean isLiked = myWish.isPresent();
        Integer myTargetPrice = myWish.map(Wishlist::getTargetPrice).orElse(null);
        VoteType userVote = myVote.map(GameVote::getVoteType).orElse(null);

        Integer avgTargetPrice = (totalWatchers >= 2)
                ? wishlistRepository.getAverageTargetPriceByGameId(gameId)
                : null;

        // 4. 방어력 티어 계산 (캐시된 이력 데이터 활용)
        GameDetailResponse.DefenseInfo defenseInfo = gameScouterService.calculateDefenseTier(
                baseResponse.originalPrice(),
                baseResponse.currentPrice(),
                baseResponse.lowestPrice(),
                baseResponse.releaseDate(),
                baseResponse.priceHistory()
        );

        return baseResponse.withDynamicData(
                isLiked, userVote,
                totalWatchers, avgTargetPrice, myTargetPrice, defenseInfo
        );
    }

    /** 검색 결과에 장르·찜 여부·가격 판정을 일괄 세팅 (gameIds 추출 1회) */
    private Page<GameSearchResponse> enrichSearchResults(Page<GameSearchResponse> page, Long memberId) {
        List<Long> gameIds = page.getContent().stream().map(GameSearchResponse::id).toList();

        Map<Long, List<String>> gameGenreMap = gameGenreRepository.findGameGenres(gameIds)
                .stream()
                .collect(Collectors.groupingBy(
                        GameGenreResult::gameId,
                        Collectors.mapping(GameGenreResult::genreName, Collectors.toList())));

        Set<Long> likedIds = memberId != null
                ? new HashSet<>(wishlistRepository.findGameIdsByMemberIdAndGameIdIn(memberId, gameIds))
                : Set.of();

        Map<Long, Integer> historyCountMap = priceHistoryRepository.countMapByGameIds(gameIds);

        return page.map(dto -> {
            int historySize = historyCountMap.getOrDefault(dto.id(), 0);
            PriceVerdict verdict = PriceVerdictCalculator.forGame(
                    dto.price(), dto.originalPrice(), dto.allTimeLowPrice(), historySize);
            return dto.withEnriched(
                    gameGenreMap.getOrDefault(dto.id(), List.of()),
                    likedIds.contains(dto.id()),
                    verdict.name()
            );
        });
    }

    private void requeueRecentGameForScraping(Long gameId, CrawlJob.TargetType targetType) {
        // 1. 이미 큐에서 대기 중이거나 작업 중이면 무시
        List<CrawlJob.JobStatus> activeStatuses = List.of(CrawlJob.JobStatus.PENDING, CrawlJob.JobStatus.PROCESSING);
        if (crawlJobRepository.existsByGameIdAndTargetTypeAndStatusIn(gameId, targetType, activeStatuses)) {
            return;
        }

        // 2. 예전에 수집된 이력(DONE, FAILED)이 있다면 PENDING 으로 덮어쓰기
        List<CrawlJob.JobStatus> finishedStatuses = List.of(CrawlJob.JobStatus.DONE, CrawlJob.JobStatus.FAILED, CrawlJob.JobStatus.ERROR);
        int updatedRows = crawlJobRepository.requeueFinishedJob(
                gameId,
                targetType,
                CrawlJob.JobStatus.PENDING,
                finishedStatuses
        );

        // 3. 이력이 아예 없는 경우 신규 생성
        if (updatedRows == 0) {
            crawlJobRepository.save(CrawlJob.create(gameId, targetType));
        }
    }

}