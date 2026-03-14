package com.pstracker.catalog_service.scraping.dto;

import com.pstracker.catalog_service.scraping.domain.GameCandidate;

public record GameCandidateResponse(String psStoreId, String title, String imageUrl) {
    public static GameCandidateResponse from(GameCandidate candidate) {
        return new GameCandidateResponse(
                candidate.getPsStoreId(),
                candidate.getTitle(),
                candidate.getImageUrl()
        );
    }
}
