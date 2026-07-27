package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.Game;

import java.util.List;

public record AdminGameDetailResponse(
        Long id,
        String name,
        String englishName,
        String imageUrl,

        Integer igdbCriticScore,
        Integer igdbCriticCount,
        Double igdbUserScore,
        Integer igdbUserCount,

        Integer mcMetaScore,
        Integer mcMetaCount,
        Double mcUserScore,
        Integer mcUserCount,

        Double hltbMainStory,
        Double hltbMainExtra,
        Double hltbCompletionist,

        List<String> searchKeywords
) {
    public static AdminGameDetailResponse from(Game game) {
        return new AdminGameDetailResponse(
                game.getId(),
                game.getName(),
                game.getEnglishName(),
                game.getImageUrl(),
                game.getIgdbCriticScore(),
                game.getIgdbCriticCount(),
                game.getIgdbUserScore(),
                game.getIgdbUserCount(),
                game.getMcMetaScore(),
                game.getMcMetaCount(),
                game.getMcUserScore(),
                game.getMcUserCount(),
                game.getHltbMainStory(),
                game.getHltbMainExtra(),
                game.getHltbCompletionist(),
                game.getSearchKeywords() != null ? game.getSearchKeywords() : List.of()
        );
    }
}
