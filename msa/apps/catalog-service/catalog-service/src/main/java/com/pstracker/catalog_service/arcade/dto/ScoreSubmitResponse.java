package com.pstracker.catalog_service.arcade.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record ScoreSubmitResponse(
        boolean success,
        @JsonProperty("newHighScore") boolean isNewHighScore,
        long rank,
        int score,
        String message
) {
}
