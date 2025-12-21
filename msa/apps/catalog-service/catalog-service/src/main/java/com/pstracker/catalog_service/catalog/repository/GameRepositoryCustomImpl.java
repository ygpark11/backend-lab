package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Platform;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.dto.QGameSearchResultDto;
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
import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QGame.game;
import static com.pstracker.catalog_service.catalog.domain.QGamePriceHistory.gamePriceHistory;

@RequiredArgsConstructor
public class GameRepositoryCustomImpl implements GameRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<GameSearchResultDto> searchGames(GameSearchCondition condition, Pageable pageable) {
        // 1. 컨텐츠 조회 쿼리 (페이징 적용)
        List<GameSearchResultDto> content = queryFactory
                .select(new QGameSearchResultDto(
                        game.id,
                        game.name,
                        game.imageUrl,
                        gamePriceHistory.originalPrice,
                        gamePriceHistory.price,
                        gamePriceHistory.discountRate,
                        gamePriceHistory.isPlusExclusive,
                        gamePriceHistory.saleEndDate,
                        game.metaScore,
                        game.userScore,
                        game.createdAt,
                        game.genreIds
                ))
                .from(game)
                .leftJoin(game.priceHistories, gamePriceHistory) // 1:N 조인
                .where(
                        // 가장 최근의 가격 이력만 가져오기
                        gamePriceHistory.recordedAt.eq(
                                JPAExpressions
                                        .select(gamePriceHistory.recordedAt.max())
                                        .from(gamePriceHistory)
                                        .where(gamePriceHistory.game.eq(game))
                        ),
                        // 동적 검색 조건들
                        nameContains(condition.getKeyword()),
                        priceBetween(condition.getMinPrice(), condition.getMaxPrice()),
                        discountRateGoe(condition.getMinDiscountRate()),
                        metaScoreGoe(condition.getMinMetaScore()),
                        userScoreGoe(condition.getMinUserScore()),
                        platformEq(condition.getPlatform()),
                        plusExclusiveEq(condition.getIsPlusExclusive()),
                        genreContains(condition.getGenre())
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(getOrderSpecifiers(pageable.getSort()))
                .fetch();

        // 2. 카운트 쿼리 (최적화를 위해 분리)
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
                        genreContains(condition.getGenre())
                );

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
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

    private BooleanExpression genreContains(String genre) {
        // genreIds 컬럼(String)에 해당 장르가 포함되어 있는지 검사
        return StringUtils.hasText(genre) ? game.genreIds.containsIgnoreCase(genre) : null;
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
