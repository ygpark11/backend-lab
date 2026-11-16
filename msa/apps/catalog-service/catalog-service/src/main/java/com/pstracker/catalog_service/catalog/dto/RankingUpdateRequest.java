package com.pstracker.catalog_service.catalog.dto;

import java.util.List;

public record RankingUpdateRequest(
        String rankingType,
        List<String> psStoreIds
) {
}
