package com.pstracker.catalog_service.catalog.domain.tag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SubCategory {
    // 플레이 스타일 하위
    ACTION_COMBAT("전투 액션", MainCategory.PLAY_STYLE),
    EXPLORATION("탐험 어드벤처", MainCategory.PLAY_STYLE),
    PUZZLE("두뇌 퍼즐", MainCategory.PLAY_STYLE),

    // 분위기 & 스토리 하위
    EMOTIONAL_STORY("감동 서사", MainCategory.VIBE_STORY),
    VIBE("톤앤매너", MainCategory.VIBE_STORY),
    HORROR("공포 스릴러", MainCategory.VIBE_STORY),

    //️ 난이도 하위
    HARDCORE("매운맛 도전", MainCategory.DIFFICULTY),
    CASUAL("순한맛 힐링", MainCategory.DIFFICULTY),

    //️ 환경 & 가성비 하위
    PLAYTIME("플레이 타임", MainCategory.ENVIRONMENT),
    MULTIPLAYER("멀티 코옵", MainCategory.ENVIRONMENT),
    HARDWARE("PS 기기 특화", MainCategory.ENVIRONMENT);

    private final String description;
    private final MainCategory parent;
}
