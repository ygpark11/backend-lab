package com.pstracker.catalog_service.arcade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardResponse {

    private String gameType;
    private List<LeaderboardEntryDto> topList;
    private LeaderboardEntryDto myRank;
}
