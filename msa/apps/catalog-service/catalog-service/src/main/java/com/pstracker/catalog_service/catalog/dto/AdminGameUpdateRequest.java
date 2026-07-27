package com.pstracker.catalog_service.catalog.dto;

import java.util.List;

public record AdminGameUpdateRequest(
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
        List<String> searchKeywords,
        Double hltbMainStory,
        Double hltbMainExtra,
        Double hltbCompletionist
) {}
