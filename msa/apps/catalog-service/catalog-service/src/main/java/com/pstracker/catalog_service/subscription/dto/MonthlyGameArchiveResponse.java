package com.pstracker.catalog_service.subscription.dto;

import java.util.List;

public record MonthlyGameArchiveResponse(
        String targetMonth,
        List<ArchiveGameDto> games
) {
    public MonthlyGameArchiveResponse withGames(List<ArchiveGameDto> enrichedGames) {
        return new MonthlyGameArchiveResponse(targetMonth, enrichedGames);
    }

    public record ArchiveGameDto(
            String psStoreId,
            String title,
            String imageUrl,
            Long gameId
    ) {
        public ArchiveGameDto withGameId(Long gameId) {
            return new ArchiveGameDto(psStoreId, title, imageUrl, gameId);
        }
    }
}
