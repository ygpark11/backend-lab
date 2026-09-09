package com.pstracker.catalog_service.arcade.repository;

import com.pstracker.catalog_service.arcade.domain.ArcadeGameType;
import com.pstracker.catalog_service.arcade.domain.ArcadeRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArcadeRecordRepository extends JpaRepository<ArcadeRecord, Long> {

    @EntityGraph(attributePaths = {"member"})
    Optional<ArcadeRecord> findByMemberIdAndGameType(Long memberId, ArcadeGameType gameType);

    @EntityGraph(attributePaths = {"member"})
    @Query("SELECT r FROM ArcadeRecord r WHERE r.gameType = :gameType ORDER BY r.score DESC, r.clearTimeSec ASC, r.id ASC")
    List<ArcadeRecord> findTopRanksByGameType(@Param("gameType") ArcadeGameType gameType, Pageable pageable);

    @Query("SELECT COUNT(r) + 1 FROM ArcadeRecord r " +
            "WHERE r.gameType = :gameType " +
            "AND (r.score > :score " +
            "     OR (r.score = :score AND r.clearTimeSec < :clearTimeSec) " +
            "     OR (r.score = :score AND r.clearTimeSec = :clearTimeSec AND r.id < :id))")
    long calculateRank(
            @Param("gameType") ArcadeGameType gameType,
            @Param("score") int score,
            @Param("clearTimeSec") int clearTimeSec,
            @Param("id") Long id
    );
}
