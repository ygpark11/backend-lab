package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.QWishlistDto;
import com.pstracker.catalog_service.catalog.dto.WishlistDto;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QGame.game;
import static com.pstracker.catalog_service.catalog.domain.QWishlist.wishlist;

@RequiredArgsConstructor
public class WishlistRepositoryCustomImpl implements WishlistRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<WishlistDto> findAllByMemberId(Long memberId, Pageable pageable) {
        List<WishlistDto> content = queryFactory
                .select(new QWishlistDto(
                        wishlist.id, game.id, game.name, game.imageUrl,
                        game.originalPrice, game.currentPrice, game.discountRate,
                        game.isPlusExclusive, game.saleEndDate,
                        game.metaScore, game.inCatalog,
                        game.createdAt, wishlist.createdAt
                ))
                .from(wishlist)
                .join(wishlist.game, game)
                .where(wishlist.member.id.eq(memberId))
                .orderBy(wishlist.createdAt.desc()) // 최근 찜한 순
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(wishlist.count())
                .from(wishlist)
                .where(wishlist.member.id.eq(memberId));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }
}
