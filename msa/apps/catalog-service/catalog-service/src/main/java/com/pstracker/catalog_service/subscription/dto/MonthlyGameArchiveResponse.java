package com.pstracker.catalog_service.subscription.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@AllArgsConstructor
public class MonthlyGameArchiveResponse {
    private String targetMonth;
    private List<ArchiveGameDto> games;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class ArchiveGameDto {
        private String psStoreId;
        private String title;
        private String imageUrl;
        private Long gameId;
    }
}
