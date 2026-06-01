package com.pstracker.catalog_service.scraping.dto;

import org.springframework.data.domain.Slice;

import java.util.List;

public record CandidateSliceResponse(List<GameCandidateResponse> content, boolean hasNext) {

    public static CandidateSliceResponse from(Slice<GameCandidateResponse> slice) {
        return new CandidateSliceResponse(slice.getContent(), slice.hasNext());
    }
}
