package com.pstracker.catalog_service.arcade.dto;

import com.pstracker.catalog_service.arcade.domain.ArcadeRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryDto {

    private long rank;
    private String username;
    private int score;

    public static LeaderboardEntryDto from(ArcadeRecord record, long rank) {
        return LeaderboardEntryDto.builder()
                .rank(rank)
                .username(record.getMember().getNickname())
                .score(record.getScore())
                .build();
    }
}
