package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Platform;
import com.pstracker.catalog_service.catalog.dto.GameGenreResultDto;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.dto.QGameGenreResultDto;
import com.pstracker.catalog_service.catalog.dto.QGameSearchResultDto;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.support.PageableExecutionUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.pstracker.catalog_service.catalog.domain.QGame.game;
import static com.pstracker.catalog_service.catalog.domain.QGameGenre.gameGenre;
import static com.pstracker.catalog_service.catalog.domain.QGenre.genre;
import static com.pstracker.catalog_service.catalog.domain.QGamePriceHistory.gamePriceHistory;
import static org.springframework.util.StringUtils.hasText;


@RequiredArgsConstructor
public class GameRepositoryCustomImpl implements GameRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<GameSearchResultDto> searchGames(GameSearchCondition condition, Pageable pageable) {
        List<GameSearchResultDto> content = queryFactory
                .select(new QGameSearchResultDto(
                        game.id, game.name, game.imageUrl,
                        game.originalPrice, game.currentPrice, game.discountRate,
                        game.isPlusExclusive, game.saleEndDate, game.pioneerName,
                        game.inCatalog, game.createdAt,
                        game.isPs5ProEnhanced,
                        game.bestSellerRank, game.mostDownloadedRank,
                        game.mcMetaScore, game.igdbCriticScore, game.vibeTags
                ))
                .from(game)
                .where(
                        nameContains(condition.getKeyword()),
                        priceBetween(condition.getMinPrice(), condition.getMaxPrice()),
                        discountRateGoe(condition.getMinDiscountRate()),
                        metaScoreGoe(condition.getMinMetaScore()),
                        userScoreGoe(condition.getMinUserScore()),
                        platformEq(condition.getPlatform()),
                        plusExclusiveEq(condition.getIsPlusExclusive()),
                        genreEq(condition.getGenre()),
                        inCatalogEq(condition.getInCatalog()),
                        isAllTimeLow(condition.getIsAllTimeLow()),
                        ps5ProEnhancedEq(condition.getIsPs5ProEnhanced()),
                        bestSellerEq(condition.getIsBestSeller()),
                        mostDownloadedEq(condition.getIsMostDownloaded()),
                        isClosingSoon(condition.getIsClosingSoon()),
                        isNewDiscount(condition.getIsNewDiscount())
                )
                .orderBy(getOrderSpecifiers(pageable.getSort(), condition))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(game.count())
                .from(game)
                .where(
                        nameContains(condition.getKeyword()),
                        priceBetween(condition.getMinPrice(), condition.getMaxPrice()),
                        discountRateGoe(condition.getMinDiscountRate()),
                        metaScoreGoe(condition.getMinMetaScore()),
                        userScoreGoe(condition.getMinUserScore()),
                        platformEq(condition.getPlatform()),
                        plusExclusiveEq(condition.getIsPlusExclusive()),
                        genreEq(condition.getGenre()),
                        inCatalogEq(condition.getInCatalog()),
                        isAllTimeLow(condition.getIsAllTimeLow()),
                        ps5ProEnhancedEq(condition.getIsPs5ProEnhanced()),
                        bestSellerEq(condition.getIsBestSeller()),
                        mostDownloadedEq(condition.getIsMostDownloaded()),
                        isClosingSoon(condition.getIsClosingSoon()),
                        isNewDiscount(condition.getIsNewDiscount())
                );

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    @Override
    public List<GameSearchResultDto> findRelatedGames(List<Long> genreIds, Long excludeGameId, int limit) {
        NumberExpression<Integer> fallbackScore = game.mcMetaScore.coalesce(game.igdbCriticScore);

        // 1단계: DTO 프로젝션으로 직접 조회 (엔티티 로딩 없음, LIMIT 정확히 적용)
        List<GameSearchResultDto> dtos = queryFactory
                .select(new QGameSearchResultDto(
                        game.id, game.name, game.imageUrl,
                        game.originalPrice, game.currentPrice, game.discountRate,
                        game.isPlusExclusive, game.saleEndDate, game.pioneerName,
                        game.inCatalog, game.createdAt,
                        game.isPs5ProEnhanced,
                        game.bestSellerRank, game.mostDownloadedRank,
                        game.mcMetaScore, game.igdbCriticScore, game.vibeTags
                ))
                .from(game)
                .where(
                        game.id.ne(excludeGameId),
                        game.gameGenres.any().genre.id.in(genreIds),
                        fallbackScore.goe(75).or(fallbackScore.isNull())
                )
                .orderBy(
                        game.discountRate.desc(),
                        fallbackScore.desc().nullsLast(),
                        game.lastUpdated.desc()
                )
                .limit(limit)
                .fetch();

        if (dtos.isEmpty()) return List.of();

        // 2단계: 장르 일괄 조회 후 매핑 (IN절 한 번으로 N+1 없음)
        List<Long> gameIds = dtos.stream().map(GameSearchResultDto::getId).toList();
        Map<Long, List<String>> genreMap = queryFactory
                .select(new QGameGenreResultDto(gameGenre.game.id, genre.name))
                .from(gameGenre)
                .join(gameGenre.genre, genre)
                .where(gameGenre.game.id.in(gameIds))
                .fetch()
                .stream()
                .collect(Collectors.groupingBy(
                        GameGenreResultDto::getGameId,
                        Collectors.mapping(GameGenreResultDto::getGenreName, Collectors.toList())
                ));

        dtos.forEach(dto -> dto.setGenres(genreMap.getOrDefault(dto.getId(), List.of())));

        return dtos;
    }

    private BooleanExpression nameContains(String keyword) {
        if (!hasText(keyword)) return null;

        String strippedKeyword = keyword.replaceAll("\\s+", "");

        return game.name.containsIgnoreCase(keyword)
                .or(game.englishName.containsIgnoreCase(keyword))
                .or(game.chosungName.containsIgnoreCase(strippedKeyword));
    }

