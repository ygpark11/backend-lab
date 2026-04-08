package com.pstracker.catalog_service.catalog.domain.tag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MainCategory {
    ACTION("액션", "#F59E0B"),
    EXPLORATION("탐험", "#3B82F6"),
    CHALLENGE("도전", "#EF4444"),
    STORY("스토리", "#A855F7"),
    VIBE("예술/테마", "#06B6D4"),
    RELAXATION("힐링", "#10B981"),
    SOCIAL("소셜", "#EC4899");

    private final String description;
    private final String color;
}
