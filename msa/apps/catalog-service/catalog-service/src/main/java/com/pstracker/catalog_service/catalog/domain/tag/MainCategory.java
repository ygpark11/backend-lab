package com.pstracker.catalog_service.catalog.domain.tag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MainCategory {
    PLAY_STYLE("플레이 스타일"),
    VIBE_STORY("분위기 & 스토리"),
    DIFFICULTY("난이도"),
    ENVIRONMENT("환경 & 가성비");

    private final String description;
}
