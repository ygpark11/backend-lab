package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.*;
import com.pstracker.catalog_service.catalog.dto.*;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.catalog.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    @Value("${crawler.single-url}")
    private String CRAWLER_URL;
    @Value("${crawler.secret-key}")
    private String internalSecretKey;

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final GameGenreRepository gameGenreRepository;
    private final WishlistRepository wishlistRepository;
    private final GenreRepository genreRepository;
    private final GameVoteRepository gameVoteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final IgdbApiClient igdbApiClient;

    private final GameReadService gameReadService;

    /**
     * 게임 데이터 수집 및 저장 (Upsert)
     * @param request 수집 요청 DTO
     */
    @Transactional
    public void upsertGameData(CollectRequestDto request) {

        // 가격 정보가 없거나 0원이면 아예 로직을 시작하지 않음
        if (request.getCurrentPrice() == null || request.getCurrentPrice() == 0) {
            log.warn("⚠️ Invalid price data (0 or null). Skipping upsert for: {}", request.getTitle());
            return;
        }

        // 1. 장르 데이터 준비 (String -> Entity Set)
        Set<Genre> genreEntities = resolveGenres(request.getGenreIds());

        // 2. 게임 엔티티 조회 또는 생성
        Game game = findOrCreateGame(request);

        // 3. 게임 메타데이터 업데이트 (제목, 설명, 이미지, 장르, 플랫폼)
        updateGameMetadata(game, request, genreEntities);

        // 4. 외부 API(IGDB)를 통한 평점 정보 보정
        updateGameRatingsFromIgdb(game, request);

        // 역정규화된 가격 검색용 정보 업데이트
        game.updatePriceSearchInfo(
                request.getOriginalPrice(),
                request.getCurrentPrice(),
                request.getDiscountRate(),
                request.isPlusExclusive(),
                request.getSaleEndDate(),
                request.isInCatalog()
        );

        // 5. 게임 정보 저장
        gameRepository.save(game);

        // 6. 가격 정보 처리 (변동 감지, 저장, 알림)
        processPriceInfo(game, request);

        // 7. 모든 변경이 끝난 후 마지막에 캐시 삭제!
        // 다음 조회 시 최신 데이터로 다시 캐싱됨
        gameReadService.evictGameDetailCache(game.getId());
    }

    /**
     * 장르 문자열 파싱 및 엔티티 매핑
     * @param genreIds 콤마 구분 장르 문자열
     * @return 장르 엔티티 집합
     */
    private Set<Genre> resolveGenres(String genreIds) {
        Set<Genre> genreEntities = new HashSet<>();
        if (!StringUtils.hasText(genreIds)) {
            return genreEntities;
        }

        String[] genreNames = genreIds.split(",");
        for (String name : genreNames) {
            String cleanName = name.strip();
            if (cleanName.isBlank()) continue;

            // 캐싱 도입 시 성능 최적화 포인트 (현재는 DB 조회)
            Genre genre = genreRepository.findByName(cleanName)
                    .orElseGet(() -> genreRepository.save(new Genre(cleanName)));
            genreEntities.add(genre);
        }
        return genreEntities;
    }

    /**
     * 게임 엔티티 조회 또는 신규 생성
     * @param request 수집 요청 DTO
     * @return 게임 엔티티
     */
    private Game findOrCreateGame(CollectRequestDto request) {
        return gameRepository.findByPsStoreId(request.getPsStoreId())
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
    private void updateGameMetadata(Game game, CollectRequestDto request, Set<Genre> genres) {
        game.updateInfo(
                request.getTitle(),
                request.getEnglishTitle(),
                request.getPublisher(),
                request.getImageUrl(),
                request.getDescription(),
                request.getReleaseDate(),
                genres
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
                log.warn("⚠️ Unknown Platform detected: {}", name);
            }
        }
        return platforms;
    }

    /**
     * IGDB API를 통한 평점 정보 업데이트
     * @param game 게임 엔티티
     * @param request 수집 요청 DTO
     */
    private void updateGameRatingsFromIgdb(Game game, CollectRequestDto request) {
        try {
            String rawEnglishTitle = request.getEnglishTitle();
            String searchTitle = StringUtils.hasText(rawEnglishTitle) ? rawEnglishTitle : request.getTitle();

            log.debug("🎯 Fetching IGDB ratings for: {}", searchTitle);
            IgdbGameResponse igdbInfo = igdbApiClient.searchGame(searchTitle);

            if (igdbInfo != null) {
                Integer metaScore = (igdbInfo.criticScore() != null) ? (int) Math.round(igdbInfo.criticScore()) : null;
                Double userScore = igdbInfo.userScore();

                game.updateRatings(metaScore, userScore);
                log.debug("⭐ Ratings updated: Meta={}, User={}", metaScore, userScore);
            } else {
                log.debug("🌫️ IGDB Miss: {}", searchTitle);
            }
        } catch (Exception e) {
            // 외부 API 장애가 내부 로직에 영향을 주지 않도록 처리
            log.warn("⚠️ IGDB Sync Failed for '{}': {}", request.getTitle(), e.getMessage());
        }
    }

    /**
     * 가격 정보 처리: 변동 감지, 이력 저장, 가격 하락 알림 발행
     * @param game 게임 엔티티
     * @param request 수집 요청 DTO
     */
    private void processPriceInfo(Game game, CollectRequestDto request) {
        Optional<GamePriceHistory> latestHistoryOpt = priceHistoryRepository.findTopByGameOrderByRecordedAtDesc(game);

        // [방어 로직 1] 가격 데이터 자체가 이상하면(0원 등) 저장하지 않음 (이미 크롤러에서 막았지만 이중 잠금)
        if (request.getCurrentPrice() == null || request.getCurrentPrice() == 0) {
            return;
        }

        // 변경 사항이 없으면 종료
        if (!shouldSaveHistory(latestHistoryOpt, request)) {
            return;
        }

        // 6-1. 이력 저장
        GamePriceHistory newHistory = GamePriceHistory.create(
                game,
                request.getOriginalPrice(),
                request.getCurrentPrice(),
                request.getDiscountRate(),
                request.isPlusExclusive(),
                request.getSaleEndDate(),
                request.isInCatalog()
        );

        priceHistoryRepository.save(newHistory);
        log.debug("📈 Price Updated: {} ({} KRW)", game.getName(), request.getCurrentPrice());

        // 6-2. 가격 하락 알림 발행
        publishAlertIfDropped(game, latestHistoryOpt, request.getCurrentPrice(), request.getDiscountRate());
    }

    /**
     * 가격 정보 변경 여부 판단
     * @param latestHistoryOpt 최신 가격 이력 Optional
     * @param request 수집 요청 DTO
     * @return 변경되었으면 true, 아니면 false
     */
    private boolean shouldSaveHistory(Optional<GamePriceHistory> latestHistoryOpt, CollectRequestDto request) {
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
            log.info("🚨 Price Drop! {} ({} -> {})", game.getName(), oldPrice, newPrice);
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
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDate today = LocalDate.now();

        return gameRepository.findGamesToUpdate(todayStart, today).stream()
                .map(game -> "https://store.playstation.com/ko-kr/product/" + game.getPsStoreId())
                .toList();
    }

    /**
     * 게임 검색
     * @param condition 검색 조건
     * @param pageable 페이징 정보
     * @param memberId 회원 ID (찜 여부 확인용, null 가능)
     * @return 검색 결과 페이지
     */
    public Page<GameSearchResultDto> searchGames(GameSearchCondition condition, Pageable pageable, Long memberId) {
        Page<GameSearchResultDto> result = gameRepository.searchGames(condition, pageable);

        if(!result.isEmpty()) {
            markGameGenre(result.getContent());

            if (memberId != null) {
                markLikedGames(result.getContent(), memberId);
            }
        }

        return result;
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

        boolean isLiked = false;
        VoteType userVote = null;

        // 2. 유저별 동적 데이터(찜 여부, 투표 상태)는 실시간 DB 조회 (비로그인이면 Pass)
        if (memberId != null) {
            isLiked = wishlistRepository.existsByMemberIdAndGameId(memberId, gameId);

            // 🚀 로그인한 유저의 투표 상태 확인
            userVote = gameVoteRepository.findByMemberIdAndGameId(memberId, gameId)
                    .map(GameVote::getVoteType)
                    .orElse(null);
        }

        // 3. 캐시된 객체의 내용을 재사용하되, liked 상태만 변경해서 반환
        return baseResponse.withDynamicData(isLiked, userVote);
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

    /**
     * 검색 결과에 장르 정보 표시
     * @param games 게임 검색 결과 리스트
     */
    private void markGameGenre(List<GameSearchResultDto> games) {
        List<Long> gameIds = games.stream().map(GameSearchResultDto::getId).toList();

        List<GameGenreResultDto> gameGenres = gameGenreRepository.findGameGenres(gameIds);

        Map<Long, List<String>> gameGenreMap = gameGenres.stream()
                .collect(Collectors.groupingBy(
                        GameGenreResultDto::getGameId, Collectors.mapping(GameGenreResultDto::getGenreName, Collectors.toList())));

        games.forEach(dto -> {
            dto.setGenres(gameGenreMap.getOrDefault(dto.getId(), List.of()));
        });
    }

    /**
     * 검색 결과에 찜 여부 표시
     * @param games 게임 검색 결과 리스트
     * @param memberId 회원 ID
     */
    private void markLikedGames(List<GameSearchResultDto> games, Long memberId) {
        List<Long> gameIds = games.stream().map(GameSearchResultDto::getId).toList();
        Set<Long> myLikedGameIds = new HashSet<>(wishlistRepository.findGameIdsByMemberIdAndGameIdIn(memberId, gameIds));

        games.forEach(dto -> {
            if (myLikedGameIds.contains(dto.getId())) {
                dto.setLiked(true);
            }
        });
    }

    /**
     * 단일 게임에 대해 수동으로 크롤러 트리거
     * @param gameId 게임 ID
     */
    public void triggerSingleGameRefresh(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        String targetUrl = "https://store.playstation.com/ko-kr/product/" + game.getPsStoreId();

        log.info("🚀 Triggering manual crawl for: {} ({})", game.getName(), targetUrl);

        RestClient restClient = RestClient.create();
        try {
            String response = restClient.post()
                    .uri(CRAWLER_URL)
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "url", targetUrl,
                            "secretKey", internalSecretKey
                    ))
                    .retrieve()
                    .body(String.class);

            log.info("✅ Crawler Response: {}", response);
        } catch (Exception e) {
            log.error("❌ Crawler Trigger Failed: {}", e.getMessage());
            throw new RuntimeException("크롤러 서버 연결 실패: " + e.getMessage());
        }
    }

}