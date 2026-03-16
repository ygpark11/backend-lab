package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.GameVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GameVoteRepository extends JpaRepository<GameVote, Long> {
    Optional<GameVote> findByMemberIdAndGameId(Long memberId, Long gameId);

    int countByMemberId(Long memberId);
}
