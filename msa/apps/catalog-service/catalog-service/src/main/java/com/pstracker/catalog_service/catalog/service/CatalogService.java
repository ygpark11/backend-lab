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
     * 크롤러가 수집한 데이터를 저장/갱신하는 핵심 로직
     * 원칙: "가격 정보는 변동이 있을 때만 INSERT 한다."
     */
    @Transactional
    public void upsertGameData(CollectRequestDto request) {

        // 1. 장르 데이터 처리 (String "액션, 공포" -> Set<Genre> 엔티티 변환)
        Set<Genre> genreEntities = new HashSet<>();
        if (StringUtils.hasText(request.getGenreIds())) {
            // 콤마로 구분된 문자열을 쪼갬
            String[] genreNames = request.getGenreIds().split(",");

            for (String name : genreNames) {
                String cleanName = name.strip();
                if (cleanName.isBlank()) continue;

                // DB에 있으면 가져오고, 없으면 새로 저장 (Save-If-Not-Exists)
                Genre genre = genreRepository.findByName(cleanName)
                        .orElseGet(() -> genreRepository.save(new Genre(cleanName)));

                genreEntities.add(genre);
            }
        }

        // 2. 게임 정보 찾기 (없으면 생성)
        Game game = gameRepository.findByPsStoreId(request.getPsStoreId())
                .orElseGet(() -> Game.create(
                        request.getPsStoreId(),
                        request.getTitle(),
                        request.getEnglishTitle(),
                        request.getPublisher(),
                        request.getImageUrl(),
                        request.getDescription()
                ));

        // 3. 설명 업데이트 정책 적용
        String descriptionToUpdate = "Full Data Crawler".equals(request.getDescription())
                ? game.getDescription()  // 기존 설명 유지 (AI 요약)
                : request.getDescription(); // 새로운 설명 적용

        // 4. 게임 메타 정보 업데이트 (장르 엔티티 전달!)
        game.updateInfo(
                request.getTitle(),
                request.getEnglishTitle(),
                request.getPublisher(),
                request.getImageUrl(),
                descriptionToUpdate,
                genreEntities
        );

        try {
            // 1. englishTitle을 꺼냄
            String rawEnglishTitle = request.getEnglishTitle();

            // 2. 검색 우선순위 설정
            // 영문명이 있으면 그걸 정규화해서 쓰고, 없으면 한글 제목을 정규화해서 씀
            String searchTitle = StringUtils.hasText(rawEnglishTitle) ? rawEnglishTitle : request.getTitle();
            log.info("🎯 Using Invariant English Title for IGDB: {}", searchTitle);

            // IGDB 검색 (제목 기반)
            IgdbGameResponse igdbInfo = igdbApiClient.searchGame(searchTitle);

            if (igdbInfo != null) {
                // 점수 변환
                // - 전문가 평점(aggregated_rating): 0~100 Double -> Integer 반올림
                Integer metaScore = null;
                if (igdbInfo.criticScore() != null) {
                    metaScore = (int) Math.round(igdbInfo.criticScore());
                }

                // 유저 평점(rating): 0~100 Double 유지
                Double userScore = igdbInfo.userScore();

                // 엔티티 업데이트
                game.updateRatings(metaScore, userScore);

                log.info("⭐ Ratings updated for '{}': Meta={}, User={}",
                        game.getName(), metaScore, userScore);
            } else {
                // 검색 실패 시 로그 (디버깅용)
                log.info("🌫️ IGDB Miss for '{}' (Search: '{}')", request.getTitle(), searchTitle);
            }
        } catch (Exception e) {
            // D. [핵심] 평점 조회 실패 시 로그만 남기고, 가격 저장 로직은 계속 진행
            log.warn("⚠️ Failed to fetch ratings for '{}' from IGDB: {}", request.getTitle(), e.getMessage());
        }

        // 3. 게임 정보 저장 (평점이 있든 없든 저장)
        gameRepository.save(game);

        // 플랫폼 정보도 최신화 (혹시 나중에 PS5 버전이 추가될 수도 있으니)
        game.updatePlatforms(request.getPlatforms());

        // 4. [Core] 가격 변동 검사 및 이력 저장
        // 가장 최근의 가격 이력을 조회
        Optional<GamePriceHistory> latestHistoryOpt = priceHistoryRepository.findTopByGameOrderByRecordedAtDesc(game);

        if (shouldSaveHistory(latestHistoryOpt, request)) {
            // 3-1. 변동이 감지되었으므로 저장
            GamePriceHistory history = GamePriceHistory.create(
                    game, request.getOriginalPrice(), request.getCurrentPrice(),
                    request.getDiscountRate(), request.isPlusExclusive(), request.getSaleEndDate()
            );
            priceHistoryRepository.save(history);
            log.info("📈 Price Changed & Saved: {} ({} KRW)", game.getName(), request.getCurrentPrice());

            // 3-2. 가격 하락 알림 체크 (저장이 일어난 경우에만 체크하면 됨)
            checkAndPublishAlert(game, latestHistoryOpt, request.getCurrentPrice(), request.getDiscountRate());
        } else {
            // 변동 없음: 로그만 남기고 INSERT 생략
            log.debug("👌 No Change: {} (Skipping DB Insert)", game.getName());
        }
    }

    /**
     * 가격 이력을 저장해야 하는지 판단합니다.
     * 1. 이력이 아예 없거나 (신규)
     * 2. 가격/할인조건이 변경된 경우
     */
    private boolean shouldSaveHistory(Optional<GamePriceHistory> latestHistoryOpt, CollectRequestDto request) {
        return latestHistoryOpt.map(gamePriceHistory -> !gamePriceHistory.isSameCondition(
                request.getCurrentPrice(), request.getDiscountRate(),
                request.isPlusExclusive(), request.getSaleEndDate()
        )).orElse(true);
    }

    /**
     * 알림 발행 로직 분리 (Clean Code)
     */
    private void checkAndPublishAlert(Game game, Optional<GamePriceHistory> oldHistoryOpt, int newPrice, int newDiscountRate) {
        // 이전 기록이 없으면 알림 대상 아님 (신규 게임)
        if (oldHistoryOpt.isEmpty()) return;

        Integer oldPrice = oldHistoryOpt.get().getPrice();

        // 가격이 떨어졌을 때만 알림
        if (newPrice < oldPrice) {
            log.info("🚨 Price Drop Detected! {} ({} -> {})", game.getName(), oldPrice, newPrice);
            eventPublisher.publishEvent(new GamePriceChangedEvent(
                    game.getId(),
                    game.getName(),
                    game.getPsStoreId(),
                    oldPrice,
                    newPrice,
                    newDiscountRate,
                    game.getImageUrl()
            ));
        }
    }

    /**
     * 수집기에게 "지금 갱신해야 할 게임들"의 목록(Target URLs)을 반환합니다.
     * 정책:
     * 1. 3일 이상 업데이트 안 된 게임
     * 2. (쿼리상) 할인 종료일이 지난 게임
     */
    public List<String> getGamesToUpdate() {
        // 1. 기준 시간 (하루 전)
        LocalDateTime threshold = LocalDateTime.now().minusDays(1);

        // 2. 기준 날짜 (오늘) - 기간 존중 비교용
        LocalDate today = LocalDate.now();

        // 3. 쿼리 실행 (today 파라미터 추가)
        return gameRepository.findGamesToUpdate(threshold, today).stream()
                .map(game -> "https://store.playstation.com/ko-kr/product/" + game.getPsStoreId())
                .toList();
    }

    /**
     * 게임 검색 + 찜 여부 마킹
     * @param condition 검색 조건
     * @param pageable 페이징 정보
     * @param memberId (Optional) 멤버 ID
     * @return 게임 검색 결과 페이지
     */
    public Page<GameSearchResultDto> searchGames(GameSearchCondition condition, Pageable pageable, Long memberId) {
        // 1. 기존 검색 로직 실행 (QueryDSL)
        Page<GameSearchResultDto> result = gameRepository.searchGames(condition, pageable);

        // 2. 로그인한 유저라면 찜 여부 마킹 (Data Enrichment)
        if (memberId != null && !result.isEmpty()) {
            // 현재 페이지의 게임 ID 추출
            List<Long> gameIds = result.getContent().stream()
                    .map(GameSearchResultDto::getId)
                    .toList();

            // 내가 찜한 게임 ID 조회
            List<Long> myLikedGameIds = wishlistRepository.findGameIdsByMemberIdAndGameIdIn(memberId, gameIds);

            // DTO에 liked=true 설정
            result.getContent().forEach(dto -> {
                if (myLikedGameIds.contains(dto.getId())) {
                    dto.setLiked(true);
                }
            });
        }

        return result;
    }

    /**
     * 게임 상세 정보 조회 + 찜 여부
     * @param gameId 게임 ID
     * @param memberId (Optional) 멤버 ID
     * @return 게임 상세 응답 DTO
     */
    public GameDetailResponse getGameDetail(Long gameId, Long memberId) {
        // 1. 게임 기본 정보 조회
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found with id: " + gameId));

        // 2. 가격 이력 및 최저가 조회
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(gameId);
        GamePriceHistory latestInfo = histories.isEmpty() ? null : histories.get(histories.size() - 1);
        Integer lowestPrice = priceHistoryRepository.findLowestPriceByGameId(gameId);

        // 3. 차트 DTO 변환
        List<GameDetailResponse.PriceHistoryDto> historyDtos = histories.stream()
                .map(h -> new GameDetailResponse.PriceHistoryDto(h.getRecordedAt().toLocalDate(), h.getPrice()))
                .toList();

        // 4. 찜 여부 확인 로직
        boolean isLiked = false;
        if (memberId != null) {
            isLiked = wishlistRepository.existsByMemberIdAndGameId(memberId, gameId);
        }

        // 5. 연관 게임 추천 로직
        // 현재 게임의 장르 ID 목록 추출
        List<Long> genreIds = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getId())
                .toList();

        // 6. 같은 장르이면서 조건 좋은 게임 추천 갯수만큼 추천
        List<GameSearchResultDto> relatedGames = gameRepository.findRelatedGames(genreIds, gameId, RECOMMEND_GAME_COUNT);

        // 7. 응답 생성 (Game + LatestInfo + LowestPrice + HistoryList)
        return GameDetailResponse.from(game, latestInfo, lowestPrice, historyDtos, isLiked, relatedGames);
    }
}
