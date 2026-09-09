package com.pstracker.catalog_service.arcade.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum TrophyGrade {
    PLATINUM(4, "플래티넘"),
    GOLD(3, "골드"),
    SILVER(2, "실버"),
    BRONZE(1, "브론즈"),
    NONE(0, "없음");

    private final int rank;
    private final String label;

    public static TrophyGrade fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return NONE;
        }
        return Arrays.stream(values())
                .filter(grade -> grade.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(NONE);
    }
}
