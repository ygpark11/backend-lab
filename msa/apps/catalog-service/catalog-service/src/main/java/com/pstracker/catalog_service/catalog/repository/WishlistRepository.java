package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long>, WishlistRepositoryCustom {
    // 이미 찜했는지 확인 (Member ID와 Game ID로 조회)
    @Query("SELECT w FROM Wishlist w WHERE w.member.id = :memberId AND w.game.id = :gameId")
    Optional<Wishlist> findByMemberIdAndGameId(Long memberId, Long gameId);

    @Query("SELECT w.game.id FROM Wishlist w WHERE w.member.id = :memberId AND w.game.id IN :gameIds")
    List<Long> findGameIdsByMemberIdAndGameIdIn(Long memberId, List<Long> gameIds);

    boolean existsByMemberIdAndGameId(Long memberId, Long gameId);
}
