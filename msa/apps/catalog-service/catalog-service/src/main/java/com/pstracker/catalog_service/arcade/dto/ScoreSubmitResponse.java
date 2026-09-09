package com.pstracker.catalog_service.arcade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreSubmitResponse {

    private boolean success;
    private boolean isNewHighScore;
    private long rank;
    private int score;
    private String message;
}
