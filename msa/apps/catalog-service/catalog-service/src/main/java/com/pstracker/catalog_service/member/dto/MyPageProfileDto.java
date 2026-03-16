package com.pstracker.catalog_service.member.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
public class MyPageProfileDto {
    private String nickname;
    private int level;
    private int totalSavedAmount;
    private int pioneeredCount;
    private LocalDate joinDate;

    private List<TrophyDto> trophies;

    @Data
    @AllArgsConstructor
    public static class TrophyDto {
        private String type;
        private String tier;
        private boolean unlocked;
        private int currentValue;
    }
}
