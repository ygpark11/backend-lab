package com.pstracker.catalog_service.arcade.dto;

import com.pstracker.catalog_service.arcade.domain.ArcadeRecord;
import lombok.Builder;

@Builder
public record LeaderboardEntryDto(
        long rank,
        String username,
        int score
) {
    public static LeaderboardEntryDto from(ArcadeRecord record, long rank) {
        return new LeaderboardEntryDto(rank, record.getMember().getNickname(), record.getScore());
    }
}
