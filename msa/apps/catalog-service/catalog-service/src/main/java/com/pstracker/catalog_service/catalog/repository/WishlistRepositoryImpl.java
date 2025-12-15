package com.pstracker.catalog_service.catalog.repository;

import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QWishlist.wishlist;
import static com.pstracker.catalog_service.catalog.domain.QGame.game;

@RequiredArgsConstructor
public class WishlistRepositoryImpl implements WishlistRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Wishlist> findAllByMemberId(Long memberId, Pageable pageable) {

        // 1. 컨텐츠 조회 (Wishlist + Game Fetch Join)
        // Fetch Join을 사용해 Game 정보까지 한 번의 쿼리로 가져옵니다. (N+1 방지)
        List<Wishlist> content = queryFactory
                .selectFrom(wishlist)
                .join(wishlist.game, game).fetchJoin()
                .where(wishlist.member.id.eq(memberId))
                .orderBy(wishlist.createdAt.desc()) // 최근 찜한 순
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // 2. 카운트 쿼리 (최적화)
        JPAQuery<Long> countQuery = queryFactory
                .select(wishlist.count())
                .from(wishlist)
                .where(wishlist.member.id.eq(memberId));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }
}
