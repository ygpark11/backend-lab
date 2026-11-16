package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.VoteType;

public record GameVoteRequest(VoteType voteType) {
}
