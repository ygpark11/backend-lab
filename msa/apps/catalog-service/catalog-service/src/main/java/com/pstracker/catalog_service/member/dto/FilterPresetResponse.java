package com.pstracker.catalog_service.member.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonRawValue;
import com.pstracker.catalog_service.member.domain.UserFilterPreset;

import java.time.LocalDateTime;

public record FilterPresetResponse(
        Long id,
        String name,
        @JsonRawValue @JsonProperty("filters") String filtersJson,
        LocalDateTime createdAt
) {
    public static FilterPresetResponse from(UserFilterPreset preset) {
        return new FilterPresetResponse(
                preset.getId(),
                preset.getName(),
                preset.getFiltersJson(),
                preset.getCreatedAt()
        );
    }
}
