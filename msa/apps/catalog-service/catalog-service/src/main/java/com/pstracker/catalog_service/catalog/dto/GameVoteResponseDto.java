package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.VoteType;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class GameVoteResponseDto {
    private Integer likeCount;
    private Integer dislikeCount;
    private VoteType userVote;
}
