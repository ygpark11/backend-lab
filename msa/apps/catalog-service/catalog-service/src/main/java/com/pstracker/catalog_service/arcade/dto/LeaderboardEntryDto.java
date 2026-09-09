package com.pstracker.catalog_service.arcade.dto;

import com.pstracker.catalog_service.arcade.domain.ArcadeRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryDto {

    private long rank;
    private Long userId;
    private String username;
    private int score;
    private int clearTimeSec;
    private int maxCombo;
    private String trophyGrade;
    private String createdAt;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public static LeaderboardEntryDto from(ArcadeRecord record, long rank) {
        String formattedDate = record.getCreatedAt() != null
                ? record.getCreatedAt().format(FORMATTER)
                : "";

        return LeaderboardEntryDto.builder()
                .rank(rank)
                .userId(record.getMember().getId())
                .username(record.getMember().getNickname())
                .score(record.getScore())
                .clearTimeSec(record.getClearTimeSec())
                .maxCombo(record.getMaxCombo())
                .trophyGrade(record.getTrophyGrade().name())
                .createdAt(formattedDate)
                .build();
    }
}
