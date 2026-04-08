package com.pstracker.catalog_service.catalog.domain.tag;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VibeTag {
    // [전투 액션] 하위
    HIT_FEEL("#타격감원탑", SubCategory.ACTION_COMBAT),
    HACK_SLASH("#무쌍난무", SubCategory.ACTION_COMBAT),
    STEALTH("#암살은신", SubCategory.ACTION_COMBAT),
    SHOOTER("#총격전맛집", SubCategory.ACTION_COMBAT),

    // [탐험 어드벤처] 하위
    OPEN_WORLD("#오픈월드", SubCategory.EXPLORATION),
    COLLECTIBLE("#수집요소", SubCategory.EXPLORATION),
    HIGH_FREEDOM("#자유도최상", SubCategory.EXPLORATION),
    SURVIVAL_CRAFT("#생존과크래프팅", SubCategory.EXPLORATION),

    // [두뇌 퍼즐] 하위
    TURN_BASED("#턴제전투", SubCategory.PUZZLE),
    PUZZLE_SOLVING("#퍼즐해결", SubCategory.PUZZLE),
    STRATEGY("#전략적선택", SubCategory.PUZZLE),

    // [감동 서사] 하위
    TEAR_JERKER("#눈물샘자극", SubCategory.EMOTIONAL_STORY),
    LIKE_A_MOVIE("#한편의영화", SubCategory.EMOTIONAL_STORY),
    CHOICE_MATTERS("#선택과결과", SubCategory.EMOTIONAL_STORY),
    PLOT_TWIST("#충격적반전", SubCategory.EMOTIONAL_STORY),
    DEEP_LORE("#세계관맛집", SubCategory.EMOTIONAL_STORY),

    // [톤앤매너] 하위
    DARK_FANTASY("#다크판타지", SubCategory.VIBE),
    CYBERPUNK("#사이버펑크", SubCategory.VIBE),
    POST_APOCALYPTIC("#포스트아포칼립스", SubCategory.VIBE),
    CHEERFUL("#유쾌발랄", SubCategory.VIBE),
    ANIME_STYLE("#애니메이션풍", SubCategory.VIBE),

    // [공포 스릴러] 하위
    DIAPER_NEEDED("#기저귀필수", SubCategory.HORROR),
    JUMP_SCARE("#갑툭튀주의", SubCategory.HORROR),
    PSYCHOLOGICAL("#심리적압박", SubCategory.HORROR),

    // [매운맛 도전] 하위
    SOULSLIKE("#소울라이크", SubCategory.HARDCORE),
    RAGE_QUIT("#패드부숨주의", SubCategory.HARDCORE),
    PHYSICAL_REQ("#피지컬요구", SubCategory.HARDCORE),

    // [순한맛 힐링] 하위
    NO_BRAINER("#뇌빼고가능", SubCategory.CASUAL),
    NOOB_FRIENDLY("#똥손환영", SubCategory.CASUAL),
    HEALING("#힐링테라피", SubCategory.CASUAL),
    FAMILY_FRIENDLY("#가족과함께", SubCategory.CASUAL),

    // [플레이 타임] 하위
    SHORT_AND_SWEET("#플탐짧고굵음", SubCategory.PLAYTIME),
    TIME_SINK("#시간순삭", SubCategory.PLAYTIME),
    END_GAME_RICH("#엔드콘텐츠빵빵", SubCategory.PLAYTIME),
    REPLAY_VALUE("#다회차필수", SubCategory.PLAYTIME),

    // [멀티 코옵] 하위
    PARTY_GAME("#접대용최고", SubCategory.MULTIPLAYER),
    FRIENDSHIP_RUINER("#우정파괴", SubCategory.MULTIPLAYER),
    WITH_LOVER("#연인과함께", SubCategory.MULTIPLAYER),

    // [PS 기기 특화] 하위
    HAPTIC_FEEDBACK("#패드진동찰짐", SubCategory.HARDWARE),
    EYE_CANDY("#눈호강그래픽", SubCategory.HARDWARE),
    EAR_CANDY("#명품OST", SubCategory.HARDWARE);

    private final String tagName;
    private final SubCategory parent;
}