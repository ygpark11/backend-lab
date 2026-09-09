package com.pstracker.catalog_service.arcade.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import com.pstracker.catalog_service.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "arcade_records",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_arcade_member_game", columnNames = {"member_id", "game_type"})
        },
        indexes = {
                @Index(name = "idx_arcade_rank", columnList = "game_type, score DESC, clear_time_sec ASC")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArcadeRecord extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private ArcadeGameType gameType;

    @Column(nullable = false)
    private int score;

    @Column(name = "clear_time_sec", nullable = false)
    private int clearTimeSec;

    @Column(name = "max_combo", nullable = false)
    private int maxCombo;

    @Enumerated(EnumType.STRING)
    @Column(name = "trophy_grade", nullable = false, length = 20)
    private TrophyGrade trophyGrade;

    @Builder
    public ArcadeRecord(Member member, ArcadeGameType gameType, int score, int clearTimeSec, int maxCombo, TrophyGrade trophyGrade) {
        this.member = member;
        this.gameType = gameType;
        this.score = score;
        this.clearTimeSec = clearTimeSec;
        this.maxCombo = maxCombo;
        this.trophyGrade = trophyGrade != null ? trophyGrade : TrophyGrade.NONE;
    }

    /**
     * 신규 점수가 기존 최고 기록보다 우수한 경우에만 갱신
     * 1) 점수가 더 높거나
     * 2) 점수가 같으면서 클리어 시간이 더 빠른 경우
     * @return 갱신 여부 (true: 신기록 달성, false: 기존 기록 유지)
     */
    public boolean updateIfBetter(int newScore, int newClearTime, int newMaxCombo, TrophyGrade newGrade) {
        boolean isBetter = (newScore > this.score) || (newScore == this.score && newClearTime < this.clearTimeSec);
        if (isBetter) {
            this.score = newScore;
            this.clearTimeSec = newClearTime;
            this.maxCombo = Math.max(this.maxCombo, newMaxCombo);
            if (newGrade != null && newGrade.getRank() >= this.trophyGrade.getRank()) {
                this.trophyGrade = newGrade;
            }
            return true;
        }
        return false;
    }
}
