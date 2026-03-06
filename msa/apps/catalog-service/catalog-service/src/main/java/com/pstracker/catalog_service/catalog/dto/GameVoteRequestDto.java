package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.VoteType;
import lombok.Getter;

@Getter
public class GameVoteRequestDto {
    private VoteType voteType;
}
