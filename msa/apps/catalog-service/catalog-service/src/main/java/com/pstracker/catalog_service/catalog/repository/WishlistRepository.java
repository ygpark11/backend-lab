package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long>, WishlistRepositoryCustom {
    @Query("SELECT w FROM Wishlist w WHERE w.member.id = :memberId AND w.game.id = :gameId")
    Optional<Wishlist> findByMemberIdAndGameId(Long memberId, Long gameId);

    @Query("SELECT w.game.id FROM Wishlist w WHERE w.member.id = :memberId AND w.game.id IN :gameIds")
    List<Long> findGameIdsByMemberIdAndGameIdIn(Long memberId, List<Long> gameIds);

    // 특정 게임을 찜한 모든 회원 조회 (알림 발송용)
    @Query("SELECT w.member FROM Wishlist w WHERE w.game.psStoreId = :psStoreId")
    List<Member> findMembersByGamePsStoreId(@Param("psStoreId") String psStoreId);

    @Query("SELECT w FROM Wishlist w JOIN FETCH w.member WHERE w.game.id = :gameId")
    List<Wishlist> findAllByGameIdWithMember(@Param("gameId") Long gameId);

    long countByMemberId(Long memberId);

    long count();

    @Query("SELECT COALESCE(SUM(g.originalPrice - g.currentPrice), 0) " +
            "FROM Wishlist w JOIN w.game g " +
            "WHERE w.member.id = :memberId AND g.discountRate > 0")
    int sumSavedAmountByMemberId(@Param("memberId") Long memberId);

    int countByGameId(Long gameId);

    @Query("SELECT CAST(AVG(w.targetPrice) AS int) FROM Wishlist w " +
            "WHERE w.game.id = :gameId AND w.targetPrice IS NOT NULL AND w.targetPrice > 0")
    Integer getAverageTargetPriceByGameId(@Param("gameId") Long gameId);

    @Modifying
    @Query("UPDATE Wishlist w SET w.targetPrice = null WHERE w.game.id = :gameId AND w.targetPrice >= :newOriginalPrice")
    void resetInvalidTargetPrices(@Param("gameId") Long gameId, @Param("newOriginalPrice") Integer newOriginalPrice);
}
