package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.domain.Genre;
import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.GenreRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private static final Integer RECOMMEND_GAME_COUNT = 4;

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final WishlistRepository wishlistRepository;
    private final GenreRepository genreRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final IgdbApiClient igdbApiClient;

    /**
     * 게임 데이터 수집 및 저장 (Upsert)
     * @param request 수집 요청 DTO
     */
    @Transactional
    public void upsertGameData(CollectRequestDto request) {
        // 1. 장르 데이터 준비 (String -> Entity Set)
        Set<Genre> genreEntities = resolveGenres(request.getGenreIds());

        // 2. 게임 엔티티 조회 또는 생성
        Game game = findOrCreateGame(request);

        // 3. 게임 메타데이터 업데이트 (제목, 설명, 이미지, 장르, 플랫폼)
        updateGameMetadata(game, request, genreEntities);

        // 4. 외부 API(IGDB)를 통한 평점 정보 보정
        updateGameRatingsFromIgdb(game, request);

        // 5. 게임 정보 저장
        gameRepository.save(game);

        // 6. 가격 정보 처리 (변동 감지, 저장, 알림)
        processPriceInfo(game, request);
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
                        request.getDescription()
                ));
    }

    /**
     * 게임 메타데이터 업데이트
     * @param game 게임 엔티티
     * @param request 수집 요청 DTO
     * @param genres 장르 엔티티 집합
     */
    private void updateGameMetadata(Game game, CollectRequestDto request, Set<Genre> genres) {
        // 설명 업데이트 정책: "Full Data Crawler"인 경우 기존 설명 유지(AI 요약본 보존)
        String descriptionToUpdate = "Full Data Crawler".equals(request.getDescription())
                ? game.getDescription()
                : request.getDescription();

        game.updateInfo(
                request.getTitle(),
                request.getEnglishTitle(),
                request.getPublisher(),
                request.getImageUrl(),
                descriptionToUpdate,
                genres
        );

        // 플랫폼 정보 최신화
        game.updatePlatforms(request.getPlatforms());
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

        // 변경 사항이 없으면 종료
        if (!shouldSaveHistory(latestHistoryOpt, request)) {
            log.debug("👌 Price Unchanged: {}", game.getName());
            return;
        }

        // 6-1. 이력 저장
        GamePriceHistory newHistory = GamePriceHistory.create(
                game, request.getOriginalPrice(), request.getCurrentPrice(),
                request.getDiscountRate(), request.isPlusExclusive(), request.getSaleEndDate()
        );
        priceHistoryRepository.save(newHistory);
        log.info("📈 Price Updated: {} ({} KRW)", game.getName(), request.getCurrentPrice());

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
                        request.getSaleEndDate()))
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
        LocalDateTime threshold = LocalDateTime.now().minusDays(1);
        LocalDate today = LocalDate.now();

        return gameRepository.findGamesToUpdate(threshold, today).stream()
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

        if (memberId != null && !result.isEmpty()) {
            markLikedGames(result.getContent(), memberId);
        }
        return result;
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
     * 게임 상세 정보 조회
     * @param gameId 게임 ID
     * @param memberId 회원 ID (찜 여부 확인용, null 가능)
     * @return 게임 상세 응답 DTO
     */
    public GameDetailResponse getGameDetail(Long gameId, Long memberId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found: " + gameId));

        // 가격 이력 조회 (최신순 정렬 등을 DB 레벨에서 처리하면 더 좋음)
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(gameId);
        GamePriceHistory currentInfo = histories.isEmpty() ? null : histories.get(histories.size() - 1);
        Integer lowestPrice = priceHistoryRepository.findLowestPriceByGameId(gameId);

        // DTO 변환
        List<GameDetailResponse.PriceHistoryDto> historyDtos = histories.stream()
                .map(h -> new GameDetailResponse.PriceHistoryDto(h.getRecordedAt().toLocalDate(), h.getPrice()))
                .toList();

        // 찜 여부 확인
        boolean isLiked = (memberId != null) && wishlistRepository.existsByMemberIdAndGameId(memberId, gameId);

        // 연관 게임 추천
        List<GameSearchResultDto> relatedGames = getRelatedGames(game);

        return GameDetailResponse.from(game, currentInfo, lowestPrice, historyDtos, isLiked, relatedGames);
    }

    /** 연관 게임 추천 로직
     * @param game 기준 게임 엔티티
     * @return 추천 게임 리스트
     */
    private List<GameSearchResultDto> getRelatedGames(Game game) {
        List<Long> genreIds = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getId())
                .toList();

        if (genreIds.isEmpty()) return List.of();

        return gameRepository.findRelatedGames(genreIds, game.getId(), RECOMMEND_GAME_COUNT);
    }
}