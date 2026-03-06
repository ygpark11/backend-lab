package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_votes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_member_game_vote", columnNames = {"member_id", "game_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false)
    private VoteType voteType;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public static GameVote create(Long memberId, Game game, VoteType voteType) {
        GameVote vote = new GameVote();
        vote.memberId = memberId;
        vote.game = game;
        vote.voteType = voteType;
        vote.createdAt = LocalDateTime.now();
        vote.updatedAt = LocalDateTime.now();
        return vote;
    }

    public void changeVote(VoteType newVoteType) {
        this.voteType = newVoteType;
        this.updatedAt = LocalDateTime.now();
    }
}
