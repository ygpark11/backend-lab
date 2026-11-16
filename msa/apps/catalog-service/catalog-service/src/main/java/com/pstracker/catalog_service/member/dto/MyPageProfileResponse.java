package com.pstracker.catalog_service.member.dto;

import java.time.LocalDate;
import java.util.List;

public record MyPageProfileResponse(
        String nickname,
        int level,
        int totalSavedAmount,
        int pioneeredCount,
        LocalDate joinDate,
        List<TrophyDto> trophies
) {
    public record TrophyDto(
            String type,
            String tier,
            boolean unlocked,
            int currentValue
    ) {
    }
}
