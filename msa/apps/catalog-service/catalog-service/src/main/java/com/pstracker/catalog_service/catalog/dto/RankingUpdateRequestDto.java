package com.pstracker.catalog_service.catalog.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class RankingUpdateRequestDto {
    private String rankingType;
    private List<String> psStoreIds;
}
