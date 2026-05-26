package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.GameVote;
import com.pstracker.catalog_service.catalog.domain.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GameVoteRepository extends JpaRepository<GameVote, Long> {
    Optional<GameVote> findByMemberIdAndGameId(Long memberId, Long gameId);

    int countByMemberId(Long memberId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE GameVote v SET v.voteType = :voteType WHERE v.memberId = :memberId AND v.game.id = :gameId")
    void updateVoteType(@Param("memberId") Long memberId, @Param("gameId") Long gameId, @Param("voteType") VoteType voteType);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM GameVote v WHERE v.memberId = :memberId AND v.game.id = :gameId")
    void deleteByMemberIdAndGameId(@Param("memberId") Long memberId, @Param("gameId") Long gameId);
}
