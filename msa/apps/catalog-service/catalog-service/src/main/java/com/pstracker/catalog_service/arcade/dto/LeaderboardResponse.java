package com.pstracker.catalog_service.arcade.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record LeaderboardResponse(
                String gameType,
                List<LeaderboardEntryDto> topList,
                LeaderboardEntryDto myRank) {
}
