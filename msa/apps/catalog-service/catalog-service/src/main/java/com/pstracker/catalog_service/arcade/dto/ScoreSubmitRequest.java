package com.pstracker.catalog_service.arcade.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreSubmitRequest {

    @NotNull(message = "점수는 필수입니다.")
    @PositiveOrZero(message = "점수는 0점 이상이어야 합니다.")
    private Integer score;

    @NotNull(message = "클리어 시간은 필수입니다.")
    @PositiveOrZero(message = "클리어 시간은 0초 이상이어야 합니다.")
    private Integer clearTimeSec;

    private Integer maxCombo;

    private String trophyGrade;
}
