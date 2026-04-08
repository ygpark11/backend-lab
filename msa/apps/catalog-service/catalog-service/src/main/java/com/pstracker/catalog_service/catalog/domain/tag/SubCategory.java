package com.pstracker.catalog_service.catalog.domain.tag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SubCategory {
    // 플레이 스타일 하위
    ACTION_COMBAT("전투 액션", MainCategory.ACTION),
    EXPLORATION("탐험 어드벤처", MainCategory.EXPLORATION),
    PUZZLE("두뇌 퍼즐", MainCategory.CHALLENGE),
    EMOTIONAL_STORY("감동 서사", MainCategory.STORY),
    VIBE("톤앤매너", MainCategory.VIBE),
    HORROR("공포 스릴러", MainCategory.CHALLENGE),
    HARDCORE("매운맛 도전", MainCategory.CHALLENGE),
    CASUAL("순한맛 힐링", MainCategory.RELAXATION),
    PLAYTIME("플레이 타임", MainCategory.EXPLORATION),
    MULTIPLAYER("멀티 코옵", MainCategory.SOCIAL),
    HARDWARE("PS 기기 특화", MainCategory.VIBE);

    private final String description;
    private final MainCategory parent;
}