    private BooleanExpression priceBetween(Integer minPrice, Integer maxPrice) {
        if (minPrice != null && maxPrice != null) return game.currentPrice.between(minPrice, maxPrice);
        else if (minPrice != null) return game.currentPrice.goe(minPrice);
        else if (maxPrice != null) return game.currentPrice.loe(maxPrice);
        return null;
    }

    private BooleanExpression discountRateGoe(Integer minDiscountRate) {
        return minDiscountRate != null ? game.discountRate.goe(minDiscountRate) : null;
    }

    private BooleanExpression metaScoreGoe(Integer minMetaScore) {
        if (minMetaScore == null) return null;
        return game.mcMetaScore.goe(minMetaScore)
                .or(game.mcMetaScore.isNull().and(game.igdbCriticScore.goe(minMetaScore)));
    }

    private BooleanExpression userScoreGoe(Double minUserScore) {
        if (minUserScore == null) return null;
        return game.mcUserScore.goe(minUserScore)
                .or(game.mcUserScore.isNull().and(game.igdbUserScore.goe(minUserScore)));
    }

    private BooleanExpression platformEq(Platform platform) {
        return platform != null ? game.platforms.contains(platform) : null;
    }

    private BooleanExpression plusExclusiveEq(Boolean isPlusExclusive) {
        return Boolean.TRUE.equals(isPlusExclusive) ? game.isPlusExclusive.isTrue() : null;
    }

    private BooleanExpression genreEq(String genreName) {
        if (!hasText(genreName)) return null;
        return game.gameGenres.any().genre.name.eq(genreName);
    }

    private BooleanExpression inCatalogEq(Boolean inCatalog) {
        return Boolean.TRUE.equals(inCatalog) ? game.inCatalog.isTrue() : null;
    }

    private BooleanExpression isAllTimeLow(Boolean isAllTimeLow) {
        if (isAllTimeLow == null || !isAllTimeLow) {
            return null;
        }

        return game.discountRate.gt(0).and(game.currentPrice.loe(game.allTimeLowPrice));
    }

    private BooleanExpression ps5ProEnhancedEq(Boolean isPs5ProEnhanced) {
        if (isPs5ProEnhanced == null || !isPs5ProEnhanced) {
            return null;
        }
        return game.isPs5ProEnhanced.isTrue();
    }

    private BooleanExpression bestSellerEq(Boolean isBestSeller) {
        return Boolean.TRUE.equals(isBestSeller) ? game.bestSellerRank.isNotNull() : null;
    }

    private BooleanExpression mostDownloadedEq(Boolean isMostDownloaded) {
        return Boolean.TRUE.equals(isMostDownloaded) ? game.mostDownloadedRank.isNotNull() : null;
    }

    private BooleanExpression isClosingSoon(Boolean isClosingSoon) {
        if (isClosingSoon == null || !isClosingSoon) {
            return null;
        }
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        return game.saleEndDate.between(today, tomorrow);
    }

    private BooleanExpression isNewDiscount(Boolean isNewDiscount) {
        if (isNewDiscount == null || !isNewDiscount) {
            return null;
        }
        LocalDate today = LocalDate.now();
        
        return JPAExpressions.selectOne()
                .from(gamePriceHistory)
                .where(
                        gamePriceHistory.game.id.eq(game.id),
                        gamePriceHistory.discountRate.gt(0),
                        // QueryDSL에서 LocalDateTime 컬럼의 날짜 부분만 비교할 수 없으므로 
                        // 오늘 시작(00:00:00)부터 끝(23:59:59) 사이에 기록된 이력을 찾습니다.
                        gamePriceHistory.recordedAt.goe(today.atStartOfDay()),
                        gamePriceHistory.recordedAt.lt(today.plusDays(1).atStartOfDay())
                ).exists();
    }

    private OrderSpecifier<?>[] getOrderSpecifiers(Sort sort, GameSearchCondition condition) {
        List<OrderSpecifier<?>> orders = new ArrayList<>();

        if (Boolean.TRUE.equals(condition.getIsBestSeller())) {
            orders.add(game.bestSellerRank.asc());
            return orders.toArray(new OrderSpecifier[0]);
        }

        if (Boolean.TRUE.equals(condition.getIsMostDownloaded())) {
            orders.add(game.mostDownloadedRank.asc());
            return orders.toArray(new OrderSpecifier[0]);
        }

        for (Sort.Order order : sort) {
            Order direction = order.isAscending() ? Order.ASC : Order.DESC;
            switch (order.getProperty()) {
                case "price" -> orders.add(new OrderSpecifier<>(direction, game.currentPrice));
                case "discountRate" -> orders.add(new OrderSpecifier<>(direction, game.discountRate));
                case "metaScore" -> orders.add(new OrderSpecifier<>(direction, game.mcMetaScore.coalesce(game.igdbCriticScore)));
                case "saleEndDate" -> orders.add(new OrderSpecifier<>(direction, game.saleEndDate, OrderSpecifier.NullHandling.NullsLast));
                case "releaseDate" -> orders.add(new OrderSpecifier<>(direction, game.releaseDate));
                default ->orders.add(new OrderSpecifier<>(direction, game.lastUpdated));
            }
        }
        return orders.toArray(new OrderSpecifier[0]);
    }

    @Override
    public long countMustPlayGames() {
        Long count = queryFactory
                .select(game.count())
                .from(game)
                .where(
                        game.mcMetaScore.goe(85).or(game.mcMetaScore.isNull().and(game.igdbCriticScore.goe(85))),
                        game.discountRate.goe(50)
                )
                .fetchOne();
        return count != null ? count : 0L;
    }
}
