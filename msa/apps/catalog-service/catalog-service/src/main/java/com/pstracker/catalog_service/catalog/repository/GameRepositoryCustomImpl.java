package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.domain.Platform;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QGame.game;
import static com.pstracker.catalog_service.catalog.domain.QGamePriceHistory.gamePriceHistory;

@RequiredArgsConstructor
public class GameRepositoryCustomImpl implements GameRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<GameSearchResultDto> searchGames(GameSearchCondition condition, Pageable pageable) {
        // 1. 엔티티 자체를 먼저 조회 (DTO 프로젝션 대신 엔티티로 가져와서 변환)
        List<Game> games = queryFactory
                .selectFrom(game)
                .leftJoin(game.priceHistories, gamePriceHistory)
                .where(
                        // 최신 가격 이력 매칭
                        gamePriceHistory.recordedAt.eq(
                                JPAExpressions
                                        .select(gamePriceHistory.recordedAt.max())
                                        .from(gamePriceHistory)
                                        .where(gamePriceHistory.game.eq(game))
                        ),
                        nameContains(condition.getKeyword()),
                        priceBetween(condition.getMinPrice(), condition.getMaxPrice()),
                        discountRateGoe(condition.getMinDiscountRate()),
                        metaScoreGoe(condition.getMinMetaScore()),
                        userScoreGoe(condition.getMinUserScore()),
                        platformEq(condition.getPlatform()),
                        plusExclusiveEq(condition.getIsPlusExclusive()),
                        genreEq(condition.getGenre()),
                        inCatalogEq(condition.getInCatalog())
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(getOrderSpecifiers(pageable.getSort()))
                .fetch();

        // 2. 엔티티 -> DTO 변환 (여기서 장르 리스트 채움)
        List<GameSearchResultDto> content = convertToDtos(games);

        // 3. 카운트 쿼리
        JPAQuery<Long> countQuery = queryFactory
                .select(game.count())
                .from(game)
                .leftJoin(game.priceHistories, gamePriceHistory)
                .where(
                        // 카운트 쿼리에서도 동일한 최신 가격 조건 적용
                        gamePriceHistory.recordedAt.eq(
                                JPAExpressions
                                        .select(gamePriceHistory.recordedAt.max())
                                        .from(gamePriceHistory)
                                        .where(gamePriceHistory.game.eq(game))
                        ),
                        nameContains(condition.getKeyword()),
                        priceBetween(condition.getMinPrice(), condition.getMaxPrice()),
                        discountRateGoe(condition.getMinDiscountRate()),
                        metaScoreGoe(condition.getMinMetaScore()),
                        userScoreGoe(condition.getMinUserScore()),
                        platformEq(condition.getPlatform()),
                        plusExclusiveEq(condition.getIsPlusExclusive()),
                        genreEq(condition.getGenre()),
                        inCatalogEq(condition.getInCatalog())
                );

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    @Override
    public List<GameSearchResultDto> findRelatedGames(List<Long> genreIds, Long excludeGameId, int limit) {
        if (genreIds == null || genreIds.isEmpty()) {
            return new ArrayList<>();
        }

        // 1. 쿼리 실행
        List<Game> games = queryFactory
                .selectFrom(game)
                .leftJoin(game.priceHistories, gamePriceHistory)
                .where(
                        // 자기 자신 제외
                        game.id.ne(excludeGameId),

                        // 장르 일치 (주어진 장르 ID 중 하나라도 포함되면 OK)
                        game.gameGenres.any().genre.id.in(genreIds),

                        // 가장 최근 가격만 가져오기
                        gamePriceHistory.recordedAt.eq(
                                JPAExpressions
                                        .select(gamePriceHistory.recordedAt.max())
                                        .from(gamePriceHistory)
                                        .where(gamePriceHistory.game.eq(game))
                        ),

                        // 메타스코어 75점 이상이거나, 평점이 없는 신작
                        game.metaScore.goe(75).or(game.metaScore.isNull())
                )
                .orderBy(
                        gamePriceHistory.discountRate.desc(),
                        game.metaScore.desc().nullsLast(),
                        game.lastUpdated.desc()
                )
                .limit(limit)
                .fetch();

        // DTO 변환
        return convertToDtos(games);
    }

    /**
     * 엔티티 리스트를 DTO 리스트로 변환
     * @param games 게임 엔티티 리스트
     * @return 게임 DTO 리스트
     */
    private List<GameSearchResultDto> convertToDtos(List<Game> games) {
        return games.stream().map(g -> {
            var latestPrice = g.getPriceHistories().stream()
                    .max(Comparator.comparing(GamePriceHistory::getRecordedAt))
                    .orElse(null);

            GameSearchResultDto dto = new GameSearchResultDto(
                    g.getId(), g.getName(), g.getImageUrl(),
                    latestPrice != null ? latestPrice.getOriginalPrice() : 0,
                    latestPrice != null ? latestPrice.getPrice() : 0,
                    latestPrice != null ? latestPrice.getDiscountRate() : 0,
                    latestPrice != null && latestPrice.isPlusExclusive(),
                    latestPrice != null ? latestPrice.getSaleEndDate() : null,
                    g.getMetaScore(), g.getUserScore(), latestPrice.isInCatalog(), g.getCreatedAt()
            );

            // 장르 이름 매핑
            dto.setGenres(g.getGameGenres().stream()
                    .map(gg -> gg.getGenre().getName())
                    .toList());

            return dto;
        }).toList();
    }
    private BooleanExpression nameContains(String keyword) {
        return StringUtils.hasText(keyword) ? game.name.containsIgnoreCase(keyword)
                .or(game.englishName.containsIgnoreCase(keyword)) : null;
    }

    private BooleanExpression priceBetween(Integer minPrice, Integer maxPrice) {
        if (minPrice != null && maxPrice != null) {
            return gamePriceHistory.price.between(minPrice, maxPrice);
        } else if (minPrice != null) {
            return gamePriceHistory.price.goe(minPrice);
        } else if (maxPrice != null) {
            return gamePriceHistory.price.loe(maxPrice);
        }
        return null;
    }

    private BooleanExpression discountRateGoe(Integer minDiscountRate) {
        return minDiscountRate != null ? gamePriceHistory.discountRate.goe(minDiscountRate) : null;
    }

    private BooleanExpression metaScoreGoe(Integer minMetaScore) {
        return minMetaScore != null ? game.metaScore.goe(minMetaScore) : null;
    }

    private BooleanExpression userScoreGoe(Double minUserScore) {
        return minUserScore != null ? game.userScore.goe(minUserScore) : null;
    }

    private BooleanExpression platformEq(Platform platform) {
        return platform != null ? game.platforms.contains(platform) : null;
    }

    private BooleanExpression plusExclusiveEq(Boolean isPlusExclusive) {
        return Boolean.TRUE.equals(isPlusExclusive) ? gamePriceHistory.isPlusExclusive.isTrue() : null;
    }

    private BooleanExpression genreEq(String genreName) {
        if (!StringUtils.hasText(genreName)) return null;
        return game.gameGenres.any().genre.name.eq(genreName);
    }

    private BooleanExpression inCatalogEq(Boolean inCatalog) {
        return Boolean.TRUE.equals(inCatalog) ? gamePriceHistory.inCatalog.isTrue() : null;
    }

    private OrderSpecifier<?>[] getOrderSpecifiers(Sort sort) {
        List<OrderSpecifier<?>> orders = new ArrayList<>();

        for (Sort.Order order : sort) {
            Order direction = order.isAscending() ? Order.ASC : Order.DESC;

            switch (order.getProperty()) {
                case "price":
                    orders.add(new OrderSpecifier<>(direction, gamePriceHistory.price));
                    break;
                case "discountRate":
                    orders.add(new OrderSpecifier<>(direction, gamePriceHistory.discountRate));
                    break;
                case "metaScore":
                    orders.add(new OrderSpecifier<>(direction, game.metaScore));
                    break;
                case "lastUpdated":
                default:
                    orders.add(new OrderSpecifier<>(direction, game.lastUpdated));
                    break;
            }
        }

        return orders.toArray(new OrderSpecifier[0]);
    }
}
