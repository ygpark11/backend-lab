package com.pstracker.catalog_service.arcade.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Builder;

@Builder
public record ScoreSubmitRequest(
        @NotNull(message = "점수는 필수입니다.")
        @PositiveOrZero(message = "점수는 0점 이상이어야 합니다.")
        Integer score,

        @NotNull(message = "클리어 시간은 필수입니다.")
        @PositiveOrZero(message = "클리어 시간은 0초 이상이어야 합니다.")
        Integer clearTimeSec
) {
}
