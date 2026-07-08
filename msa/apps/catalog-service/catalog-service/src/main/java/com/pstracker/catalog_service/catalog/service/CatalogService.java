package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.*;
import com.pstracker.catalog_service.catalog.dto.*;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.service.IgdbEnrichmentService;
import com.pstracker.catalog_service.catalog.repository.*;
import com.pstracker.catalog_service.global.client.collector.CollectorClientManager;
import com.pstracker.catalog_service.global.client.collector.dto.SingleCrawlRequest;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private static final String PS_STORE_BASE_URL = "https://store.playstation.com/ko-kr/product/";

    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final GameGenreRepository gameGenreRepository;
    private final WishlistRepository wishlistRepository;
    private final GenreRepository genreRepository;
    private final GameVoteRepository gameVoteRepository;
    private final CrawlJobRepository crawlJobRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final IgdbEnrichmentService igdbEnrichmentService;
    private final Executor igdbExecutor;

    private final GameReadService gameReadService;
    private final GameScouterService gameScouterService;
    private final CollectorClientManager clientManager;

    /**
     * 게임 데이터 수집 및 저장 (Upsert)
     * @param request 수집 요청 DTO
     */
    @Transactional
    public void upsertGameData(CollectRequest request) {

        // 가격 정보가 없거나 0원이면 아예 로직을 시작하지 않음
        if (request.getCurrentPrice() == null || request.getCurrentPrice() == 0) {
            log.warn("Invalid price data (0 or null). Skipping upsert for: {}", request.getTitle());
            return;
        }

        // IGDB 호출 선제 시작 — DB 작업과 병렬로 진행
        String searchTitle = StringUtils.hasText(request.getEnglishTitle())
                ? request.getEnglishTitle() : request.getTitle();
        CompletableFuture<IgdbGameResponse> igdbFuture =
                CompletableFuture.supplyAsync(() -> fetchIgdbSafely(searchTitle), igdbExecutor);

        Set<Genre> genreEntities = resolveGenres(request.getGenreIds());
        Game game = findOrCreateGame(request);
        boolean isNewGame = game.getId() == null;
        Integer oldOriginalPrice = game.getOriginalPrice();

        updateGameMetadata(game, request, genreEntities);
        boolean editionContentsChanged = game.updateEditionContents(request.getEditionContents());

        // DB 작업이 끝난 시점에 IGDB 결과 합류 (이미 완료됐을 가능성 높음)
        applyIgdbRatings(game, igdbFuture.join(), searchTitle);

        game.updatePriceSearchInfo(
                request.getOriginalPrice(),
                request.getCurrentPrice(),
                request.getDiscountRate(),
                request.isPlusExclusive(),
                request.getSaleEndDate(),
                request.isInCatalog()
        );

        // 정가가 영구 인하된 경우, 모순된 목표가를 가진 위시리스트 일괄 초기화
        Integer newOriginalPrice = request.getOriginalPrice();
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
        boolean isRecentRelease = request.getReleaseDate() != null
                && request.getReleaseDate().isAfter(LocalDate.now().minusMonths(1));
        if (isNewGame || isRecentRelease) {
            requeueRecentGameForScraping(game.getId(), CrawlJob.TargetType.METACRITIC);
            requeueRecentGameForScraping(game.getId(), CrawlJob.TargetType.HLTB);
        }
    }

    /**
     * 장르 문자열 파싱 및 엔티티 매핑
     * - 1번의 IN절 SELECT로 기존 장르를 한꺼번에 조회하고, 없는 장르만 saveAll()로 배치 저장
     * @param genreIds 콤마 구분 장르 문자열
     * @return 장르 엔티티 집합
     */
    private Set<Genre> resolveGenres(String genreIds) {
        if (!StringUtils.hasText(genreIds)) return new HashSet<>();

        List<String> names = Arrays.stream(genreIds.split(","))
                .map(String::strip)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();

        if (names.isEmpty()) return new HashSet<>();

        // 1번의 IN절 SELECT로 기존 장르 모두 조회
        Map<String, Genre> existingByName = genreRepository.findByNameIn(names)
                .stream()
                .collect(Collectors.toMap(Genre::getName, g -> g));

        // 없는 장르만 골라서 saveAll()로 배치 저장 (jdbc.batch_size 설정이 적용됨)
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

    /**
     * 게임 엔티티 조회 또는 신규 생성
     * @param request 수집 요청 DTO
     * @return 게임 엔티티
     */
    private Game findOrCreateGame(CollectRequest request) {
        return gameRepository.findByPsStoreIdWithGenres(request.getPsStoreId())
                .orElseGet(() -> Game.create(
                        request.getPsStoreId(),
                        request.getTitle(),
                        request.getEnglishTitle(),
                        request.getPublisher(),
                        request.getImageUrl(),
                        request.getDescription(),
                        request.getReleaseDate()
                ));
    }

    /**
     * 게임 메타데이터 업데이트
     * @param game 게임 엔티티
     * @param request 수집 요청 DTO
     * @param genres 장르 엔티티 집합
     */
    private void updateGameMetadata(Game game, CollectRequest request, Set<Genre> genres) {
        game.updateInfo(
                request.getTitle(),
                request.getEnglishTitle(),
                request.getPublisher(),
                request.getImageUrl(),
                request.getDescription(),
                request.getReleaseDate(),
                genres,
                request.isPs5ProEnhanced()
        );

        // 플랫폼 정보 최신화
        Set<Platform> platforms = resolvePlatforms(request.getPlatforms());
        game.updatePlatforms(platforms);
    }

    /**
     * 플랫폼 문자열 파싱 및 Enum 매핑
     * @param platformNames 플랫폼 이름 리스트
     * @return 플랫폼 Enum 집합
     */
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

    /**
     * IGDB 평점을 게임 엔티티에 적용한다.
     * igdbInfo가 null(Miss/실패)이면 기존 값을 그대로 유지한다.
     */
    private void applyIgdbRatings(Game game, IgdbGameResponse igdbInfo, String searchTitle) {
        if (igdbInfo == null) {
            log.debug("IGDB Miss or Failed: {}", searchTitle);
            return;
        }
        Integer criticScore = igdbInfo.criticScore() != null ? (int) Math.round(igdbInfo.criticScore()) : null;
        game.updateIgdbRatings(criticScore, igdbInfo.criticCount(), igdbInfo.userScore(), igdbInfo.userCount());
        log.debug("IGDB Ratings updated for: {}", searchTitle);
    }

    /**
     * IGDB API 호출 — 예외 발생 시 null 반환 (내부 로직에 영향 없음)
     */
    private IgdbGameResponse fetchIgdbSafely(String searchTitle) {
        try {
            return igdbEnrichmentService.searchGame(searchTitle);
        } catch (Exception e) {
            log.warn("IGDB Sync Failed for '{}': {}", searchTitle, e.getMessage());
            return null;
        }
    }

    /**
     * 가격 정보 처리: 변동 감지, 이력 저장, 가격 하락 알림 발행
     * @param game 게임 엔티티
     * @param request 수집 요청 DTO
     */
    private void processPriceInfo(Game game, CollectRequest request) {
        Optional<GamePriceHistory> latestHistoryOpt = priceHistoryRepository.findTopByGameOrderByCreatedAtDesc(game);

        if (!shouldSaveHistory(latestHistoryOpt, request)) {
            return;
        }

        priceHistoryRepository.save(GamePriceHistory.create(
                game,
                request.getOriginalPrice(),
                request.getCurrentPrice(),
                request.getDiscountRate(),
                request.isPlusExclusive(),
                request.getSaleEndDate(),
                request.isInCatalog()
        ));
        log.debug("Price Updated: {} ({} KRW)", game.getName(), request.getCurrentPrice());

        publishAlertIfDropped(game, latestHistoryOpt, request.getCurrentPrice(), request.getDiscountRate());
    }

    /**
     * 가격 정보 변경 여부 판단
     * @param latestHistoryOpt 최신 가격 이력 Optional
     * @param request 수집 요청 DTO
     * @return 변경되었으면 true, 아니면 false
     */
    private boolean shouldSaveHistory(Optional<GamePriceHistory> latestHistoryOpt, CollectRequest request) {
        return latestHistoryOpt
                .map(history -> !history.isSameCondition(
                        request.getCurrentPrice(),
                        request.getDiscountRate(),
                        request.isPlusExclusive(),
                        request.getSaleEndDate(),
                        request.isInCatalog()))
                .orElse(true); // 이력이 없으면 무조건 저장
    }

    /**
     * 가격 하락 시 알림 이벤트 발행
     * @param game 게임 엔티티
     * @param oldHistoryOpt 이전 가격 이력 Optional
     * @param newPrice 새로운 가격
     * @param newDiscountRate 새로운 할인율
     */
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

    /**
     * 업데이트가 필요한 게임 목록 조회 (지난 1일간 업데이트되지 않은 게임)
     * @return 업데이트 대상 게임 PS 스토어 URL 리스트
     */
    public List<String> getGamesToUpdate() {
        LocalDate today = LocalDate.now();
        return gameRepository.findGamesToUpdate(today.atStartOfDay(), today).stream()
                .map(game -> PS_STORE_BASE_URL + game.getPsStoreId())
                .toList();
    }

    /**
     * 게임 검색
     * @param condition 검색 조건
     * @param pageable 페이징 정보
     * @param memberId 회원 ID (찜 여부 확인용, null 가능)
     * @return 검색 결과 페이지
     */
    public Page<GameSearchResponse> searchGames(GameSearchCondition condition, Pageable pageable, Long memberId) {
        Pageable safe = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 50), pageable.getSort());

        if (Boolean.TRUE.equals(condition.getCuration())) {
            return gameReadService.searchGamesForCuration(condition, safe);
        }

        Page<GameSearchResponse> result = gameRepository.searchGames(condition, safe);
        if (!result.isEmpty()) {
            enrichSearchResults(result.getContent(), memberId);
        }
        return result;
    }

    public void refreshCurationCache() {
        gameReadService.refreshCurationCache();
    }

    /**
     * 게임 상세 정보 조회 (찜 여부 포함)
     * @param gameId 게임 ID
     * @param memberId 회원 ID (찜여부 확인용)
     * @return 게임 상세 응답 DTO
     */
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
        String[] defenseInfo = gameScouterService.calculateDefenseTier(
                baseResponse.originalPrice(),
                baseResponse.currentPrice(),
                baseResponse.lowestPrice(),
                baseResponse.isPlusExclusive(),
                baseResponse.releaseDate(),
                baseResponse.priceHistory()
        );

        return baseResponse.withDynamicData(
                isLiked, userVote,
                totalWatchers, avgTargetPrice, myTargetPrice, defenseInfo[0], defenseInfo[1]
        );
    }

    /**
     * 게임 삭제 (관리자 전용)
     * @param gameId 삭제할 게임 ID
     */
    @Transactional
    public void deleteGame(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("해당 게임을 찾을 수 없습니다. id=" + gameId));

        gameRepository.delete(game);

        // 삭제 후 캐시도 제거
        gameReadService.evictGameDetailCache(gameId);
    }

    /** 검색 결과에 장르·찜 여부·가격 판정을 일괄 세팅 (gameIds 추출 1회) */
    private void enrichSearchResults(List<GameSearchResponse> games, Long memberId) {
        List<Long> gameIds = games.stream().map(GameSearchResponse::getId).toList();

        Map<Long, List<String>> gameGenreMap = gameGenreRepository.findGameGenres(gameIds)
                .stream()
                .collect(Collectors.groupingBy(
                        GameGenreResult::getGameId,
                        Collectors.mapping(GameGenreResult::getGenreName, Collectors.toList())));
        games.forEach(dto -> dto.setGenres(gameGenreMap.getOrDefault(dto.getId(), List.of())));

        if (memberId != null) {
            Set<Long> likedIds = new HashSet<>(wishlistRepository.findGameIdsByMemberIdAndGameIdIn(memberId, gameIds));
            games.forEach(dto -> dto.setLiked(likedIds.contains(dto.getId())));
        }

        Map<Long, Integer> historyCountMap = priceHistoryRepository.countGroupByGameId(gameIds)
                .stream()
                .collect(Collectors.toMap(
                        arr -> (Long) arr[0],
                        arr -> ((Long) arr[1]).intValue()
                ));
        games.forEach(dto -> {
            int historySize = historyCountMap.getOrDefault(dto.getId(), 0);
            PriceVerdict verdict = PriceVerdictCalculator.forGame(
                    dto.getPrice(), dto.getOriginalPrice(), dto.getAllTimeLowPrice(), historySize);
            dto.setPriceVerdict(verdict.name());
        });
    }

    /**
     * 단일 게임에 대해 수동으로 크롤러 트리거
     * @param gameId 게임 ID
     */
    public void triggerSingleGameRefresh(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        String targetUrl = PS_STORE_BASE_URL + game.getPsStoreId();

        log.info("Triggering manual crawl for: {} ({})", game.getName(), targetUrl);

        try {
            String response = clientManager.getPrimary().triggerSingleCrawl(new SingleCrawlRequest(targetUrl, internalSecretKey));
            log.info("Crawler Response: {}", response);
        } catch (Exception e) {
            log.error("Crawler Trigger Failed: {}", e.getMessage());
            throw new RuntimeException("크롤러 서버 연결 실패: " + e.getMessage());
        }
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