package com.pstracker.catalog_service.arcade.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum ArcadeGameType {
    FLIGHT("flight", "PS 드래곤 플라이트"),
    SICHUAN("sichuan", "PS 트로피 사천성"),
    REFLEX("reflex", "PS 퀵 리액션 QTE"),
    FORGE("forge", "PS 심볼 포지");

    private final String code;
    private final String title;

    public static ArcadeGameType fromCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("게임 종류를 지정해주세요.");
        }
        return Arrays.stream(values())
                .filter(type -> type.code.equalsIgnoreCase(code.trim()) || type.name().equalsIgnoreCase(code.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 게임 종류입니다: " + code));
    }
}
