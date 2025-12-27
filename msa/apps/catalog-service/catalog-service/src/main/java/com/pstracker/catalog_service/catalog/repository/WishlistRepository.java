package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long>, WishlistRepositoryCustom {
    @Query("SELECT w FROM Wishlist w WHERE w.member.id = :memberId AND w.game.id = :gameId")
    Optional<Wishlist> findByMemberIdAndGameId(Long memberId, Long gameId);

    @Query("SELECT w.game.id FROM Wishlist w WHERE w.member.id = :memberId AND w.game.id IN :gameIds")
    List<Long> findGameIdsByMemberIdAndGameIdIn(Long memberId, List<Long> gameIds);

    boolean existsByMemberIdAndGameId(Long memberId, Long gameId);

    // 특정 게임을 찜한 모든 회원 조회 (알림 발송용)
    @Query("SELECT w.member FROM Wishlist w WHERE w.game.psStoreId = :psStoreId")
    List<Member> findMembersByGamePsStoreId(@Param("psStoreId") String psStoreId);
}
